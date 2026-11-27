import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

async function adminClients(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) throw new Error("Admin API environment is not configured.");
  const bearer = request.headers.get("authorization") || "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!token) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: "Your session is invalid." }, { status: 401 }) };
  // Admin rights come only from trusted app_metadata, never editable user_metadata or a client profile field.
  if (data.user.app_metadata?.role !== "admin") return { error: NextResponse.json({ error: "Admin access only." }, { status: 403 }) };
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return { db };
}

export async function GET(request: NextRequest) {
  try {
    const result = await adminClients(request);
    if ("error" in result) return result.error;
    const { db } = result;
    const [reports, videos, profiles, live, wallets] = await Promise.all([
      db.from("content_reports").select("id,reason,details,status,created_at,reported_user_id,video_id,reporter_id").order("created_at", { ascending: false }).limit(100),
      db.from("videos").select("id,user_id,caption,video_url,status,visibility,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("profiles").select("id,username,display_name,avatar_url,is_verified,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("live_sessions").select("id,host_id,title,status,started_at").eq("status", "live"),
      db.from("creator_wallets").select("user_id,coin_balance,earned_coins")
    ]);
    const firstError = reports.error || videos.error || profiles.error || live.error || wallets.error;
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });
    return NextResponse.json({
      reports: reports.data, videos: videos.data, users: profiles.data, live: live.data, wallets: wallets.data,
      totals: { reports: reports.data.length, videos: videos.data.length, users: profiles.data.length, live: live.data.length }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Admin request failed." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await adminClients(request);
    if ("error" in result) return result.error;
    const { db } = result;
    const body = await request.json();
    const { action, id, status } = body ?? {};
    if (action === "report" && typeof id === "string" && ["reviewing", "resolved", "dismissed"].includes(status)) {
      const { error } = await db.from("content_reports").update({ status }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    if (action === "video" && typeof id === "string" && ["published", "removed"].includes(status)) {
      const { error } = await db.from("videos").update({ status }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    if (action === "user" && typeof id === "string" && ["ban", "unban"].includes(status)) {
      const { error } = await db.auth.admin.updateUserById(id, { ban_duration: status === "ban" ? "876000h" : "none" });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Admin action failed." }, { status: 500 });
  }
}
