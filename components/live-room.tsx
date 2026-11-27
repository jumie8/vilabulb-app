"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

type LiveRoomProps = { roomName: string; isHost: boolean; isGuest?: boolean; liveSessionId: string; creatorId: string; onLeave: () => void };
const LIVE_GIFTS = [{code:"heart",name:"Heart",emoji:"🥰",coins:5},{code:"rose",name:"Rose",emoji:"🌹",coins:10},{code:"star",name:"Star",emoji:"⭐",coins:50},{code:"diamond",name:"Diamond",emoji:"💎",coins:100}];

export default function LiveRoom({ roomName, isHost, isGuest = false, liveSessionId, creatorId, onLeave }: LiveRoomProps) {
  const [giftTrayOpen,setGiftTrayOpen]=useState(false); const [selectedGift,setSelectedGift]=useState("heart"); const [giftBusy,setGiftBusy]=useState(false); const [giftNotice,setGiftNotice]=useState(""); const [coinBalance,setCoinBalance]=useState(0);
  useEffect(()=>{if(!supabase)return;supabase.auth.getUser().then(({data})=>{if(data.user)supabase.from("creator_wallets").select("coin_balance").eq("user_id",data.user.id).maybeSingle().then(({data:wallet})=>setCoinBalance(wallet?.coin_balance??0));});},[]);
  const sendLiveGift=async()=>{if(!supabase)return;setGiftBusy(true);setGiftNotice("");const {data,error}=await supabase.rpc("send_live_gift",{p_creator_id:creatorId,p_live_session_id:liveSessionId,p_gift_code:selectedGift});if(error)setGiftNotice(error.message);else{const cost=data?.coin_cost??LIVE_GIFTS.find(g=>g.code===selectedGift)?.coins??0;setCoinBalance(v=>Math.max(0,v-cost));setGiftNotice("Gift sent successfully!");}setGiftBusy(false);};
  const [credentials, setCredentials] = useState<{ token: string; serverUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setCredentials(null);
    const connect = async () => {
      try {
        const { data } = await (await import("../lib/supabase")).supabase!.auth.getSession();
        const sessionToken = data.session?.access_token;
        if (!sessionToken) throw new Error("Please log in again to join this live room.");
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
          body: JSON.stringify({ roomName, role: isHost ? "host" : isGuest ? "guest" : "viewer" })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to join this live room.");
        if (active) setCredentials({ token: result.token, serverUrl: result.serverUrl });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Live connection failed.");
      } finally { if (active) setLoading(false); }
    };
    connect();
    return () => { active = false; };
  }, [roomName, isHost, isGuest, retryCount]);

  return (
    <div className="live-room-overlay">
      <div className="live-room-header">
        <div><span className="live-badge">● LIVE</span><strong>{isHost ? "You are hosting" : isGuest ? "You joined the battle" : "Watching live"}</strong></div>
        <button type="button" onClick={onLeave}>Leave live</button>
      </div>
      {loading && <div className="live-room-message">Connecting to VILABULB LIVE…</div>}
      {error && <div className="live-room-message live-room-error">{error}<button type="button" onClick={() => setRetryCount(value => value + 1)}>Reconnect</button></div>}
      {credentials && !error && (
        <LiveKitRoom token={credentials.token} serverUrl={credentials.serverUrl} connect={true}
          video={isHost || isGuest} audio={isHost || isGuest}
          onError={(err) => setError(err.message || "Live connection failed.")}
          onDisconnected={() => setError("Your live connection was interrupted. Check your internet connection and tap Reconnect.")}
          data-lk-theme="default" className="livekit-stage">
          <VideoConference />
        </LiveKitRoom>
      )}
      <button type="button" className="live-gift-fab" onClick={()=>setGiftTrayOpen(v=>!v)}>🎁 <span>Gifts</span></button>
      {giftTrayOpen && <div className="live-gift-drawer"><div className="live-gift-reward"><span className="live-gift-avatar">V</span><div><strong>Send a Gift to support this LIVE</strong><small>Gifts help reward your favourite creators</small></div><button type="button" onClick={()=>setGiftTrayOpen(false)}>×</button></div><div className="live-gift-heading"><strong>Frequently used</strong><button type="button" onClick={()=>setGiftNotice("Your frequently used gifts are shown here.")}>Edit</button></div><div className="live-gift-grid">{LIVE_GIFTS.map(g=><button type="button" key={g.code} className={selectedGift===g.code?"live-gift-item selected":"live-gift-item"} onClick={()=>setSelectedGift(g.code)}><span className="live-gift-emoji">{g.emoji}</span><b>{g.name}</b><small>🪙 {g.coins}</small></button>)}</div><div className="live-gift-footer"><span>Balance: <b>{coinBalance.toLocaleString()} coins</b></span><button type="button" disabled={giftBusy} onClick={sendLiveGift}>{giftBusy?"Sending…":"Send gift"}</button></div>{giftNotice&&<p className="live-gift-notice" role="status">{giftNotice}</p>}</div>}
    </div>
  );
}
