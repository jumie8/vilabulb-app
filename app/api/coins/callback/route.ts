import { NextRequest, NextResponse } from "next/server";
import { verifyAndCreditFlutterwavePayment } from "@/lib/server/flutterwave";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const txRef = params.get("tx_ref");
  const transactionId = params.get("transaction_id");
  const destination = new URL("/?view=settings", request.nextUrl.origin);

  if (status !== "successful" || !txRef || !transactionId) {
    destination.searchParams.set("payment", "not-completed");
    if (txRef) destination.searchParams.set("tx_ref", txRef);
    return NextResponse.redirect(destination);
  }

  try {
    const result = await verifyAndCreditFlutterwavePayment(transactionId, txRef);
    destination.searchParams.set("payment", "success");
    destination.searchParams.set("coins", String(result.coins));
  } catch {
    destination.searchParams.set("payment", "pending");
  }
  return NextResponse.redirect(destination);
}
