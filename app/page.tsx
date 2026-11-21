"use client";

import { useState } from "react";
import { Home, Compass, Users, Plus, MessageCircle, UserRound, Search, Heart, MessageSquare, Bookmark, Share2, Music2, Volume2, Flame, X } from "lucide-react";

const videos = [
  { user: "amara.creates", caption: "Little moments, big memories ✨ What made you smile today?", sound: "Original sound · Amara", tag: "#goodvibes", url: "https://videos.pexels.com/video-files/3129671/3129671-hd_1080_1920_25fps.mp4" },
  { user: "the_daily.joy", caption: "A little reminder to enjoy the journey 🌿", sound: "Soft days · instrumental", tag: "#lifestyle", url: "https://videos.pexels.com/video-files/3195394/3195394-hd_1080_1920_25fps.mp4" },
  { user: "travelwithtomi", caption: "POV: you finally take that trip 🌍", sound: "Around the world · audio", tag: "#travel", url: "https://videos.pexels.com/video-files/3015510/3015510-hd_1080_1920_25fps.mp4" }
];

export default function HomePage() {
  const [active, setActive] = useState(0);
  const [liked, setLiked] = useState<number[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const video = videos[active];
  const toggleLike = () => setLiked(v => v.includes(active) ? v.filter(i => i !== active) : [...v, active]);
  const toggleFollow = () => setFollowing(v => v.includes(video.user) ? v.filter(x => x !== video.user) : [...v, video.user]);
  const next = () => setActive(v => (v + 1) % videos.length);
  const previous = () => setActive(v => (v - 1 + videos.length) % videos.length);

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
        <div className="search-wrap"><Search size={18}/><input aria-label="Search" placeholder="Search videos, creators and sounds"/></div>
        <button className="login-button">Log in</button><button className="signup-button">Sign up</button>
      </header>
      <div className="feed-heading"><div><span className="eyebrow"><Flame size={14}/> YOUR DAILY SPARK</span><h1>For You</h1><p>Fresh videos picked to brighten your scroll.</p></div><div className="feed-tabs"><button className="tab active">For You</button><button className="tab">Following</button></div></div>
      <div className="feed-layout" id="feed">
        <div className="video-stage">
          <video key={video.url} className="video" src={video.url} autoPlay muted loop playsInline />
          <div className="video-shade"/>
          <div className="video-top"><span className="quality-pill"><span/> VILA PICKS</span><button className="sound-button" aria-label="Sound"><Volume2 size={18}/></button></div>
          <div className="video-copy">
            <div className="creator-row"><div className="avatar">{video.user[0].toUpperCase()}</div><strong>@{video.user}</strong><button className={following.includes(video.user) ? "follow following" : "follow"} onClick={toggleFollow}>{following.includes(video.user) ? "Following" : "Follow"}</button></div>
            <p>{video.caption}</p><p className="video-tags">{video.tag} <span>#vilabulb</span></p>
            <div className="sound-line"><Music2 size={15}/><span>{video.sound}</span></div>
          </div>
          <div className="video-actions">
            <button onClick={toggleLike} className={liked.includes(active) ? "action liked" : "action"}><span><Heart fill={liked.includes(active) ? "currentColor" : "none"}/></span><b>{liked.includes(active) ? "1.3K" : "1.2K"}</b></button>
            <button className="action"><span><MessageSquare/></span><b>86</b></button>
            <button className="action"><span><Bookmark/></span><b>Save</b></button>
            <button className="action"><span><Share2/></span><b>Share</b></button>
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
    {uploadOpen && <div className="modal-backdrop" onClick={() => setUploadOpen(false)}><div className="upload-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setUploadOpen(false)}><X/></button><div className="upload-icon"><Plus/></div><h2>Your next moment starts here</h2><p>Video uploading will be connected when we set up creator accounts and secure video storage.</p><button className="signup-button wide" onClick={() => setUploadOpen(false)}>Got it</button></div></div>}
  </main>;
}
