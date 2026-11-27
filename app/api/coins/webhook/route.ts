import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { verifyAndCreditFlutterwavePayment } from "@/lib/server/flutterwave";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = request.headers.get("verif-hash") || "";
  if (!secretHash || !signature || !safeEqual(signature, secretHash)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const event = body?.event;
    const transactionId = body?.data?.id;
    if (event === "charge.completed" && transactionId) {
      // Verify with Flutterwave's API before crediting. Webhook payload alone is never trusted.
      await verifyAndCreditFlutterwavePayment(transactionId);
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    // A non-200 response allows Flutterwave to retry delivery.
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
