"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { Home, Compass, Users, Plus, MessageCircle, UserRound, Search, Heart, MessageSquare, Bookmark, Share2, Music2, Volume2, VolumeX, Flame, X, Play } from "lucide-react";

function withAuthTimeout<T>(request: Promise<T>, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("The connection is taking too long. Please check your internet connection and try again. If you already received a confirmation email, do not sign up again—check your inbox and log in."));
    }, timeoutMs);
    request.then(
      (result) => { window.clearTimeout(timer); resolve(result); },
      (error) => { window.clearTimeout(timer); reject(error); }
    );
  });
}

const sampleVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const videos = [
  { user: "amara.creates", caption: "Little moments, big memories ✨ What made you smile today?", sound: "Original sound · Amara", tag: "#goodvibes", url: sampleVideo },
  { user: "the_daily.joy", caption: "A little reminder to enjoy the journey 🌿", sound: "Soft days · instrumental", tag: "#lifestyle", url: sampleVideo },
  { user: "travelwithtomi", caption: "POV: you finally take that trip 🌍", sound: "Around the world · audio", tag: "#travel", url: sampleVideo }
];

export default function HomePage() {
  const [active, setActive] = useState(0);
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [databaseVideos, setDatabaseVideos] = useState<any[]>([]);
  const [feedNotice, setFeedNotice] = useState("");
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedMode, setFeedMode] = useState<"for-you" | "following">("for-you");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentItems, setCommentItems] = useState<Record<number, string[]>>({});
  const [activeView, setActiveView] = useState<"home"|"discover"|"inbox"|"profile">("home");
  const [creatorProfiles, setCreatorProfiles] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [myUploads, setMyUploads] = useState<any[]>([]);
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setCurrentUser(data.session?.user.email ?? null); setCurrentUserId(data.session?.user.id ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user.email ?? null); setCurrentUserId(session?.user.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setAuthMessage("Supabase is not configured yet. Add the two environment variables in Netlify.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      if (authMode === "signup") {
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        const { data, error } = await withAuthTimeout(supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: "https://vilabulb.netlify.app",
            data: {
              username: cleanUsername || null,
              display_name: username.trim() || email.trim().split("@")[0]
            }
          }
        }));
        if (error) throw error;
        if (data.user && data.user.identities?.length === 0) {
          setAuthMode("login");
          setAuthMessage("An account with this email already exists. If you have not confirmed it yet, check your inbox and spam folder for the VILABULB confirmation email. Then log in.");
          return;
        }
        if (data.session) {
          setAuthMessage("Your VILABULB account is ready! You are signed in.");
          setAuthOpen(false);
        } else {
          setOtpMode(true);
          setAuthMessage(`We sent a 6-digit verification code to ${email.trim()}. Enter the code from your email below to finish creating your account.`);
        }
      } else {
        const { error } = await withAuthTimeout(supabase.auth.signInWithPassword({ email, password }));
        if (error) throw error;
        setAuthOpen(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      if (/rate limit|security purposes|after \d+ seconds|email rate/i.test(message)) {
        setAuthMessage("Supabase recently sent a confirmation email, so another signup email is temporarily blocked. Do not keep pressing Create account. Check your inbox and spam folder for the VILABULB confirmation email, then log in after confirming.");
      } else if (/already registered|already been registered|user already/i.test(message)) {
        setAuthMessage("An account with this email may already exist. Choose Log in instead.");
      } else {
        setAuthMessage(message);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const { data, error } = await withAuthTimeout(supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: "email"
      }));
      if (error) throw error;
      if (data.session) {
        setCurrentUser(data.user?.email ?? email);
        setAuthOpen(false);
        setOtpMode(false);
        setOtp("");
      } else {
        setAuthMessage("The code was accepted, but no session was returned. Please log in.");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "That code could not be verified. Check it and try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setAuthMessage("Supabase is not configured. Please try again after the site settings are ready.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: "https://vilabulb.netlify.app" }
      });
      if (error) throw error;
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Google sign-in could not start. Please try again.");
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCurrentUser(null);
  };
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const loadFeed = async () => {
      const { data, error } = await supabase.from("videos").select("id,user_id,caption,video_url,created_at,profiles!videos_user_id_fkey(username,display_name)").eq("status","published").eq("visibility","public").order("created_at",{ascending:false}).limit(30);
      if (!alive) return;
      if (error) { setFeedNotice("Could not load community videos yet."); return; }
      const mapped = (data ?? []).map((item: any) => ({ id:item.id, userId:item.user_id, user:item.profiles?.username || item.profiles?.display_name || "creator", caption:item.caption || "", sound:"Original sound", tag:"#vilabulb", url:item.video_url }));
      setDatabaseVideos(mapped);
    };
    loadFeed();
    return () => { alive = false; };
  }, [currentUserId]);

  useEffect(() => {
    if (!supabase || !currentUserId) { setFollowing([]); setLiked([]); setSaved([]); return; }
    let alive = true;
    const loadMyActivity = async () => {
      const [{ data: followed }, { data: likes }, { data: saves }] = await Promise.all([
        supabase.from("follows").select("profiles!follows_following_id_fkey(username,display_name)").eq("follower_id",currentUserId).eq("status","accepted"),
        supabase.from("video_likes").select("video_id").eq("user_id",currentUserId),
        supabase.from("video_saves").select("video_id").eq("user_id",currentUserId)
      ]);
      if (!alive) return;
      setFollowing((followed ?? []).map((row:any) => row.profiles?.username || row.profiles?.display_name).filter(Boolean));
      const likeIds = new Set((likes ?? []).map((row:any) => row.video_id));
      const saveIds = new Set((saves ?? []).map((row:any) => row.video_id));
      setLiked(databaseVideos.map((row:any,index:number) => likeIds.has(row.id) ? index : -1).filter((index:number) => index >= 0));
      setSaved(databaseVideos.map((row:any,index:number) => saveIds.has(row.id) ? index : -1).filter((index:number) => index >= 0));
    };
    loadMyActivity();
    return () => { alive = false; };
  }, [currentUserId, databaseVideos]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.from("profiles").select("id,username,display_name,bio,avatar_url").order("created_at",{ascending:false}).limit(50)
      .then(({data}) => { if (alive) setCreatorProfiles(data ?? []); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!supabase || !currentUserId) { setMyProfile(null); setMyUploads([]); setInboxCount(0); return; }
    let alive = true;
    Promise.all([
      supabase.from("profiles").select("id,username,display_name,bio,avatar_url,website").eq("id",currentUserId).maybeSingle(),
      supabase.from("videos").select("id,caption,video_url,created_at").eq("user_id",currentUserId).neq("status","removed").order("created_at",{ascending:false}).limit(30),
      supabase.from("conversation_participants").select("conversation_id").eq("user_id",currentUserId)
    ]).then(([profile,uploads,conversations]) => {
      if (!alive) return;
      setMyProfile(profile.data ?? null); setMyUploads(uploads.data ?? []); setInboxCount(conversations.data?.length ?? 0);
    });
    return () => { alive = false; };
  }, [currentUserId, databaseVideos]);
  const touchStart = useRef<number | null>(null);
  // Show only real community uploads. Demo clips have no database IDs, so likes/follows/comments cannot sync for them.
  const sourceVideos = databaseVideos;
  const visibleVideos = sourceVideos.filter(item => {
    const matchesSearch = `${item.user} ${item.caption} ${item.tag} ${item.sound}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFeed = feedMode === "for-you" || following.includes(item.user);
    return matchesSearch && matchesFeed;
  });
  const safeActive = visibleVideos.length ? active % visibleVideos.length : 0;
  const video = visibleVideos[safeActive];
  const toggleLike = async () => {
    if (!currentUserId) { setAuthMode("login"); setAuthMessage("Log in to like videos."); setAuthOpen(true); return; }
    const target = video as any;
    if (!target?.id || !supabase) { setLiked(v => v.includes(safeActive) ? v.filter(i => i !== safeActive) : [...v, safeActive]); return; }
    const { data: existing } = await supabase.from("video_likes").select("video_id").eq("video_id",target.id).eq("user_id",currentUserId).maybeSingle();
    if (existing) { const { error } = await supabase.from("video_likes").delete().eq("video_id",target.id).eq("user_id",currentUserId); if (!error) setLiked(v => v.filter(i => i !== safeActive)); }
    else { const { error } = await supabase.from("video_likes").insert({video_id:target.id,user_id:currentUserId}); if (!error) setLiked(v => [...v,safeActive]); }
  };
  const toggleSave = async () => {
    if (!currentUserId) { setAuthMode("login"); setAuthMessage("Log in to save videos."); setAuthOpen(true); return; }
    const target = video as any;
    if (!target?.id || !supabase) { setSaved(v => v.includes(safeActive) ? v.filter(i => i !== safeActive) : [...v, safeActive]); return; }
    const { data: existing } = await supabase.from("video_saves").select("video_id").eq("video_id",target.id).eq("user_id",currentUserId).maybeSingle();
    if (existing) { const { error } = await supabase.from("video_saves").delete().eq("video_id",target.id).eq("user_id",currentUserId); if (!error) setSaved(v => v.filter(i => i !== safeActive)); }
    else { const { error } = await supabase.from("video_saves").insert({video_id:target.id,user_id:currentUserId}); if (!error) setSaved(v => [...v,safeActive]); }
  };
  const toggleFollow = async () => {
    if (!currentUserId) { setAuthMode("login"); setAuthMessage("Log in to follow creators."); setAuthOpen(true); return; }
    const target = video as any;
    if (!target?.userId || !supabase || target.userId === currentUserId) return;
    const { data: existing } = await supabase.from("follows").select("follower_id").eq("follower_id",currentUserId).eq("following_id",target.userId).maybeSingle();
    if (existing) { const { error } = await supabase.from("follows").delete().eq("follower_id",currentUserId).eq("following_id",target.userId); if (!error) setFollowing(v => v.filter(x => x !== video.user)); }
    else { const { error } = await supabase.from("follows").insert({follower_id:currentUserId,following_id:target.userId,status:"accepted"}); if (!error) setFollowing(v => [...v,video.user]); }
  };
  const next = () => { if (visibleVideos.length) setActive(v => (v + 1) % visibleVideos.length); setVideoError(false); };
  const previous = () => { if (visibleVideos.length) setActive(v => (v - 1 + visibleVideos.length) % visibleVideos.length); setVideoError(false); };
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => { touchStart.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStart.current === null) return;
    const delta = touchStart.current - e.changedTouches[0].clientY;
    if (delta > 45) next();
    if (delta < -45) previous();
    touchStart.current = null;
  };

  return <main className="shell">
    <aside className="sidebar">
      <a className="brand" href="#top"><span className="brand-mark">V</span><span>VILA<span className="brand-light">BULB</span></span></a>
      <nav className="side-links">
        <button className={activeView === "home" ? "side-link selected" : "side-link"} onClick={() => setActiveView("home")}><Home/><span>For You</span></button>
        <button className={activeView === "discover" ? "side-link selected" : "side-link"} onClick={() => setActiveView("discover")}><Compass/><span>Discover</span></button>
        <button className="side-link" onClick={() => { setActiveView("home"); setFeedMode("following"); setActive(0); }}><Users/><span>Following</span></button>
        <button className={activeView === "inbox" ? "side-link selected" : "side-link"} onClick={() => setActiveView("inbox")}><MessageCircle/><span>Inbox</span></button>
        <button className={activeView === "profile" ? "side-link selected" : "side-link"} onClick={() => setActiveView("profile")}><UserRound/><span>Profile</span></button>
      </nav>
      <button className="create-button" onClick={() => setUploadOpen(true)}><Plus size={19}/> Create video</button>
      <div className="sidebar-note"><span className="live-dot"/> Your space to shine.<br/><small>Watch. Create. Connect.</small></div>
      <div className="side-footer">About · Community · Guidelines<br/>© 2026 VILABULB</div>
    </aside>
    <section className="main-area" id="top">
      <header className="topbar">
        <div className="mobile-brand"><span className="brand-mark">V</span> VILABULB</div>
        <div className="search-wrap"><Search size={18}/><input aria-label="Search videos, creators and sounds" placeholder="Search videos, creators and sounds" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setActive(0); }}/></div><button type="button" className="top-create-button" onClick={() => setUploadOpen(true)}><Plus size={16}/> Create</button>
        <button className="login-button" onClick={() => { setAuthMode("login"); setAuthMessage(""); setAuthOpen(true); }}>{currentUser ? "Account" : "Log in"}</button>{currentUser ? <button className="signup-button" onClick={handleLogout}>Log out</button> : <button className="signup-button" onClick={() => { setAuthMode("signup"); setAuthMessage(""); setAuthOpen(true); }}>Sign up</button>}
      </header>
      {activeView === "home" && <><div className="feed-heading"><div><span className="eyebrow"><Flame size={14}/> YOUR DAILY SPARK</span><h1>{feedMode === "following" ? "Following" : "For You"}</h1><p>Fresh videos picked to brighten your scroll.</p></div><div className="feed-tabs"><button className={feedMode === "for-you" ? "tab active" : "tab"} onClick={() => { setFeedMode("for-you"); setActive(0); }}>For You</button><button className={feedMode === "following" ? "tab active" : "tab"} onClick={() => { setFeedMode("following"); setActive(0); }}>Following</button></div></div>
      {feedNotice && <p className="feed-notice" role="status">{feedNotice}</p>}<div className="feed-layout" id="feed">
        <div className="video-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {!video ? <div className="video-fallback"><Search size={38}/><strong>{feedMode === "following" ? "No followed creators yet" : searchQuery ? "No matching videos" : "No community videos yet"}</strong><span>{feedMode === "following" ? "Follow creators after real videos appear in the feed." : searchQuery ? "Try another search." : "Be the first creator to upload a video to VILABULB."}</span><button onClick={() => { if (searchQuery) { setSearchQuery(""); setFeedMode("for-you"); } else { setUploadOpen(true); } }}>{searchQuery ? "Explore videos" : "Upload your first video"}</button></div> : !videoError ? <video key={video.url + active} className="video" src={video.url} autoPlay muted={!soundOn} loop playsInline controls={false} preload="auto" onError={() => setVideoError(true)} /> : <div className="video-fallback"><Play size={42}/><strong>Video preview couldn't load</strong><span>Check your connection and try the next clip.</span><button onClick={() => { setVideoError(false); }}>Try again</button></div>}
          <div className="video-shade"/>
          <div className="video-top"><span className="quality-pill"><span/> VILA PICKS</span><button className="sound-button" aria-label={soundOn ? "Mute video" : "Turn sound on"} onClick={() => setSoundOn(v => !v)}>{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button></div>
          {visibleVideos.length > 0 && <div className="video-copy">
            <div className="creator-row"><div className="avatar">{video.user[0].toUpperCase()}</div><strong>@{video.user}</strong><button className={following.includes(video.user) ? "follow following" : "follow"} onClick={toggleFollow}>{following.includes(video.user) ? "Following" : "Follow"}</button></div>
            <p>{video.caption}</p><p className="video-tags">{video.tag} <span>#vilabulb</span></p>
            <div className="sound-line"><Music2 size={15}/><span>{video.sound}</span></div>
          </div>}
          {visibleVideos.length > 0 && <div className="video-actions">
            <button onClick={toggleLike} className={liked.includes(active) ? "action liked" : "action"}><span><Heart fill={liked.includes(active) ? "currentColor" : "none"}/></span><b>{liked.includes(active) ? "1.3K" : "1.2K"}</b></button>
            <button className="action" onClick={() => setCommentsOpen(true)}><span><MessageSquare/></span><b>{commentItems[safeActive]?.length ?? 0} comments</b></button>
            <button onClick={toggleSave} className={saved.includes(active) ? "action liked" : "action"}><span><Bookmark fill={saved.includes(active) ? "currentColor" : "none"}/></span><b>{saved.includes(active) ? "Saved" : "Save"}</b></button>
            <button className="action" onClick={() => { if (navigator.share) navigator.share({ title: "VILABULB", text: video.caption, url: window.location.href }).catch(() => {}); else navigator.clipboard?.writeText(window.location.href); }}><span><Share2/></span><b>Share</b></button>
          </div>}
        </div>
        <div className="feed-controls"><button onClick={previous} aria-label="Previous video">↑</button><button onClick={next} aria-label="Next video">↓</button></div>
        <aside className="right-rail">
          <div className="rail-card welcome-card"><span className="spark">✦</span><h3>Your world.<br/>Your spotlight.</h3><p>Every creator has a story. This is where yours gets seen.</p><button onClick={() => setUploadOpen(true)}>Start creating <Plus size={15}/></button></div>
          <div className="rail-card trend-card"><div className="rail-title">Trending tags <button type="button" onClick={() => setActiveView("discover")}>See all</button></div>{["#NaijaCreators","#DailyLifestyle","#FoodTok","#GetInspired"].map((tag,i)=><button type="button" className="trend trend-button" key={tag} onClick={() => { setSearchQuery(tag); setFeedMode("for-you"); setActive(0); setActiveView("home"); }}><span className="trend-number">0{i+1}</span><div><b>{tag}</b><small>{["12.8K","9.4K","7.2K","5.6K"][i]} videos</small></div><span className="trend-arrow">↗</span></button>)}</div>
          <div className="rail-quote">“Create what you wish existed.”<span>THE VILABULB SPIRIT</span></div>
        </aside>
      </div></>}
      {activeView === "discover" && <section className="app-panel"><h1>Discover creators</h1><p>Find people in the VILABULB community.</p><div className="creator-grid">{creatorProfiles.filter(p => p.id !== currentUserId).map(p => <article className="creator-card" key={p.id}><div className="avatar">{(p.username || p.display_name || "C")[0].toUpperCase()}</div><strong>@{p.username || p.display_name || "creator"}</strong><p>{p.bio || "VILABULB creator"}</p><button className="follow" onClick={async () => { if (!currentUserId) { setAuthMode("login"); setAuthOpen(true); setAuthMessage("Log in to follow creators."); return; } const { data: existing } = await supabase!.from("follows").select("follower_id").eq("follower_id",currentUserId).eq("following_id",p.id).maybeSingle(); if (existing) { await supabase!.from("follows").delete().eq("follower_id",currentUserId).eq("following_id",p.id); setFollowing(v => v.filter(x => x !== (p.username || p.display_name))); } else { const { error } = await supabase!.from("follows").insert({follower_id:currentUserId,following_id:p.id,status:"accepted"}); if (!error) setFollowing(v => [...v,p.username || p.display_name]); else setFeedNotice(error.message); } }}>{following.includes(p.username || p.display_name) ? "Following" : "Follow"}</button></article>)}</div>{creatorProfiles.filter(p => p.id !== currentUserId).length === 0 && <p className="empty-panel">No other creators have joined yet. Invite friends to VILABULB.</p>}</section>}
      {activeView === "inbox" && <section className="app-panel"><h1>Inbox</h1><p>Your private conversations appear here.</p>{!currentUserId ? <button className="signup-button" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>Log in to view messages</button> : <div className="empty-panel"><MessageCircle size={32}/><strong>{inboxCount ? "You have conversations" : "No messages yet"}</strong><span>{inboxCount ? "Conversation records found. Messaging threads are not yet available in this screen." : "When conversations are started, they will appear here."}</span></div>}</section>}
      {activeView === "profile" && <section className="app-panel"><h1>Your profile</h1>{!currentUserId ? <button className="signup-button" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>Log in to view profile</button> : <><div className="profile-summary"><div className="avatar profile-avatar">{(myProfile?.username || currentUser?.split("@")[0] || "V")[0].toUpperCase()}</div><div><strong>@{myProfile?.username || currentUser?.split("@")[0]}</strong><p>{myProfile?.bio || "Welcome to your VILABULB creator profile."}</p><small>{currentUser}</small></div></div><h2>Your videos ({myUploads.length})</h2><div className="creator-grid">{myUploads.map(item => <article className="creator-card" key={item.id}><video src={item.video_url} controls playsInline className="profile-video"/><p>{item.caption || "Untitled video"}</p></article>)}</div>{!myUploads.length && <p className="empty-panel">You haven't uploaded any videos yet. Tap Create to share your first video.</p>}</>}</section>}
    </section>
    <nav className="mobile-nav"><button className={activeView === "home" ? "active" : ""} onClick={() => setActiveView("home")}><Home/><span>Home</span></button><button className={activeView === "discover" ? "active" : ""} onClick={() => setActiveView("discover")}><Compass/><span>Discover</span></button><button type="button" aria-label="Create video" onClick={() => setUploadOpen(true)}><Plus/></button><button className={activeView === "inbox" ? "active" : ""} onClick={() => setActiveView("inbox")}><MessageCircle/><span>Inbox</span></button><button className={activeView === "profile" ? "active" : ""} onClick={() => setActiveView("profile")}><UserRound/><span>Profile</span></button></nav>
    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><div className="upload-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setAuthOpen(false)}><X/></button><div className="upload-icon"><UserRound/></div><h2>{authMode === "signup" ? "Join VILABULB" : "Welcome back"}</h2><p>{authMode === "signup" ? "Create your creator account." : "Log in to your account."}</p>{otpMode ? <><form onSubmit={handleVerifyOtp} className="auth-form"><input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="Enter 6-digit email code" minLength={6} maxLength={6} required/><button className="signup-button wide" type="submit" disabled={authBusy || otp.length !== 6}>{authBusy ? "Verifying..." : "Verify code and create account"}</button></form><p className="auth-hint">Check your inbox and spam folder. Keep this screen open while you enter the code.</p></> : <><form onSubmit={handleAuth} className="auth-form">{authMode === "signup" && <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" autoComplete="username" required/>}<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" required/><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (at least 6 characters)" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={6} required/><button className="signup-button wide" type="submit" disabled={authBusy}>{authBusy ? "Please wait..." : authMode === "signup" ? "Create account" : "Log in"}</button></form><div className="auth-divider"><span>or</span></div><button type="button" className="google-signin" onClick={handleGoogleSignIn} disabled={authBusy}><span className="google-g">G</span> Continue with Google</button></>}{authMessage && <p role="status">{authMessage}</p>}<p><button className="text-switch" onClick={() => { setOtpMode(false); setOtp(""); setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthMessage(""); }}>{otpMode ? "Back to sign up" : authMode === "signup" ? "Already have an account? Log in" : "New to VILABULB? Sign up"}</button></p></div></div>}
    {uploadOpen && <div className="modal-backdrop upload-backdrop" role="dialog" aria-modal="true" aria-label="Upload a video" onClick={() => setUploadOpen(false)}><div className="upload-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setUploadOpen(false)}><X/></button><div className="upload-icon"><Plus/></div><h2>Upload a video</h2><p>Share a moment with the VILABULB community.</p><form className="auth-form" onSubmit={async e => { e.preventDefault(); if (!currentUserId || !supabase) { setUploadOpen(false); setAuthMode("login"); setAuthMessage("Log in before uploading a video."); setAuthOpen(true); return; } if (!selectedVideoFile) return; setUploadBusy(true); setFeedNotice(""); try { const safeName = selectedVideoFile.name.replace(/[^a-zA-Z0-9._-]/g,"_"); const path = `${currentUserId}/${Date.now()}-${safeName}`; const { error: storageError } = await supabase.storage.from("vilabulb-media").upload(path,selectedVideoFile,{contentType:selectedVideoFile.type,upsert:false}); if (storageError) throw storageError; const { data: urlData } = supabase.storage.from("vilabulb-media").getPublicUrl(path); const { error: insertError } = await supabase.from("videos").insert({user_id:currentUserId,caption:uploadCaption.trim(),video_url:urlData.publicUrl,visibility:"public",status:"published"}); if (insertError) throw insertError; const { data: refreshed } = await supabase.from("videos").select("id,user_id,caption,video_url,created_at,profiles!videos_user_id_fkey(username,display_name)").eq("status","published").eq("visibility","public").order("created_at",{ascending:false}).limit(30); setDatabaseVideos((refreshed ?? []).map((item:any)=>({id:item.id,userId:item.user_id,user:item.profiles?.username || item.profiles?.display_name || "creator",caption:item.caption || "",sound:"Original sound",tag:"#vilabulb",url:item.video_url}))); setSelectedVideoFile(null); setUploadCaption(""); setUploadOpen(false); } catch(err) { setFeedNotice(err instanceof Error ? err.message : "Video upload failed. Please try again."); } finally { setUploadBusy(false); } }}><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e => setSelectedVideoFile(e.target.files?.[0] ?? null)} required/><textarea value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="Write a caption..." maxLength={2200}/><button className="signup-button wide" type="submit" disabled={uploadBusy || !selectedVideoFile}>{uploadBusy ? "Uploading video..." : "Post video"}</button></form><p className="auth-hint">Maximum upload size: 100 MB. Use videos you own or have permission to share.</p></div></div>}
    {commentsOpen && <div className="modal-backdrop" onClick={() => setCommentsOpen(false)}><div className="upload-modal comments-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setCommentsOpen(false)}><X/></button><h2>Comments</h2><div className="comment-list">{(commentItems[safeActive] ?? []).length ? (commentItems[safeActive] ?? []).map((item, i) => <p className="comment-item" key={i}>{item}</p>) : <p>No comments yet. Be the first to comment!</p>}</div><form className="comment-form" onSubmit={async e => { e.preventDefault(); const value = commentDraft.trim(); if (!value) return; const target = video as any; if (!currentUserId || !supabase) { setCommentsOpen(false); setAuthMode("login"); setAuthMessage("Log in to comment."); setAuthOpen(true); return; } if (!target?.id) { setCommentItems(old => ({ ...old, [safeActive]: [...(old[safeActive] ?? []), value] })); setCommentDraft(""); return; } const { error } = await supabase.from("comments").insert({video_id:target.id,user_id:currentUserId,body:value}); if (error) { setFeedNotice(error.message); return; } setCommentItems(old => ({ ...old, [safeActive]: [...(old[safeActive] ?? []), value] })); setCommentDraft(""); }}><input value={commentDraft} onChange={e => setCommentDraft(e.target.value)} placeholder="Add a comment..." maxLength={300}/><button className="signup-button" type="submit" disabled={!commentDraft.trim()}>Post</button></form><p className="auth-hint">Comments currently appear in this browser only. Database syncing is the next step.</p></div></div>}
  </main>;
}
