"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

type LiveRoomProps = {
  roomName: string;
  isHost: boolean;
  onLeave: () => void;
};

export default function LiveRoom({ roomName, isHost, onLeave }: LiveRoomProps) {
  const [credentials, setCredentials] = useState<{ token: string; serverUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const connect = async () => {
      try {
        const { data } = await (await import("../lib/supabase")).supabase!.auth.getSession();
        const sessionToken = data.session?.access_token;
        if (!sessionToken) throw new Error("Please log in again to join this live room.");
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
          body: JSON.stringify({ roomName })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to join this live room.");
        if (active) setCredentials({ token: result.token, serverUrl: result.serverUrl });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Live connection failed.");
      } finally {
        if (active) setLoading(false);
      }
    };
    connect();
    return () => { active = false; };
  }, [roomName]);

  return (
    <div className="live-room-overlay">
      <div className="live-room-header">
        <div><span className="live-badge">● LIVE</span><strong>{isHost ? "You are hosting" : "Watching live"}</strong></div>
        <button type="button" onClick={onLeave}>Leave live</button>
      </div>
      {loading && <div className="live-room-message">Connecting to VILABULB LIVE…</div>}
      {error && <div className="live-room-message live-room-error">{error}</div>}
      {credentials && !error && (
        <LiveKitRoom
          token={credentials.token}
          serverUrl={credentials.serverUrl}
          connect={true}
          video={isHost}
          audio={isHost}
          onError={(err) => setError(err.message || "Live connection failed.")}
          onDisconnected={onLeave}
          data-lk-theme="default"
          className="livekit-stage"
        >
          <VideoConference />
        </LiveKitRoom>
      )}
    </div>
  );
}
