export type DcaSuggestion = {
  ticker: string;
  allocationPct: number;
  suggestedUsd: number;
  suggestedQty: number;
  price: number;
};

export function suggestDcaAmounts(
  budgetUsd: number,
  allocation: Record<string, number>,
  prices: Record<string, number>,
): DcaSuggestion[] {
  return Object.entries(allocation).map(([ticker, allocationPct]) => {
    const price = prices[ticker] ?? 0;
    const suggestedUsd = budgetUsd * (allocationPct / 100);
    const suggestedQty = price > 0 ? suggestedUsd / price : 0;
    return { ticker, allocationPct, suggestedUsd, suggestedQty, price };
  });
}
