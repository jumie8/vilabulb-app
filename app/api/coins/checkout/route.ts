import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { getCoinPurchase } from "@/lib/coin-packs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const secret = process.env.FLW_SECRET_KEY;
    if (!url || !anon || !service || !secret) {
      return NextResponse.json({ error: "Flutterwave is not configured yet. Add the server environment variables." }, { status: 503 });
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

    const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    if (authError || !authData.user?.email) return NextResponse.json({ error: "Your login session is invalid." }, { status: 401 });

    const body = await request.json();
    const purchase = getCoinPurchase(body?.coins);
    if (!purchase) return NextResponse.json({ error: "Choose between 10 and 600,000 coins, in steps of 10." }, { status: 400 });

    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const txRef = `VILA-${randomUUID()}`;
    const { error: insertError } = await db.from("coin_payment_orders").insert({
      user_id: authData.user.id,
      tx_ref: txRef,
      package_id: "custom",
      amount: purchase.amount,
      currency: "NGN",
      coins: purchase.coins,
      status: "pending"
    });
    if (insertError) throw insertError;

    const origin = request.nextUrl.origin;
    const flwResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: purchase.amount,
        currency: "NGN",
        redirect_url: `${origin}/api/coins/callback`,
        customer: { email: authData.user.email, name: String(authData.user.user_metadata?.display_name || authData.user.email) },
        customizations: { title: "VILABULB Coins", description: `Purchase ${purchase.coins.toLocaleString()} VILABULB coins` },
        meta: { user_id: authData.user.id, coins: purchase.coins },
        session_duration: 30,
        max_retry_attempt: 3
      }),
      cache: "no-store"
    });
    const flw = await flwResponse.json();
    const checkoutLink = flw?.data?.link;
    if (!flwResponse.ok || flw?.status !== "success" || typeof checkoutLink !== "string") {
      await db.from("coin_payment_orders").update({ status: "failed", updated_at: new Date().toISOString() }).eq("tx_ref", txRef);
      return NextResponse.json({ error: "Flutterwave could not start checkout. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ checkoutUrl: checkoutLink, txRef, coins: purchase.coins, amount: purchase.amount, currency: "NGN" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start payment." }, { status: 500 });
  }
}
