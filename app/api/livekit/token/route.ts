import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let stage = "reading request";
  try {
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return NextResponse.json({ error: "Please log in to join a live room." }, { status: 401 });

    // Keep the server route consistent with lib/supabase.ts, which supports both URL names.
    const supabaseUrl =
      process.env.NEXT_PUBLIC_VILABULB_SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const livekitUrl = process.env.LIVEKIT_URL?.trim();
    const livekitApiKey = process.env.LIVEKIT_API_KEY?.trim();
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET?.trim();

    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL (or NEXT_PUBLIC_VILABULB_SUPABASE_URL)");
    if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!livekitUrl) missing.push("LIVEKIT_URL");
    if (!livekitApiKey) missing.push("LIVEKIT_API_KEY");
    if (!livekitApiSecret) missing.push("LIVEKIT_API_SECRET");
    if (missing.length) {
      console.error("VILABULB live configuration missing:", missing.join(", "));
      return NextResponse.json(
        { error: "Server configuration is missing: " + missing.join(", ") + ". Add the listed variables to the Vercel Production environment, then redeploy." },
        { status: 503 }
      );
    }

    stage = "checking your VILABULB login";
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) return NextResponse.json({ error: "Your login session has expired. Please log in again." }, { status: 401 });

    stage = "checking the live session";
    const body = await request.json();
    const roomName = typeof body.roomName === "string" ? body.roomName : "";
    const requestedRole = body.role;
    if (!/^vilabulb-[0-9a-f-]{36}$/i.test(roomName)) return NextResponse.json({ error: "Invalid live room." }, { status: 400 });
    if (!["host", "guest", "viewer"].includes(requestedRole)) return NextResponse.json({ error: "Choose whether to watch or join the battle." }, { status: 400 });

    const { data: liveRoom, error: roomError } = await supabase.from("live_sessions")
      .select("id,host_id,status").eq("room_name", roomName).eq("status", "live").maybeSingle();
    if (roomError || !liveRoom) return NextResponse.json({ error: "This live room has ended or does not exist." }, { status: 404 });

    const isHost = liveRoom.host_id === authData.user.id;
    if ((requestedRole === "host") !== isHost) return NextResponse.json({ error: "Only the host can connect as host." }, { status: 403 });
    if (requestedRole === "guest" && isHost) return NextResponse.json({ error: "The host is already on stage." }, { status: 400 });

    stage = "connecting to LiveKit room service";
    const httpUrl = livekitUrl!.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
    const roomService = new RoomServiceClient(httpUrl, livekitApiKey!, livekitApiSecret!);
    let participants: any[] = [];
    try { participants = await roomService.listParticipants(roomName); }
    catch {
      if (!isHost) return NextResponse.json({ error: "The host has not started the live stage yet. Please try again." }, { status: 409 });
      await roomService.createRoom({ name: roomName });
    }

    stage = "preparing your livestream access token";
    const identity = authData.user.id;
    const existing = participants.find((participant: any) => participant.identity === identity);
    if (requestedRole === "guest") {
      const activeStage = participants.filter((participant: any) => {
        try { const metadata = JSON.parse(participant.metadata || "{}"); return metadata.role === "host" || metadata.role === "guest"; }
        catch { return false; }
      });
      if (!existing && activeStage.length >= 4) return NextResponse.json({ error: "This battle already has 4 people on stage. You can still watch the LIVE." }, { status: 409 });
    }

    const { data: profile } = await supabase.from("profiles").select("username,display_name").eq("id", identity).maybeSingle();
    const participantName = profile?.username || profile?.display_name || "VILABULB creator";
    const role = isHost ? "host" : requestedRole;
    const token = new AccessToken(livekitApiKey!, livekitApiSecret!, {
      identity, name: participantName, metadata: JSON.stringify({ role }), ttl: "4h"
    });
    token.addGrant({
      roomJoin: true, room: roomName,
      canPublish: role === "host" || role === "guest",
      canSubscribe: true, canPublishData: true
    });

    const serverUrl = /^wss?:\/\//i.test(livekitUrl!) ? livekitUrl! : `wss://${livekitUrl!.replace(/^https?:\/\//i, "")}`;
    return NextResponse.json({ token: await token.toJwt(), serverUrl, role });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown server error";
    console.error("LiveKit token error at stage:", stage, error);
    return NextResponse.json(
      { error: "Live connection failed while " + stage + ". " + detail.slice(0, 220) },
      { status: 500 }
    );
  }
}
