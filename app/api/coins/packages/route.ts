import { NextResponse } from "next/server";
import { COIN_PACKS } from "@/lib/coin-packs";

export async function GET() {
  return NextResponse.json({ currency: "NGN", packages: COIN_PACKS });
}
