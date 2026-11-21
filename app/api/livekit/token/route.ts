import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return NextResponse.json({ error: "Please log in to join a live room." }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const livekitUrl = process.env.LIVEKIT_URL;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
    if (!supabaseUrl || !supabaseAnonKey || !livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return NextResponse.json({ error: "LiveKit is not configured yet. Add the LiveKit environment variables in Netlify." }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) return NextResponse.json({ error: "Your login session has expired. Please log in again." }, { status: 401 });

    const body = await request.json();
    const roomName = typeof body.roomName === "string" ? body.roomName : "";
    if (!/^vilabulb-[0-9a-f-]{36}$/i.test(roomName)) return NextResponse.json({ error: "Invalid live room." }, { status: 400 });

    const { data: liveRoom, error: roomError } = await supabase
      .from("live_sessions")
      .select("id,host_id,status")
      .eq("room_name", roomName)
      .eq("status", "live")
      .maybeSingle();
    if (roomError || !liveRoom) return NextResponse.json({ error: "This live room has ended or does not exist." }, { status: 404 });

    const isHost = liveRoom.host_id === authData.user.id;
    const { data: profile } = await supabase.from("profiles").select("username,display_name").eq("id", authData.user.id).maybeSingle();
    const identity = authData.user.id;
    const participantName = profile?.username || profile?.display_name || "VILABULB creator";
    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity,
      name: participantName,
      ttl: "15m"
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true
    });

    return NextResponse.json({ token: await token.toJwt(), serverUrl: livekitUrl, isHost });
  } catch {
    return NextResponse.json({ error: "Could not prepare your live connection. Please try again." }, { status: 500 });
  }
}
