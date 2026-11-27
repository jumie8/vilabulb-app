import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, SafeAreaView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, Session } from "@supabase/supabase-js";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
}) : null;

type Video = { id: string; caption: string | null; video_url: string; user_id: string; created_at: string };
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) { setMessage("Add the Supabase mobile environment variables to start."); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    supabase.from("videos").select("id,caption,video_url,user_id,created_at").eq("status","published").eq("visibility","public").order("created_at",{ascending:false}).limit(30)
      .then(({data,error}) => { if (error) setMessage(error.message); else setVideos(data || []); });
  }, [session]);

  async function signIn() {
    if (!supabase) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setMessage(error?.message || "Welcome to VILABULB."); setBusy(false);
  }

  if (!supabase) return <Shell><Text style={styles.heading}>VILABULB</Text><Text style={styles.muted}>Mobile app starter is ready. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env to connect it to your account system.</Text></Shell>;
  if (!session) return <Shell><Text style={styles.heading}>VILABULB</Text><Text style={styles.muted}>Make your moment shine</Text><TextInput placeholder="Email address" placeholderTextColor="#9b8da8" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input}/><TextInput placeholder="Password" placeholderTextColor="#9b8da8" secureTextEntry value={password} onChangeText={setPassword} style={styles.input}/><TouchableOpacity style={styles.button} onPress={signIn} disabled={busy}><Text style={styles.buttonText}>{busy?"Please wait…":"Log in"}</Text></TouchableOpacity><Text style={styles.muted}>{message}</Text></Shell>;

  return <SafeAreaView style={styles.screen}><ExpoStatusBar style="light"/><StatusBar barStyle="light-content"/><View style={styles.header}><Text style={styles.heading}>VILABULB</Text><TouchableOpacity onPress={()=>supabase.auth.signOut()}><Text style={styles.link}>Log out</Text></TouchableOpacity></View><FlatList data={videos} keyExtractor={item=>item.id} contentContainerStyle={{padding:16}} renderItem={({item})=><View style={styles.videoCard}><View style={styles.videoPlaceholder}><Text style={{fontSize:38}}>▶</Text><Text style={styles.muted}>Video player integration next</Text></View><Text style={styles.caption}>{item.caption || "A new VILABULB video"}</Text><Text style={styles.muted}>Creator · {new Date(item.created_at).toLocaleDateString()}</Text></View>} ListEmptyComponent={<Text style={styles.muted}>No public videos yet. Be the first to post!</Text>}/></SafeAreaView>;
}
function Shell({children}:{children:React.ReactNode}) { return <SafeAreaView style={styles.screen}><ExpoStatusBar style="light"/><View style={{padding:24,gap:16,flex:1,justifyContent:"center"}}>{children}</View></SafeAreaView>; }
const styles = {
  screen:{flex:1,backgroundColor:"#0b0715"}, header:{padding:20,flexDirection:"row" as const,justifyContent:"space-between",alignItems:"center"}, heading:{fontSize:30,fontWeight:"900" as const,color:"#fff"}, muted:{color:"#b9a9c7",lineHeight:22}, input:{backgroundColor:"#21172d",borderWidth:1,borderColor:"#58346f",borderRadius:12,padding:15,color:"#fff"}, button:{backgroundColor:"#c52dc1",padding:16,borderRadius:12,alignItems:"center" as const}, buttonText:{color:"#fff",fontWeight:"800" as const}, link:{color:"#ed8be8",fontWeight:"700" as const}, videoCard:{backgroundColor:"#1a1224",padding:12,borderRadius:16,marginBottom:16,gap:8}, videoPlaceholder:{height:360,backgroundColor:"#281a39",borderRadius:12,alignItems:"center" as const,justifyContent:"center" as const,gap:8}, caption:{color:"#fff",fontWeight:"700" as const}
};
