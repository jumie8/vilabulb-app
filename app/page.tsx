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
  const [searchQuery, setSearchQuery] = useState("");
  const [feedMode, setFeedMode] = useState<"for-you" | "following">("for-you");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentItems, setCommentItems] = useState<Record<number, string[]>>({});

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user.email ?? null);
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
            emailRedirectTo: window.location.origin,
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
        type: "signup"
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
        options: { redirectTo: window.location.origin }
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
  const touchStart = useRef<number | null>(null);
  const visibleVideos = videos.filter(item => {
    const matchesSearch = `${item.user} ${item.caption} ${item.tag} ${item.sound}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFeed = feedMode === "for-you" || following.includes(item.user);
    return matchesSearch && matchesFeed;
  });
  const safeActive = visibleVideos.length ? active % visibleVideos.length : 0;
  const video = visibleVideos[safeActive];
  const toggleLike = () => setLiked(v => v.includes(safeActive) ? v.filter(i => i !== safeActive) : [...v, safeActive]);
  const toggleSave = () => setSaved(v => v.includes(safeActive) ? v.filter(i => i !== safeActive) : [...v, safeActive]);
  const toggleFollow = () => setFollowing(v => v.includes(video.user) ? v.filter(x => x !== video.user) : [...v, video.user]);
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
        <a className="side-link selected" href="#feed"><Home/><span>For You</span></a>
        <a className="side-link" href="#discover"><Compass/><span>Discover</span></a>
        <a className="side-link" href="#following"><Users/><span>Following</span></a>
        <a className="side-link" href="#inbox"><MessageCircle/><span>Inbox</span></a>
        <a className="side-link" href="#profile"><UserRound/><span>Profile</span></a>
      </nav>
      <button className="create-button" onClick={() => setUploadOpen(true)}><Plus size={19}/> Create video</button>
      <div className="sidebar-note"><span className="live-dot"/> Your space to shine.<br/><small>Watch. Create. Connect.</small></div>
      <div className="side-footer">About · Community · Guidelines<br/>© 2026 VILABULB</div>
    </aside>
    <section className="main-area" id="top">
      <header className="topbar">
        <div className="mobile-brand"><span className="brand-mark">V</span> VILABULB</div>
        <div className="search-wrap"><Search size={18}/><input aria-label="Search videos, creators and sounds" placeholder="Search videos, creators and sounds" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setActive(0); }}/></div>
        <button className="login-button" onClick={() => { setAuthMode("login"); setAuthMessage(""); setAuthOpen(true); }}>{currentUser ? "Account" : "Log in"}</button>{currentUser ? <button className="signup-button" onClick={handleLogout}>Log out</button> : <button className="signup-button" onClick={() => { setAuthMode("signup"); setAuthMessage(""); setAuthOpen(true); }}>Sign up</button>}
      </header>
      <div className="feed-heading"><div><span className="eyebrow"><Flame size={14}/> YOUR DAILY SPARK</span><h1>For You</h1><p>Fresh videos picked to brighten your scroll.</p></div><div className="feed-tabs"><button className={feedMode === "for-you" ? "tab active" : "tab"} onClick={() => { setFeedMode("for-you"); setActive(0); }}>For You</button><button className={feedMode === "following" ? "tab active" : "tab"} onClick={() => { setFeedMode("following"); setActive(0); }}>Following</button></div></div>
      <div className="feed-layout" id="feed">
        <div className="video-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {!video ? <div className="video-fallback"><Search size={38}/><strong>{feedMode === "following" ? "No followed creators yet" : "No matching videos"}</strong><span>{feedMode === "following" ? "Follow creators to build your Following feed." : "Try another search."}</span><button onClick={() => { setSearchQuery(""); setFeedMode("for-you"); }}>Explore videos</button></div> : !videoError ? <video key={video.url + active} className="video" src={video.url} autoPlay muted={!soundOn} loop playsInline controls={false} preload="auto" onError={() => setVideoError(true)} /> : <div className="video-fallback"><Play size={42}/><strong>Video preview couldn't load</strong><span>Check your connection and try the next clip.</span><button onClick={() => { setVideoError(false); }}>Try again</button></div>}
          <div className="video-shade"/>
          <div className="video-top"><span className="quality-pill"><span/> VILA PICKS</span><button className="sound-button" aria-label={soundOn ? "Mute video" : "Turn sound on"} onClick={() => setSoundOn(v => !v)}>{soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button></div>
          <div className="video-copy">
            <div className="creator-row"><div className="avatar">{video.user[0].toUpperCase()}</div><strong>@{video.user}</strong><button className={following.includes(video.user) ? "follow following" : "follow"} onClick={toggleFollow}>{following.includes(video.user) ? "Following" : "Follow"}</button></div>
            <p>{video.caption}</p><p className="video-tags">{video.tag} <span>#vilabulb</span></p>
            <div className="sound-line"><Music2 size={15}/><span>{video.sound}</span></div>
          </div>
          <div className="video-actions">
            <button onClick={toggleLike} className={liked.includes(active) ? "action liked" : "action"}><span><Heart fill={liked.includes(active) ? "currentColor" : "none"}/></span><b>{liked.includes(active) ? "1.3K" : "1.2K"}</b></button>
            <button className="action" onClick={() => setCommentsOpen(true)}><span><MessageSquare/></span><b>{commentItems[safeActive]?.length ?? 0} comments</b></button>
            <button onClick={toggleSave} className={saved.includes(active) ? "action liked" : "action"}><span><Bookmark fill={saved.includes(active) ? "currentColor" : "none"}/></span><b>{saved.includes(active) ? "Saved" : "Save"}</b></button>
            <button className="action" onClick={() => { if (navigator.share) navigator.share({ title: "VILABULB", text: video.caption, url: window.location.href }).catch(() => {}); else navigator.clipboard?.writeText(window.location.href); }}><span><Share2/></span><b>Share</b></button>
          </div>
        </div>
        <div className="feed-controls"><button onClick={previous} aria-label="Previous video">↑</button><button onClick={next} aria-label="Next video">↓</button></div>
        <aside className="right-rail">
          <div className="rail-card welcome-card"><span className="spark">✦</span><h3>Your world.<br/>Your spotlight.</h3><p>Every creator has a story. This is where yours gets seen.</p><button onClick={() => setUploadOpen(true)}>Start creating <Plus size={15}/></button></div>
          <div className="rail-card trend-card"><div className="rail-title">Trending tags <span>See all</span></div>{["#NaijaCreators","#DailyLifestyle","#FoodTok","#GetInspired"].map((tag,i)=><div className="trend" key={tag}><span className="trend-number">0{i+1}</span><div><b>{tag}</b><small>{["12.8K","9.4K","7.2K","5.6K"][i]} videos</small></div><span className="trend-arrow">↗</span></div>)}</div>
          <div className="rail-quote">“Create what you wish existed.”<span>THE VILABULB SPIRIT</span></div>
        </aside>
      </div>
    </section>
    <nav className="mobile-nav"><a className="active"><Home/><span>Home</span></a><a><Compass/><span>Discover</span></a><button onClick={() => setUploadOpen(true)}><Plus/></button><a><MessageCircle/><span>Inbox</span></a><a><UserRound/><span>Profile</span></a></nav>
    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><div className="upload-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setAuthOpen(false)}><X/></button><div className="upload-icon"><UserRound/></div><h2>{authMode === "signup" ? "Join VILABULB" : "Welcome back"}</h2><p>{authMode === "signup" ? "Create your creator account." : "Log in to your account."}</p>{otpMode ? <><form onSubmit={handleVerifyOtp} className="auth-form"><input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e => setOtp(e.target.value.replace(/\\D/g, "").slice(0, 6))} placeholder="Enter 6-digit email code" minLength={6} maxLength={6} required/><button className="signup-button wide" type="submit" disabled={authBusy || otp.length !== 6}>{authBusy ? "Verifying..." : "Verify code and create account"}</button></form><p className="auth-hint">Check your inbox and spam folder. Keep this screen open while you enter the code.</p></> : <><form onSubmit={handleAuth} className="auth-form">{authMode === "signup" && <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" autoComplete="username" required/>}<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" required/><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (at least 6 characters)" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={6} required/><button className="signup-button wide" type="submit" disabled={authBusy}>{authBusy ? "Please wait..." : authMode === "signup" ? "Create account" : "Log in"}</button></form><div className="auth-divider"><span>or</span></div><button type="button" className="google-signin" onClick={handleGoogleSignIn} disabled={authBusy}><span className="google-g">G</span> Continue with Google</button></>}{authMessage && <p role="status">{authMessage}</p>}<p><button className="text-switch" onClick={() => { setOtpMode(false); setOtp(""); setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthMessage(""); }}>{otpMode ? "Back to sign up" : authMode === "signup" ? "Already have an account? Log in" : "New to VILABULB? Sign up"}</button></p></div></div>}
    {uploadOpen && <div className="modal-backdrop" onClick={() => setUploadOpen(false)}><div className="upload-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setUploadOpen(false)}><X/></button><div className="upload-icon"><Plus/></div><h2>Your next moment starts here</h2><p>Video uploading will be connected when we set up creator accounts and secure video storage.</p><button className="signup-button wide" onClick={() => setUploadOpen(false)}>Got it</button></div></div>}
    {commentsOpen && <div className="modal-backdrop" onClick={() => setCommentsOpen(false)}><div className="upload-modal comments-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setCommentsOpen(false)}><X/></button><h2>Comments</h2><div className="comment-list">{(commentItems[safeActive] ?? []).length ? (commentItems[safeActive] ?? []).map((item, i) => <p className="comment-item" key={i}>{item}</p>) : <p>No comments yet. Be the first to comment!</p>}</div><form className="comment-form" onSubmit={e => { e.preventDefault(); const value = commentDraft.trim(); if (!value) return; setCommentItems(old => ({ ...old, [safeActive]: [...(old[safeActive] ?? []), value] })); setCommentDraft(""); }}><input value={commentDraft} onChange={e => setCommentDraft(e.target.value)} placeholder="Add a comment..." maxLength={300}/><button className="signup-button" type="submit" disabled={!commentDraft.trim()}>Post</button></form><p className="auth-hint">Comments currently appear in this browser only. Database syncing is the next step.</p></div></div>}
  </main>;
}
