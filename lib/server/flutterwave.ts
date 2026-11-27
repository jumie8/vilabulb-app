import { createClient } from "@supabase/supabase-js";

type VerifiedPayment = {
  id: number;
  tx_ref: string;
  status: string;
  amount: number;
  currency: string;
};

export async function verifyAndCreditFlutterwavePayment(transactionId: string | number, expectedReference?: string) {
  const secret = process.env.FLW_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !serviceKey) throw new Error("Payment verification is not configured on the server.");

  const response = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(transactionId))}/verify`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
    cache: "no-store"
  });
  const payload = await response.json();
  if (!response.ok || payload?.status !== "success" || !payload?.data) {
    throw new Error("Flutterwave could not verify this transaction.");
  }

  const payment = payload.data as VerifiedPayment;
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: order, error } = await db.from("coin_payment_orders")
    .select("id,tx_ref,user_id,amount,currency,coins,status")
    .eq("tx_ref", payment.tx_ref)
    .maybeSingle();

  if (error || !order) throw new Error("The payment reference does not match a VILABULB coin order.");
  if (expectedReference && expectedReference !== order.tx_ref) throw new Error("Payment reference mismatch.");
  if (payment.status !== "successful") throw new Error("Flutterwave has not marked this payment successful.");
  if (payment.tx_ref !== order.tx_ref || payment.currency !== order.currency ||
      Number(payment.amount) < Number(order.amount)) {
    throw new Error("The verified payment amount, currency or reference does not match this order.");
  }

  const { data: credited, error: creditError } = await db.rpc("complete_coin_purchase", {
    p_tx_ref: order.tx_ref,
    p_flutterwave_transaction_id: Number(payment.id)
  });
  if (creditError) throw new Error("Payment verified, but wallet credit needs attention: " + creditError.message);
  return { ok: true, alreadyCredited: Boolean(credited?.already_credited), coins: Number(order.coins), txRef: order.tx_ref };
}
