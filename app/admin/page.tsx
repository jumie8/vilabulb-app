"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type DashboardData = {
  reports: any[]; videos: any[]; users: any[]; live: any[]; totals: { reports: number; videos: number; users: number; live: number };
};

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [section, setSection] = useState("reports");
  const [notice, setNotice] = useState("Loading admin dashboard…");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: sessionData } = await supabase!.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setNotice("Please log in with your administrator account."); return; }
    const response = await fetch("/api/admin", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) { setNotice(result.error || "Unable to load dashboard."); return; }
    setData(result); setNotice("");
  }

  async function act(action: string, id: string, status: string) {
    const { data: sessionData } = await supabase!.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return setNotice("Your session expired. Please log in again.");
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, id, status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed.");
      await load(); setNotice("Change saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Action failed."); }
    finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, []);

  return <main style={{ minHeight: "100vh", background: "#0b0715", color: "#fff", padding: "24px", fontFamily: "Arial,sans-serif" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <a href="/" style={{ color: "#ed4bd7", textDecoration: "none" }}>← Back to VILABULB</a>
      <h1 style={{ fontSize: 32, marginBottom: 4 }}>VILABULB Admin</h1>
      <p style={{ color: "#aaa" }}>Review reports, moderate videos and manage accounts.</p>
      {data && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, margin: "24px 0" }}>
        {Object.entries(data.totals).map(([key,value])=><div key={key} style={{ background:"#1b1230", border:"1px solid #56336c", borderRadius:14, padding:16 }}><div style={{ color:"#c9a4df", textTransform:"capitalize" }}>{key}</div><strong style={{ fontSize:28 }}>{value}</strong></div>)}
      </div>}
      <nav style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:18 }}>
        {["reports","videos","users","live"].map(key=><button key={key} onClick={()=>setSection(key)} style={{ border:0, borderRadius:10, padding:"10px 16px", color:"#fff", background:section===key?"#bd32bf":"#281a3b", textTransform:"capitalize" }}>{key}</button>)}
        <button onClick={()=>void load()} style={{ marginLeft:"auto", border:0, borderRadius:10, padding:"10px 16px" }}>Refresh</button>
      </nav>
      {notice && <p role="status" style={{ color:"#f2c7ff" }}>{notice}</p>}
      {busy && <p>Saving…</p>}
      <section style={{ display:"grid", gap:12 }}>
        {section==="reports" && data?.reports.map(item=><article key={item.id} style={card}><strong>{item.reason}</strong><p>{item.details || "No extra details"}</p><small>{item.status} · {new Date(item.created_at).toLocaleString()}</small><div style={actions}><button disabled={busy} onClick={()=>void act("report",item.id,"reviewing")}>Review</button><button disabled={busy} onClick={()=>void act("report",item.id,"resolved")}>Resolve</button><button disabled={busy} onClick={()=>void act("report",item.id,"dismissed")}>Dismiss</button></div></article>)}
        {section==="videos" && data?.videos.map(item=><article key={item.id} style={card}><strong>{item.caption || "Untitled video"}</strong><p><a href={item.video_url} target="_blank" rel="noreferrer" style={{color:"#e9a8ff"}}>Open video</a></p><small>{item.status} · {new Date(item.created_at).toLocaleString()}</small><div style={actions}><button disabled={busy} onClick={()=>void act("video",item.id,"published")}>Publish</button><button disabled={busy} onClick={()=>void act("video",item.id,"removed")}>Remove</button></div></article>)}
        {section==="users" && data?.users.map(item=><article key={item.id} style={card}><strong>@{item.username || item.display_name || "user"}</strong><p>{item.id}</p><small>Verified: {item.is_verified ? "Yes" : "No"}</small><div style={actions}><button disabled={busy} onClick={()=>void act("user",item.id,"ban")}>Suspend account</button><button disabled={busy} onClick={()=>void act("user",item.id,"unban")}>Restore account</button></div></article>)}
        {section==="live" && data?.live.map(item=><article key={item.id} style={card}><strong>{item.title}</strong><p>Host: {item.host_id}</p><small>Started {new Date(item.started_at).toLocaleString()}</small></article>)}
        {data && (data[section as keyof DashboardData] as any[])?.length===0 && <p style={{color:"#aaa"}}>Nothing to show here yet.</p>}
      </section>
    </div>
  </main>;
}

const card: React.CSSProperties = { background:"#171020", border:"1px solid #49315d", borderRadius:14, padding:16 };
const actions: React.CSSProperties = { display:"flex", flexWrap:"wrap", gap:8, marginTop:12 };
