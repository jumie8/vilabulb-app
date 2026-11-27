"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";
import LiveRoom from "../components/live-room";
import { Home, Compass, Users, Plus, MessageCircle, UserRound, Search, Heart, MessageSquare, Bookmark, Share2, Music2, Volume2, VolumeX, Flame, X, Play, Radio, Settings, Bell, Shield, Wallet, Activity, Download, QrCode, HelpCircle, LogOut, Lock, Eye, UserCog, Camera, Image as ImageIcon, RefreshCw } from "lucide-react";

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
  const [activeView, setActiveView] = useState<"home"|"discover"|"inbox"|"profile"|"live"|"settings">("home");
  const [creatorProfiles, setCreatorProfiles] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [myUploads, setMyUploads] = useState<any[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [activityItems, setActivityItems] = useState<any[]>([]);
  const [activityBusy, setActivityBusy] = useState(false);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [liveTitle, setLiveTitle] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);
  const [activeLiveRoom, setActiveLiveRoom] = useState<{roomName:string;isHost:boolean}|null>(null);
  const livePreviewRef = useRef<HTMLVideoElement|null>(null);
  const livePreviewStream = useRef<MediaStream|null>(null);
  const [liveFacing, setLiveFacing] = useState<"user"|"environment">("user");
  const [liveBeauty, setLiveBeauty] = useState(false);
  const [livePreviewError, setLivePreviewError] = useState("");
  const [userSettings, setUserSettings] = useState<Record<string, any>>({ notifications:true, likes:true, comments:true, follows:true, mentions:true, directMessages:true, privateAccount:false, allowComments:true, allowMentions:true, allowMessages:true, allowDownloads:false, hideLikedVideos:true, hideFollowingList:true, dataSaver:false, autoplay:true });
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileStats, setProfileStats] = useState({following:0,followers:0,likes:0});
  const [profileTab, setProfileTab] = useState<"videos"|"saved">("videos");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState("15s");
  const [createOpen, setCreateOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user"|"environment">("user");
  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraTimer, setCameraTimer] = useState(false);
  const [cameraGrid, setCameraGrid] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const cameraRef = useRef<HTMLVideoElement|null>(null);
  const cameraStream = useRef<MediaStream|null>(null);
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setCurrentUser(data.session?.user.email ?? null); setCurrentUserId(data.session?.user.id ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user.email ?? null); setCurrentUserId(session?.user.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (activeView !== "live" || activeLiveRoom) return;
    let cancelled = false;
    setLivePreviewError("");
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: liveFacing }, audio: true }).then(stream => {
      if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
      livePreviewStream.current = stream;
      if (livePreviewRef.current) livePreviewRef.current.srcObject = stream;
    }).catch(() => { if (!cancelled) setLivePreviewError("Allow camera and microphone access to preview your LIVE."); });
    return () => { cancelled = true; livePreviewStream.current?.getTracks().forEach(track => track.stop()); livePreviewStream.current = null; };
  }, [activeView, activeLiveRoom, liveFacing]);

  useEffect(() => {
    if (!supabase || !currentUserId) { setActivityItems([]); return; }
    let alive = true;
    setActivityBusy(true);
    supabase.from("notifications").select("id,type,message,is_read,created_at,actor:profiles!notifications_actor_id_fkey(username,display_name,avatar_url)").eq("user_id",currentUserId).order("created_at",{ascending:false}).limit(40)
      .then(({data}) => { if (alive) setActivityItems(data ?? []); })
      .finally(() => { if (alive) setActivityBusy(false); });
    const channel = supabase.channel("vilabulb-notifications-"+currentUserId)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"user_id=eq."+currentUserId},payload=>setActivityItems(rows=>[payload.new as any,...rows].slice(0,40)))
      .subscribe();
    return () => { alive=false; supabase.removeChannel(channel); };
  }, [currentUserId]);

  const markNotificationsRead = async () => {
    if (!supabase || !currentUserId) return;
    const {error}=await supabase.from("notifications").update({is_read:true}).eq("user_id",currentUserId).eq("is_read",false);
    if (!error) setActivityItems(rows=>rows.map(row=>({...row,is_read:true})));
  };
  const reportCurrentVideo = async () => {
    const target = video as any;
    if (!currentUserId || !supabase) { setAuthMode("login"); setAuthMessage("Log in to report content."); setAuthOpen(true); return; }
    if (!target?.id) { setFeedNotice("Only uploaded community videos can be reported."); return; }
    const reason = window.prompt("Why are you reporting this video? Type: spam, harassment, hate, nudity, violence, misinformation, copyright or other");
    if (!reason) return;
    const normalized = reason.trim().toLowerCase();
    const allowed = ["spam","harassment","hate","nudity","violence","misinformation","copyright","other"];
    if (!allowed.includes(normalized)) { setFeedNotice("Please enter one of the listed report reasons."); return; }
    const {error}=await supabase.from("content_reports").insert({reporter_id:currentUserId,reported_user_id:target.userId,video_id:target.id,reason:normalized});
    setFeedNotice(error ? "Could not submit report: "+error.message : "Thank you. Your report has been sent for review.");
  };
  const blockCurrentCreator = async () => {
    const target = video as any;
    if (!currentUserId || !supabase) { setAuthMode("login"); setAuthMessage("Log in to block creators."); setAuthOpen(true); return; }
    if (!target?.userId || target.userId===currentUserId) return;
    if (!window.confirm("Block this creator? Their content will be hidden from your feed.")) return;
    const {error}=await supabase.from("user_blocks").insert({blocker_id:currentUserId,blocked_id:target.userId});
    if (error) setFeedNotice(error.message);
    else { setDatabaseVideos(rows=>rows.filter(row=>row.userId!==target.userId)); setFeedNotice("Creator blocked."); }
  };
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
      const { data, error } = await supabase!.from("videos").select("id,user_id,caption,video_url,created_at,profiles!videos_user_id_fkey(username,display_name)").eq("status","published").eq("visibility","public").order("created_at",{ascending:false}).limit(30);
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
        supabase!.from("follows").select("profiles!follows_following_id_fkey(username,display_name)").eq("follower_id",currentUserId).eq("status","accepted"),
        supabase!.from("video_likes").select("video_id").eq("user_id",currentUserId),
        supabase!.from("video_saves").select("video_id").eq("user_id",currentUserId)
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
    supabase!.from("profiles").select("id,username,display_name,bio,avatar_url").order("created_at",{ascending:false}).limit(50)
      .then(({data}) => { if (alive) setCreatorProfiles(data ?? []); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!supabase || !currentUserId) { setProfileStats({following:0,followers:0,likes:0}); return; }
    Promise.all([
      supabase.from("follows").select("*",{count:"exact",head:true}).eq("follower_id",currentUserId).eq("status","accepted"),
      supabase.from("follows").select("*",{count:"exact",head:true}).eq("following_id",currentUserId).eq("status","accepted"),
      supabase.from("video_likes").select("video_id,videos!inner(user_id)",{count:"exact",head:true}).eq("videos.user_id",currentUserId)
    ]).then(([followingCount,followersCount,likesCount])=>setProfileStats({following:followingCount.count||0,followers:followersCount.count||0,likes:likesCount.count||0}));
  },[currentUserId,myUploads.length]);
  useEffect(() => {
    if (!supabase || !currentUserId) { setMyProfile(null); setMyUploads([]); setInboxCount(0); return; }
    let alive = true;
    Promise.all([
      supabase!.from("profiles").select("id,username,display_name,bio,avatar_url,website,is_verified").eq("id",currentUserId).maybeSingle(),
      supabase!.from("videos").select("id,caption,video_url,created_at").eq("user_id",currentUserId).neq("status","removed").order("created_at",{ascending:false}).limit(30),
      supabase!.from("conversation_participants").select("conversation_id").eq("user_id",currentUserId),
      supabase!.from("user_settings").select("preferences").eq("user_id",currentUserId).maybeSingle()
    ]).then(([profile,uploads,conversations,settings]) => {
      if (!alive) return;
      setMyProfile(profile.data ?? null); setMyUploads(uploads.data ?? []); setInboxCount(conversations.data?.length ?? 0);
      const preferences = settings.data?.preferences;
      if (preferences) setUserSettings(prev => ({...prev, ...preferences}));
    });
    return () => { alive = false; };
  }, [currentUserId, databaseVideos]);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const loadLiveSessions = async () => {
      const { data, error } = await supabase!.from("live_sessions").select("id,host_id,title,status,room_name,started_at,profiles!live_sessions_host_id_fkey(username,display_name)").eq("status","live").order("started_at",{ascending:false}).limit(50);
      if (alive && !error) setLiveSessions(data ?? []);
    };
    loadLiveSessions();
    const channel = supabase!.channel("vilabulb-live-sessions")
      .on("postgres_changes",{event:"*",schema:"public",table:"live_sessions"},() => { loadLiveSessions(); })
      .subscribe();
    return () => { alive = false; supabase!.removeChannel(channel); };
  }, []);
  const startLiveSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUserId) { setAuthMode("login"); setAuthMessage("Log in to go live."); setAuthOpen(true); return; }
    if (!supabase) return;
    setLiveBusy(true);
    livePreviewStream.current?.getTracks().forEach(track => track.stop());
    livePreviewStream.current = null;
    const roomName = "vilabulb-" + crypto.randomUUID();
    const { error } = await supabase!.from("live_sessions").insert({host_id:currentUserId,title:liveTitle.trim(),room_name:roomName,status:"live"});
    if (error) setFeedNotice(error.message);
    else { setLiveTitle(""); setFeedNotice(""); setActiveLiveRoom({roomName,isHost:true}); const {data}=await supabase!.from("live_sessions").select("id,host_id,title,status,room_name,started_at,profiles!live_sessions_host_id_fkey(username,display_name)").eq("status","live").order("started_at",{ascending:false}).limit(50); setLiveSessions(data ?? []); }
    setLiveBusy(false);
  };
  const endLiveSession = async (sessionId:string) => {
    if (!supabase || !currentUserId) return;
    const {error}=await supabase!.from("live_sessions").update({status:"ended",ended_at:new Date().toISOString()}).eq("id",sessionId).eq("host_id",currentUserId);
    if (error) setFeedNotice(error.message);
    else { setLiveSessions(rows=>rows.filter(row=>row.id!==sessionId)); setActiveLiveRoom(null); }
  };
  const openCamera = async () => {
    setCameraError("");
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:cameraFacing},audio:true});
      cameraStream.current = stream;
      if (cameraRef.current) cameraRef.current.srcObject = stream;
    } catch {
      setCameraError("Allow camera and microphone access in your browser settings, then try again.");
    }
  };
  const flipCamera = async () => {
    setCameraFacing(value => value === "user" ? "environment" : "user");
    cameraStream.current?.getTracks().forEach(track=>track.stop());
    try { const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:cameraFacing === "user" ? "environment" : "user"},audio:true}); cameraStream.current=stream; if(cameraRef.current) cameraRef.current.srcObject=stream; setCameraError(""); }
    catch { setCameraError("Could not switch camera. Check camera permissions."); }
  };
  const captureOrStopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }
    if (!cameraStream.current) { setCameraError("Camera is not ready. Allow camera access and try again."); return; }
    if (cameraMode === "PHOTO" || cameraMode === "TEXT") {
      setCameraError("Photo and text capture are being prepared. Choose 15s or 60s to record a video.");
      return;
    }
    if (typeof MediaRecorder === "undefined") { setCameraError("Video recording is not supported by this browser. Please update Chrome."); return; }
    const mime = ["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(type=>MediaRecorder.isTypeSupported(type));
    try {
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(cameraStream.current, mime ? {mimeType:mime} : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) recordedChunksRef.current.push(event.data); };
      recorder.onerror = () => { setIsRecording(false); setCameraError("Recording failed. Please try again."); };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current,{type:recorder.mimeType || "video/webm"});
        if (!blob.size) { setCameraError("No video was recorded. Please try again."); return; }
        const file = new File([blob],"vilabulb-recording-"+Date.now()+".webm",{type:blob.type});
        setSelectedVideoFile(file);
        cameraStream.current?.getTracks().forEach(track=>track.stop());
        cameraStream.current=null;
        setCameraOpen(false);
        setUploadOpen(true);
      };
      recorder.start(250);
      setIsRecording(true);
      const duration = cameraMode === "60s" ? 60000 : cameraMode === "3m" ? 180000 : 15000;
      window.setTimeout(() => { if (recorder.state === "recording") { recorder.stop(); setIsRecording(false); } }, duration);
    } catch { setCameraError("Could not start recording. Please try again."); }
  };
  const closeCamera = () => {
    cameraStream.current?.getTracks().forEach(track=>track.stop());
    cameraStream.current=null;
    setCameraOpen(false);
  };
  const saveUserSettings = async (next: Record<string, any>) => {
    if (!currentUserId || !supabase) { setAuthMode("login"); setAuthMessage("Log in to manage your settings."); setAuthOpen(true); return; }
    setSettingsBusy(true); setSettingsNotice("");
    const { error } = await supabase.from("user_settings").upsert({user_id:currentUserId, preferences:next, updated_at:new Date().toISOString()},{onConflict:"user_id"});
    if (error) setSettingsNotice("Could not save this setting: " + error.message);
    else { setUserSettings(next); setSettingsNotice("Settings saved."); }
    setSettingsBusy(false);
  };
  const changeSetting = (key:string, value:boolean) => saveUserSettings({...userSettings,[key]:value});
  const saveProfileChanges = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !currentUserId) return;
    setSettingsBusy(true); setSettingsNotice("");
    const {error} = await supabase.from("profiles").update({display_name:editDisplayName.trim(),bio:editBio.trim(),website:editWebsite.trim() || null,updated_at:new Date().toISOString()}).eq("id",currentUserId);
    if (error) setSettingsNotice("Profile update failed: " + error.message);
    else { setMyProfile((p:any)=>({...p,display_name:editDisplayName.trim(),bio:editBio.trim(),website:editWebsite.trim() || null})); setEditProfileOpen(false); setSettingsNotice("Profile updated."); }
    setSettingsBusy(false);
  };
  const uploadProfilePicture = async (file: File) => {
    if (!supabase || !currentUserId) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) { setSettingsNotice("Choose a JPG, PNG or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setSettingsNotice("Your profile picture must be 5 MB or smaller."); return; }
    setAvatarBusy(true); setSettingsNotice("");
    try {
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const objectPath = currentUserId + "/avatar-" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("vilabulb-media").upload(objectPath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("vilabulb-media").getPublicUrl(objectPath);
      const avatarUrl = publicUrl.publicUrl;
      const { error: profileError } = await supabase.from("profiles").update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq("id", currentUserId);
      if (profileError) throw profileError;
      setMyProfile((profile:any) => ({ ...profile, avatar_url: avatarUrl }));
      setCreatorProfiles((profiles:any[]) => profiles.map(profile => profile.id === currentUserId ? { ...profile, avatar_url: avatarUrl } : profile));
      setSettingsNotice("Profile picture updated successfully.");
    } catch (error) {
      setSettingsNotice(error instanceof Error ? "Profile picture upload failed: " + error.message : "Profile picture upload failed. Please try again.");
    } finally {
      setAvatarBusy(false);
    }
  };
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
    const { data: existing } = await supabase!.from("video_likes").select("video_id").eq("video_id",target.id).eq("user_id",currentUserId).maybeSingle();
    if (existing) { const { error } = await supabase!.from("video_likes").delete().eq("video_id",target.id).eq("user_id",currentUserId); if (!error) setLiked(v => v.filter(i => i !== safeActive)); }
    else { const { error } = await supabase!.from("video_likes").insert({video_id:target.id,user_id:currentUserId}); if (!error) setLiked(v => [...v,safeActive]); }
  };
  const toggleSave = async () => {
    if (!currentUserId) { setAuthMode("login"); setAuthMessage("Log in to save videos."); setAuthOpen(true); return; }
    const target = video as any;
    if (!target?.id || !supabase) { setSaved(v => v.includes(safeActive) ? v.filter(i => i !== safeActive) : [...v, safeActive]); return; }
    const { data: existing } = await supabase!.from("video_saves").select("video_id").eq("video_id",target.id).eq("user_id",currentUserId).maybeSingle();
    if (existing) { const { error } = await supabase!.from("video_saves").delete().eq("video_id",target.id).eq("user_id",currentUserId); if (!error) setSaved(v => v.filter(i => i !== safeActive)); }
    else { const { error } = await supabase!.from("video_saves").insert({video_id:target.id,user_id:currentUserId}); if (!error) setSaved(v => [...v,safeActive]); }
  };
  const toggleFollow = async () => {
    if (!currentUserId) { setAuthMode("login"); setAuthMessage("Log in to follow creators."); setAuthOpen(true); return; }
    const target = video as any;
    if (!target?.userId || !supabase || target.userId === currentUserId) return;
    const { data: existing } = await supabase!.from("follows").select("follower_id").eq("follower_id",currentUserId).eq("following_id",target.userId).maybeSingle();
    if (existing) { const { error } = await supabase!.from("follows").delete().eq("follower_id",currentUserId).eq("following_id",target.userId); if (!error) setFollowing(v => v.filter(x => x !== video.user)); }
    else { const { error } = await supabase!.from("follows").insert({follower_id:currentUserId,following_id:target.userId,status:"accepted"}); if (!error) setFollowing(v => [...v,video.user]); }
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
        <button className={activeView === "discover" ? "side-link selected" : "side-link"} onClick={() => setActiveView("discover")}><Compass/><span>Discover</span></button>\n        <button className={activeView === "live" ? "side-link selected" : "side-link"} onClick={() => setActiveView("live")}><Radio/><span>LIVE</span></button>
        <button className="side-link" onClick={() => { setActiveView("home"); setFeedMode("following"); setActive(0); }}><Users/><span>Following</span></button>
        <button className={activeView === "inbox" ? "side-link selected" : "side-link"} onClick={() => setActiveView("inbox")}><MessageCircle/><span>Inbox</span></button>
        <button className={activeView === "profile" ? "side-link selected" : "side-link"} onClick={() => setActiveView("profile")}><UserRound/><span>Profile</span></button>
      </nav>
      <button className="create-button" onClick={openCamera}><Plus size={19}/> Create video</button>
      <div className="sidebar-note"><span className="live-dot"/> Your space to shine.<br/><small>Watch. Create. Connect.</small></div>
      <div className="side-footer">About · Community · Guidelines<br/>© 2026 VILABULB</div>
    </aside>
    <section className="main-area" id="top">
      <header className="topbar">
        <div className="mobile-brand"><span className="brand-mark">V</span> VILABULB</div>
        <div className="search-wrap"><Search size={18}/><input aria-label="Search videos, creators and sounds" placeholder="Search videos, creators and sounds" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setActive(0); }}/></div><button type="button" className="top-create-button" onClick={openCamera}><Plus size={16}/> Create</button>
        <button className="login-button" onClick={() => currentUser ? setActiveView("settings") : (setAuthMode("login"),setAuthMessage(""),setAuthOpen(true))}>{currentUser ? "Settings" : "Log in"}</button>{currentUser ? <button className="signup-button" onClick={handleLogout}>Log out</button> : <button className="signup-button" onClick={() => { setAuthMode("signup"); setAuthMessage(""); setAuthOpen(true); }}>Sign up</button>}
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
            <button className="action" onClick={() => { if (navigator.share) navigator.share({ title: "VILABULB", text: video.caption, url: window.location.href }).catch(() => {}); else navigator.clipboard?.writeText(window.location.href); }}><span><Share2/></span><b>Share</b></button><button className="action" onClick={reportCurrentVideo}><span><Shield/></span><b>Report</b></button><button className="action" onClick={blockCurrentCreator}><span><UserRound/></span><b>Block</b></button>
          </div>}
        </div>
        <div className="feed-controls"><button onClick={previous} aria-label="Previous video">↑</button><button onClick={next} aria-label="Next video">↓</button></div>
        <aside className="right-rail">
          <div className="rail-card welcome-card"><span className="spark">✦</span><h3>Your world.<br/>Your spotlight.</h3><p>Every creator has a story. This is where yours gets seen.</p><button onClick={() => setUploadOpen(true)}>Start creating <Plus size={15}/></button></div>
          <div className="rail-card trend-card"><div className="rail-title">Trending tags <button type="button" onClick={() => setActiveView("discover")}>See all</button></div>{["#NaijaCreators","#DailyLifestyle","#FoodTok","#GetInspired"].map((tag,i)=><button type="button" className="trend trend-button" key={tag} onClick={() => { setSearchQuery(tag); setFeedMode("for-you"); setActive(0); setActiveView("home"); }}><span className="trend-number">0{i+1}</span><div><b>{tag}</b><small>{["12.8K","9.4K","7.2K","5.6K"][i]} videos</small></div><span className="trend-arrow">↗</span></button>)}</div>
          <div className="rail-quote">“Create what you wish existed.”<span>THE VILABULB SPIRIT</span></div>
        </aside>
      </div></>}
      {activeView === "discover" && <section className="app-panel"><h1>Discover creators</h1><p>Find people in the VILABULB community.</p><div className="creator-grid">{creatorProfiles.filter(p => p.id !== currentUserId).map(p => <article className="creator-card" key={p.id}><div className="avatar">{p.avatar_url ? <img src={p.avatar_url} alt="" loading="lazy"/> : (p.username || p.display_name || "C")[0].toUpperCase()}</div><strong>@{p.username || p.display_name || "creator"}</strong><p>{p.bio || "VILABULB creator"}</p><button className="follow" onClick={async () => { if (!currentUserId) { setAuthMode("login"); setAuthOpen(true); setAuthMessage("Log in to follow creators."); return; } const { data: existing } = await supabase!.from("follows").select("follower_id").eq("follower_id",currentUserId).eq("following_id",p.id).maybeSingle(); if (existing) { await supabase!.from("follows").delete().eq("follower_id",currentUserId).eq("following_id",p.id); setFollowing(v => v.filter(x => x !== (p.username || p.display_name))); } else { const { error } = await supabase!.from("follows").insert({follower_id:currentUserId,following_id:p.id,status:"accepted"}); if (!error) setFollowing(v => [...v,p.username || p.display_name]); else setFeedNotice(error.message); } }}>{following.includes(p.username || p.display_name) ? "Following" : "Follow"}</button></article>)}</div>{creatorProfiles.filter(p => p.id !== currentUserId).length === 0 && <p className="empty-panel">No other creators have joined yet. Invite friends to VILABULB.</p>}</section>}
      {activeView === "live" && <section className="app-panel live-studio">
  <div className="live-studio-preview">
    {livePreviewError ? <div className="live-preview-placeholder"><Camera size={42}/><strong>Camera preview unavailable</strong><span>{livePreviewError}</span></div> : <video ref={livePreviewRef} className={liveBeauty ? "live-preview-video live-beauty" : "live-preview-video"} autoPlay muted playsInline/>}
    <div className="live-studio-top"><button type="button" className="live-close" onClick={()=>setActiveView("home")}><X/></button><span className="live-reward-pill"><Radio size={16}/> VILABULB LIVE STUDIO</span><span className="live-preview-status">● PREVIEW</span></div>
    <div className="live-studio-banner"><strong>Go live and connect with your community</strong><span>Check your camera and add a title before you start</span></div>
    <div className="live-studio-controls">
      <button type="button" onClick={()=>setLiveFacing(v=>v==="user"?"environment":"user")}><RefreshCw/><span>Flip</span></button>
      <button type="button" className={liveBeauty?"selected":""} onClick={()=>setLiveBeauty(v=>!v)}><Activity/><span>{liveBeauty?"Beauty on":"Beautify"}</span></button>
      <button type="button" onClick={()=>setFeedNotice("Live effects are coming soon. Your camera preview is still active.")}><ImageIcon/><span>Effects</span></button>
      <button type="button" onClick={()=>setFeedNotice("To manage camera access, open your browser site settings and allow camera and microphone.")}><Settings/><span>Settings</span></button>
      <button type="button" onClick={()=>{if(navigator.share) void navigator.share({title:"Join me on VILABULB",text:"Watch my live on VILABULB"}).catch(()=>{});else setFeedNotice("Share VILABULB with your friends to invite them.");}}><Share2/><span>Share</span></button>
    </div>
    <form className="live-studio-action" onSubmit={startLiveSession}>
      <input value={liveTitle} onChange={e=>setLiveTitle(e.target.value)} placeholder="Add a title for your LIVE" maxLength={120} required/>
      <button className="live-go-button" type="submit" disabled={liveBusy}>{liveBusy?"Starting LIVE…":<><Radio size={20}/> Go LIVE</>}</button>
    </form>
  </div>
  {feedNotice && <p className="feed-notice" role="status">{feedNotice}</p>}
  <div className="live-list-heading"><h2>Creators LIVE now</h2><span>{liveSessions.length}</span></div>
  <div className="live-list">{liveSessions.map(session=><article className="live-card" key={session.id}><span className="live-badge">● LIVE</span><strong>{session.title}</strong><p>@{session.profiles?.username || session.profiles?.display_name || "creator"}</p><small>Started {new Date(session.started_at).toLocaleString()}</small>{session.host_id===currentUserId ? <><button className="follow" onClick={()=>setActiveLiveRoom({roomName:session.room_name,isHost:true})}>Rejoin live</button><button className="follow" onClick={()=>endLiveSession(session.id)}>End live</button></> : <button className="follow" onClick={()=>{if(!currentUserId){setAuthMode("login");setAuthMessage("Log in to watch live.");setAuthOpen(true);}else setActiveLiveRoom({roomName:session.room_name,isHost:false});}}>Watch live</button>}</article>)}</div>
  {liveSessions.length===0 && <div className="empty-panel"><Radio size={34}/><strong>No creators are live right now</strong><span>Be the first to go live on VILABULB.</span></div>}
</section>}
      {activeView === "inbox" && <section className="inbox-screen"><header className="inbox-header"><span className="brand-mark">V</span><h1>Inbox</h1><button aria-label="Search creators" onClick={()=>setActiveView("discover")}><Search/></button></header>
        {!currentUserId ? <div className="empty-panel"><strong>Log in to see your messages</strong><button className="signup-button" onClick={()=>{setAuthMode("login");setAuthOpen(true);}}>Log in</button></div> : <>
        <div className="story-strip"><button className="story-item" onClick={openCamera}><span className="story-avatar story-add"><Plus/></span><b>Create</b></button>{creatorProfiles.filter(p=>p.id!==currentUserId).slice(0,12).map(p=><button className="story-item" key={p.id} onClick={()=>setActiveView("discover")}><span className="story-avatar">{p.avatar_url?<img src={p.avatar_url} alt=""/>:<span>{(p.username||p.display_name||"V")[0].toUpperCase()}</span>}</span><b>{p.username||p.display_name||"Creator"}</b></button>)}</div>
        <div className="activity-card activity-card-panel"><span className="activity-icon"><Activity/></span><span><b>Activity & new followers</b><small>Likes, comments and new followers</small></span><strong>{activityItems.filter(item=>!item.is_read).length || ""}</strong><button type="button" onClick={markNotificationsRead}>Mark all read</button></div><div className="activity-list">{activityBusy?<p>Loading activity…</p>:activityItems.length?activityItems.map(item=><article className={item.is_read?"activity-row":"activity-row unread"} key={item.id}><span className="activity-avatar">{item.actor?.avatar_url?<img src={item.actor.avatar_url} alt=""/>:(item.actor?.username||"V")[0].toUpperCase()}</span><span><b>@{item.actor?.username||item.actor?.display_name||"VILABULB member"}</b> {item.message||"interacted with your profile"}<small>{new Date(item.created_at).toLocaleString()}</small></span></article>):<p className="auth-hint">Your likes, comments and new follower alerts will appear here.</p>}</div>
        <div className="inbox-section-title">Messages <button onClick={()=>setActiveView("discover")}>Find people</button></div>
        {creatorProfiles.filter(p=>p.id!==currentUserId).slice(0,20).map(p=><button className="conversation-row" key={p.id} onClick={()=>setActiveView("discover")}><span className="conversation-avatar">{p.avatar_url?<img src={p.avatar_url} alt=""/>:(p.username||p.display_name||"V")[0].toUpperCase()}</span><span className="conversation-copy"><b>{p.display_name||p.username||"Creator"}</b><small>View profile to connect</small></span></button>)}
        {creatorProfiles.filter(p=>p.id!==currentUserId).length===0&&<div className="empty-panel"><MessageCircle/><strong>No conversations yet</strong><span>Discover creators and connect with the community.</span><button className="signup-button" onClick={()=>setActiveView("discover")}>Discover creators</button></div>}
        </>}</section>}
      {activeView === "settings" && <section className="app-panel settings-panel">
        <div className="settings-heading"><div><h1><Settings size={25}/> Settings and privacy</h1><p>Manage your VILABULB account and preferences.</p></div><button className="settings-edit" onClick={()=>setActiveView("profile")}>View profile</button></div>
        {!currentUserId ? <div className="empty-panel"><strong>Log in to manage your settings</strong><button className="signup-button" onClick={()=>{setAuthMode("login");setAuthOpen(true);}}>Log in</button></div> : <>
        {settingsNotice && <p className="settings-notice" role="status">{settingsNotice}</p>}
        <div className="settings-section"><h2><UserCog/> Account</h2><button className="settings-row" onClick={()=>{setEditDisplayName(myProfile?.display_name || "");setEditBio(myProfile?.bio || "");setEditWebsite(myProfile?.website || "");setEditProfileOpen(true);}}><span><b>Edit profile</b><small>Change your display name, bio and website</small></span><span>›</span></button><button className="settings-row" onClick={()=>setAuthMessage("Password changes are managed through the secure password reset email flow. Use Forgot Password on the login screen.")}><span><b>Security and password</b><small>Manage sign-in and account security</small></span><span>›</span></button></div>
        <div className="settings-section"><h2><Shield/> Privacy and visibility</h2>
          {[
            ["privateAccount","Private account","Only approve people you want to follow you"],
            ["allowComments","Allow comments","Let people comment on your videos"],
            ["allowMentions","Allow mentions","Let people mention your account"],
            ["allowMessages","Allow direct messages","Allow other members to message you"],
            ["allowDownloads","Allow video downloads","Let viewers download your public videos"],
            ["hideFollowingList","Hide following list","Keep the accounts you follow private"],
            ["hideLikedVideos","Hide liked videos","Keep your liked videos private"]
          ].map(([key,label,desc])=><label className="settings-row" key={key}><span><b>{label}</b><small>{desc}</small></span><input type="checkbox" checked={!!userSettings[key]} disabled={settingsBusy} onChange={e=>changeSetting(key,e.target.checked)}/></label>)}
        </div>
        <div className="settings-section"><h2><Bell/> Notifications</h2>
          {[["notifications","Push and in-app notifications"],["likes","Likes"],["comments","Comments and replies"],["follows","New followers"],["mentions","Mentions"],["directMessages","Direct messages"]].map(([key,label])=><label className="settings-row" key={key}><span><b>{label}</b></span><input type="checkbox" checked={!!userSettings[key]} disabled={settingsBusy || (key!=="notifications" && !userSettings.notifications)} onChange={e=>changeSetting(key,e.target.checked)}/></label>)}
        </div>
        <div className="settings-section"><h2><Activity/> Content and display</h2>
          <label className="settings-row"><span><b>Data saver</b><small>Reduce mobile data use while browsing</small></span><input type="checkbox" checked={!!userSettings.dataSaver} disabled={settingsBusy} onChange={e=>changeSetting("dataSaver",e.target.checked)}/></label>
          <label className="settings-row"><span><b>Autoplay videos</b><small>Play feed videos automatically</small></span><input type="checkbox" checked={!!userSettings.autoplay} disabled={settingsBusy} onChange={e=>changeSetting("autoplay",e.target.checked)}/></label>
          <button className="settings-row" onClick={()=>setActiveView("profile")}><span><b>Your videos</b><small>Manage videos you've uploaded</small></span><span>›</span></button>
          <button className="settings-row" onClick={()=>setActiveView("inbox")}><span><b>Inbox and messaging</b><small>Open your conversations</small></span><span>›</span></button>
        </div>
        <div className="settings-section"><h2><Wallet/> Wallet and creator tools</h2><div className="settings-row settings-disabled"><span><b>Wallet</b><small>Secure payments and withdrawals will be enabled after payment-provider setup.</small></span><span>Coming soon</span></div><div className="settings-row settings-disabled"><span><b>Creator analytics</b><small>Video reach and earnings dashboard is being prepared.</small></span><span>Coming soon</span></div><div className="settings-row settings-disabled"><span><b>QR code</b><small>Profile QR sharing</small></span><span>Coming soon</span></div></div>
        <div className="settings-section"><h2><HelpCircle/> Support</h2><button className="settings-row" onClick={()=>setSettingsNotice("For support, email support@vilabulb.net once your support mailbox is configured.")}><span><b>Help centre</b><small>Get help with VILABULB</small></span><span>›</span></button><button className="settings-row" onClick={handleLogout}><span><b>Log out</b><small>Sign out of this account on this device</small></span><LogOut size={18}/></button></div>
        <p className="auth-hint">{settingsBusy ? "Saving your settings…" : "Your preferences are saved to your VILABULB account."}</p>
        </>}
      </section>}
      {editProfileOpen && <div className="modal-backdrop" onClick={()=>setEditProfileOpen(false)}><div className="upload-modal" onClick={e=>e.stopPropagation()}><button className="close-modal" onClick={()=>setEditProfileOpen(false)}><X/></button><h2>Edit profile</h2><div className="edit-avatar-row">{myProfile?.avatar_url ? <img src={myProfile.avatar_url} alt="Current profile picture"/> : <div className="avatar edit-avatar-placeholder">{(myProfile?.username || "V")[0].toUpperCase()}</div>}<div><strong>Profile picture</strong><small>JPG, PNG or WebP · Up to 5 MB</small><label className="profile-photo-button profile-photo-picker">{avatarBusy ? "Uploading…" : "Choose photo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={avatarBusy} onChange={e=>{const file=e.currentTarget.files?.[0];if(file) void uploadProfilePicture(file);e.currentTarget.value="";}}/></label></div></div>{settingsNotice && <p className="settings-notice" role="status">{settingsNotice}</p>}<form className="auth-form" onSubmit={saveProfileChanges}><input value={editDisplayName} onChange={e=>setEditDisplayName(e.target.value)} placeholder="Display name" maxLength={60}/><textarea value={editBio} onChange={e=>setEditBio(e.target.value)} placeholder="Bio" maxLength={160}/><input value={editWebsite} onChange={e=>setEditWebsite(e.target.value)} placeholder="Website URL"/><button className="signup-button wide" type="submit" disabled={settingsBusy}>{settingsBusy ? "Saving…" : "Save profile"}</button></form></div></div>}
      {activeView === "profile" && <section className="app-panel profile-page">
        {!currentUserId ? <div className="empty-panel"><strong>Log in to view your profile</strong><button className="signup-button" onClick={()=>{setAuthMode("login");setAuthOpen(true);}}>Log in</button></div> : <>
          <div className="profile-top-actions"><button aria-label="Back" onClick={()=>setActiveView("home")}>←</button><span>Profile</span><button aria-label="Notifications" onClick={()=>setActiveView("inbox")}><Bell/></button><button aria-label="Settings" onClick={()=>setActiveView("settings")}>•••</button></div>
          <div className="profile-hero">
            <div className="profile-avatar-wrap">{myProfile?.avatar_url?<img className="profile-avatar-image" src={myProfile.avatar_url} alt="Profile"/>:<div className="avatar profile-avatar">{(myProfile?.username || currentUser?.split("@")[0] || "V")[0].toUpperCase()}</div>}</div><button className="profile-photo-button" type="button" onClick={()=>{setEditDisplayName(myProfile?.display_name||"");setEditBio(myProfile?.bio||"");setEditWebsite(myProfile?.website||"");setEditProfileOpen(true);}}><Camera size={14}/> Change profile picture</button>
            <h1>@{myProfile?.username || currentUser?.split("@")[0] || "vilabulb"} {myProfile?.is_verified && <span className="profile-verified" title="Verified VILABULB account">✓</span>}</h1>
            {myProfile?.display_name && <p className="profile-display-name">{myProfile.display_name}</p>}
            <p className="profile-bio">{myProfile?.bio || "Hello! Welcome to my VILABULB profile."}</p>
            {myProfile?.website && <a className="profile-website" href={myProfile.website.startsWith("http")?myProfile.website:"https://"+myProfile.website} target="_blank" rel="noreferrer">↗ {myProfile.website}</a>}
            <div className="profile-stats"><div><b>{profileStats.following.toLocaleString()}</b><span>Following</span></div><div><b>{profileStats.followers.toLocaleString()}</b><span>Followers</span></div><div><b>{profileStats.likes.toLocaleString()}</b><span>Likes</span></div></div>
            <div className="profile-buttons"><button className="profile-edit-button" onClick={()=>{setEditDisplayName(myProfile?.display_name||"");setEditBio(myProfile?.bio||"");setEditWebsite(myProfile?.website||"");setEditProfileOpen(true);}}>Edit profile</button><button className="profile-share-button" onClick={()=>{const url=window.location.origin+"/?profile="+encodeURIComponent(myProfile?.username||"vilabulb");if(navigator.share)navigator.share({title:"VILABULB profile",url}).catch(()=>{});else navigator.clipboard?.writeText(url);}}>Share profile</button><button className="profile-more-button" onClick={()=>setActiveView("settings")}>⌄</button></div>
          </div>
          <div className="profile-tabs"><button className={profileTab==="videos"?"selected":""} onClick={()=>setProfileTab("videos")}><Play/> Videos</button><button className={profileTab==="saved"?"selected":""} onClick={()=>setProfileTab("saved")}><Bookmark/> Saved</button></div>
          {profileTab==="videos" ? <div className="profile-video-grid">{myUploads.map(item=><button className="profile-video-tile" key={item.id} onClick={()=>setActiveView("home")}><video src={item.video_url} muted playsInline/><span><Play size={13}/> Video</span></button>)}</div> : <div className="empty-panel"><Bookmark/><strong>Your saved videos</strong><span>Saved videos are private and will appear here.</span></div>}
          {!myUploads.length&&profileTab==="videos"&&<div className="empty-panel"><strong>No videos yet</strong><span>Share your first video with the VILABULB community.</span><button className="signup-button" onClick={openCamera}>Create video</button></div>}
        </>}
      </section>}
    </section>
    <nav className="mobile-nav"><button className={activeView === "home" ? "active" : ""} onClick={() => setActiveView("home")}><Home/><span>Home</span></button><button className={activeView === "discover" ? "active" : ""} onClick={() => setActiveView("discover")}><Compass/><span>Discover</span></button><button className={activeView === "live" ? "active" : ""} onClick={() => setActiveView("live")}><Radio/><span>LIVE</span></button><button type="button" aria-label="Create video" onClick={openCamera}><Plus/></button><button className={activeView === "inbox" ? "active" : ""} onClick={() => setActiveView("inbox")}><MessageCircle/><span>Inbox</span></button><button className={activeView === "profile" ? "active" : ""} onClick={() => setActiveView("profile")}><UserRound/><span>Profile</span></button></nav>
    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><div className="upload-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setAuthOpen(false)}><X/></button><div className="upload-icon"><UserRound/></div><h2>{authMode === "signup" ? "Join VILABULB" : "Welcome back"}</h2><p>{authMode === "signup" ? "Create your creator account." : "Log in to your account."}</p>{otpMode ? <><form onSubmit={handleVerifyOtp} className="auth-form"><input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="Enter 6-digit email code" minLength={6} maxLength={6} required/><button className="signup-button wide" type="submit" disabled={authBusy || otp.length !== 6}>{authBusy ? "Verifying..." : "Verify code and create account"}</button></form><p className="auth-hint">Check your inbox and spam folder. Keep this screen open while you enter the code.</p></> : <><form onSubmit={handleAuth} className="auth-form">{authMode === "signup" && <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" autoComplete="username" required/>}<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" required/><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (at least 6 characters)" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={6} required/><button className="signup-button wide" type="submit" disabled={authBusy}>{authBusy ? "Please wait..." : authMode === "signup" ? "Create account" : "Log in"}</button></form><div className="auth-divider"><span>or</span></div><button type="button" className="google-signin" onClick={handleGoogleSignIn} disabled={authBusy}><span className="google-g">G</span> Continue with Google</button></>}{authMessage && <p role="status">{authMessage}</p>}<p><button className="text-switch" onClick={() => { setOtpMode(false); setOtp(""); setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthMessage(""); }}>{otpMode ? "Back to sign up" : authMode === "signup" ? "Already have an account? Log in" : "New to VILABULB? Sign up"}</button></p></div></div>}
    {uploadOpen && <div className="modal-backdrop upload-backdrop" role="dialog" aria-modal="true" aria-label="Upload a video" onClick={() => setUploadOpen(false)}><div className="upload-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setUploadOpen(false)}><X/></button><div className="upload-icon"><Plus/></div><h2>Upload a video</h2><p>Share a moment with the VILABULB community.</p><form className="auth-form" onSubmit={async e => { e.preventDefault(); if (!currentUserId || !supabase) { setUploadOpen(false); setAuthMode("login"); setAuthMessage("Log in before uploading a video."); setAuthOpen(true); return; } if (!selectedVideoFile) return; setUploadBusy(true); setFeedNotice(""); try { const safeName = selectedVideoFile.name.replace(/[^a-zA-Z0-9._-]/g,"_"); const path = `${currentUserId}/${Date.now()}-${safeName}`; const { error: storageError } = await supabase!.storage.from("vilabulb-media").upload(path,selectedVideoFile,{contentType:selectedVideoFile.type,upsert:false}); if (storageError) throw storageError; const { data: urlData } = supabase!.storage.from("vilabulb-media").getPublicUrl(path); const { error: insertError } = await supabase!.from("videos").insert({user_id:currentUserId,caption:uploadCaption.trim(),video_url:urlData.publicUrl,visibility:"public",status:"published"}); if (insertError) throw insertError; const { data: refreshed } = await supabase!.from("videos").select("id,user_id,caption,video_url,created_at,profiles!videos_user_id_fkey(username,display_name)").eq("status","published").eq("visibility","public").order("created_at",{ascending:false}).limit(30); setDatabaseVideos((refreshed ?? []).map((item:any)=>({id:item.id,userId:item.user_id,user:item.profiles?.username || item.profiles?.display_name || "creator",caption:item.caption || "",sound:"Original sound",tag:"#vilabulb",url:item.video_url}))); setSelectedVideoFile(null); setUploadCaption(""); setUploadOpen(false); } catch(err) { setFeedNotice(err instanceof Error ? err.message : "Video upload failed. Please try again."); } finally { setUploadBusy(false); } }}><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e => setSelectedVideoFile(e.target.files?.[0] ?? null)} required/><textarea value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="Write a caption..." maxLength={2200}/><button className="signup-button wide" type="submit" disabled={uploadBusy || !selectedVideoFile}>{uploadBusy ? "Uploading video..." : "Post video"}</button></form><p className="auth-hint">Maximum upload size: 100 MB. Use videos you own or have permission to share.</p></div></div>}
    {cameraOpen && <div className="camera-screen">
      <header className="camera-top"><button aria-label="Close camera" onClick={closeCamera}><X size={30}/></button><button className="camera-sound" onClick={()=>setFeedNotice("Sound selection will be available soon.")}><Music2 size={18}/> Add sound</button><button aria-label="Flip camera" onClick={flipCamera}><RefreshCw size={30}/></button></header>
      {cameraError ? <div className="camera-error">{cameraError}<button onClick={()=>{setCameraError("");void openCamera();}}>Try again</button></div> : <video ref={cameraRef} className="camera-preview" autoPlay muted playsInline/>}
      {cameraGrid && <div className="camera-grid-overlay"/>}
      <aside className="camera-side-tools"><button onClick={()=>setCameraFlash(v=>!v)} aria-label="Flash">{cameraFlash?"⚡":"ϟ"}</button><button onClick={()=>setCameraTimer(v=>!v)} aria-label="Timer">{cameraTimer?"3s":"◷"}</button><button onClick={()=>setCameraGrid(v=>!v)} aria-label="Grid">▦</button><button onClick={()=>setCameraZoom(v=>!v)} aria-label="Zoom">{cameraZoom?"1×":"↗"}</button><button onClick={()=>setFeedNotice("Beauty effects are coming soon.")} aria-label="Effects">✧</button><button onClick={()=>setFeedNotice("More camera tools are coming soon.")}>⌄</button></aside>
      <div className="camera-tools">{["3m","60s","15s","PHOTO","TEXT"].map(mode=><button key={mode} className={cameraMode===mode?"selected":""} onClick={()=>setCameraMode(mode)}>{mode}</button>)}</div>
      <footer className="camera-bottom"><button className="camera-gallery" onClick={()=>{closeCamera();setUploadOpen(true);}}><ImageIcon/></button><button className={isRecording?"capture-button recording":"capture-button"} onClick={captureOrStopRecording}>{isRecording?"■":"●"}</button><button className="camera-next" onClick={()=>{if(isRecording) mediaRecorderRef.current?.stop(); else {closeCamera();setUploadOpen(true);}}}>Next</button></footer>
      <nav className="camera-tabs"><button onClick={()=>{closeCamera();setActiveView("live");}}>LIVE</button><button className="active">CAMERA</button><button onClick={()=>{closeCamera();setCreateOpen(true);}}>CREATE</button></nav>
    </div>}
    {createOpen && <div className="create-screen"><header className="create-header"><button onClick={()=>setCreateOpen(false)}><X size={30}/></button><h1>CREATE</h1><span/></header><div className="create-tools"><button onClick={()=>setFeedNotice("Photo editor is coming soon.")}>◩<span>Photo editor</span></button><button onClick={()=>setFeedNotice("AutoCut is coming soon.")}>◧<span>AutoCut</span></button><button onClick={()=>setFeedNotice("Automatic captions are coming soon.")}>▤<span>Captions</span></button><button onClick={()=>setFeedNotice("AI Self is coming soon.")}>AI<span>AI Self</span></button><button onClick={()=>setFeedNotice("Cutout is coming soon.")}>▧<span>Cutout</span></button></div><div className="create-actions"><button className="new-video-tile" onClick={()=>{setCreateOpen(false);setUploadOpen(true);}}><strong>＋</strong><span>New video</span></button><button className="drafts-tile" onClick={()=>setFeedNotice("Your saved drafts will appear here.")}>▣<span>Drafts</span></button></div><div className="templates-heading"><h2>Templates</h2><button onClick={()=>setFeedNotice("Template search is coming soon.")}><Search/></button></div><div className="template-tabs"><button className="active">For You</button><button>Viral Song</button><button>Trendy</button><button>AI</button><button>Monthly</button></div><div className="template-placeholder"><div>✨<strong>Creative templates</strong><span>Choose New video to upload and edit a clip</span></div><div>🎬<strong>Trending transitions</strong><span>More templates coming soon</span></div></div><nav className="camera-tabs"><button onClick={()=>{setCreateOpen(false);setActiveView("live");}}>LIVE</button><button onClick={()=>{setCreateOpen(false);void openCamera();}}>CAMERA</button><button className="active">CREATE</button></nav></div>}
    {activeLiveRoom && <LiveRoom roomName={activeLiveRoom.roomName} isHost={activeLiveRoom.isHost} onLeave={() => setActiveLiveRoom(null)} />}
    {commentsOpen && <div className="modal-backdrop" onClick={() => setCommentsOpen(false)}><div className="upload-modal comments-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setCommentsOpen(false)}><X/></button><h2>Comments</h2><div className="comment-list">{(commentItems[safeActive] ?? []).length ? (commentItems[safeActive] ?? []).map((item, i) => <p className="comment-item" key={i}>{item}</p>) : <p>No comments yet. Be the first to comment!</p>}</div><form className="comment-form" onSubmit={async e => { e.preventDefault(); const value = commentDraft.trim(); if (!value) return; const target = video as any; if (!currentUserId || !supabase) { setCommentsOpen(false); setAuthMode("login"); setAuthMessage("Log in to comment."); setAuthOpen(true); return; } if (!target?.id) { setCommentItems(old => ({ ...old, [safeActive]: [...(old[safeActive] ?? []), value] })); setCommentDraft(""); return; } const { error } = await supabase!.from("comments").insert({video_id:target.id,user_id:currentUserId,body:value}); if (error) { setFeedNotice(error.message); return; } setCommentItems(old => ({ ...old, [safeActive]: [...(old[safeActive] ?? []), value] })); setCommentDraft(""); }}><input value={commentDraft} onChange={e => setCommentDraft(e.target.value)} placeholder="Add a comment..." maxLength={300}/><button className="signup-button" type="submit" disabled={!commentDraft.trim()}>Post</button></form><p className="auth-hint">Comments currently appear in this browser only. Database syncing is the next step.</p></div></div>}
  </main>;
}
