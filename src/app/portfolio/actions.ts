"use server";

import { revalidatePath } from "next/cache";
import {
  getCachedPrices,
  deleteTransaction,
  addTransactions,
} from "@/lib/repo";
import { getCurrentAllocation } from "@/lib/recommendation";
import { suggestDcaAmounts, type DcaSuggestion } from "@/lib/dca";
import { parseWibDatetimeLocal } from "@/lib/wib";

export async function previewDca(budgetUsd: number): Promise<DcaSuggestion[]> {
  const { allocation } = await getCurrentAllocation();
  const tickers = Object.keys(allocation);
  const prices = await getCachedPrices(tickers);
  return suggestDcaAmounts(budgetUsd, allocation, prices);
}

export async function confirmDca(
  rows: Array<{ ticker: string; qty: number; price: number; datetimeLocal: string }>,
): Promise<{ ok: true }> {
  const toSave = rows
    .filter((r) => r.qty > 0)
    .map((r) => ({
      ticker: r.ticker,
      qty: r.qty,
      price: r.price,
      date: parseWibDatetimeLocal(r.datetimeLocal),
    }));
  await addTransactions(toSave);
  revalidatePath("/portfolio");
  revalidatePath("/");
  return { ok: true };
}

export async function removeTransaction(id: string): Promise<{ ok: true }> {
  await deleteTransaction(id);
  revalidatePath("/portfolio");
  revalidatePath("/");
  return { ok: true };
}
