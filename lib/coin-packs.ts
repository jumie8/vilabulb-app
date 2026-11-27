// Initial NGN price proposal. Confirm these prices before enabling live payments.
export const COIN_PACKS = [
  { id: "starter", label: "Starter", coins: 100, amount: 500 },
  { id: "popular", label: "Popular", coins: 500, amount: 2000 },
  { id: "creator", label: "Creator", coins: 1000, amount: 3500 }
] as const;

export type CoinPackId = (typeof COIN_PACKS)[number]["id"];
export function getCoinPack(id: unknown) {
  return COIN_PACKS.find((pack) => pack.id === id) ?? null;
}
