import { NextResponse } from "next/server";
import { COIN_PURCHASE_STEP, MAX_COIN_PURCHASE, MIN_COIN_PURCHASE, NAIRA_PER_COIN } from "@/lib/coin-packs";

export async function GET() {
  return NextResponse.json({ currency: "NGN", minCoins: MIN_COIN_PURCHASE, maxCoins: MAX_COIN_PURCHASE, step: COIN_PURCHASE_STEP, nairaPerCoin: NAIRA_PER_COIN });
}
