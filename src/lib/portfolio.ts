import type { Position } from "./types";

export type SummaryRow = {
  ticker: string;
  qty: number;
  avgCost: number;
  price: number;
  value: number;
  pnlAbs: number;
  pnlPct: number;
};

export function portfolioSummary(
  positions: Position[],
  prices: Record<string, number>,
): { totalValue: number; totalCost: number; pnlAbs: number; pnlPct: number; rows: SummaryRow[] } {
  const rows: SummaryRow[] = positions.map((p) => {
    const price = prices[p.ticker] ?? 0;
    const value = p.qty * price;
    const pnlAbs = value - p.costBasis;
    const pnlPct = p.costBasis === 0 ? 0 : (pnlAbs / p.costBasis) * 100;
    return { ticker: p.ticker, qty: p.qty, avgCost: p.avgCost, price, value, pnlAbs, pnlPct };
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalCost = positions.reduce((s, p) => s + p.costBasis, 0);
  const pnlAbs = totalValue - totalCost;
  const pnlPct = totalCost === 0 ? 0 : (pnlAbs / totalCost) * 100;
  return { totalValue, totalCost, pnlAbs, pnlPct, rows };
}

export function donutData(rows: SummaryRow[]): Array<{ name: string; value: number }> {
  return rows.map((r) => ({ name: r.ticker, value: r.value }));
}
