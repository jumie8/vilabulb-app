export const COINS_PER_NAIRA = 0.1;
export const NAIRA_PER_COIN = 10;
export const MIN_COIN_PURCHASE = 10;
export const MAX_COIN_PURCHASE = 600_000;
export const COIN_PURCHASE_STEP = 10;

export function getCoinPurchase(coins: unknown) {
  const count = Number(coins);
  if (!Number.isSafeInteger(count) || count < MIN_COIN_PURCHASE || count > MAX_COIN_PURCHASE || count % COIN_PURCHASE_STEP !== 0) return null;
  return { coins: count, amount: count * NAIRA_PER_COIN };
}
