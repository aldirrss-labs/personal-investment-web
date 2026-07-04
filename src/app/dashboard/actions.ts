"use server";
import { getTransactions, savePrices } from "@/lib/repo";
import { positionsFromTx } from "@/lib/holdings";
import { fetchQuotes, getFmpKeys } from "@/lib/fmp";
import { revalidatePath } from "next/cache";

export async function fetchAndCachePrices(): Promise<{ ok: boolean }> {
  const txs = await getTransactions();
  const tickers = positionsFromTx(txs).map((p) => p.ticker);
  const key = getFmpKeys()[0];
  if (!key || tickers.length === 0) return { ok: false };
  const prices = await fetchQuotes(tickers, undefined, key);
  await savePrices(prices);
  revalidatePath("/");
  return { ok: Object.keys(prices).length > 0 };
}
