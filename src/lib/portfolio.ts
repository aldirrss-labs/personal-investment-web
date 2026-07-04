import type { Position } from "./types";

export type SummaryRow = {
  ticker: string;
  qty: number;
  avgCost: number;
  price: number;
  value: number;
  pnlAbs: number;
  pnlPct: number;
  hasPrice: boolean;
};

export function portfolioSummary(
  positions: Position[],
  prices: Record<string, number>,
): { totalValue: number; totalCost: number; pnlAbs: number; pnlPct: number; rows: SummaryRow[] } {
  const rows: SummaryRow[] = positions.map((p) => {
    const hasPrice = Object.prototype.hasOwnProperty.call(prices, p.ticker);
    const price = prices[p.ticker] ?? 0;
    const value = p.qty * price;
    const pnlAbs = value - p.costBasis;
    const pnlPct = p.costBasis === 0 ? 0 : (pnlAbs / p.costBasis) * 100;
    return {
      ticker: p.ticker,
      qty: p.qty,
      avgCost: p.avgCost,
      price,
      value,
      pnlAbs,
      pnlPct,
      hasPrice,
    };
  });

  // Agregat hanya dihitung dari posisi yang punya harga — posisi tanpa harga
  // tidak boleh terlihat seolah "rugi 100%" dan menyeret PnL total ke bawah.
  const pricedTickers = new Set(rows.filter((r) => r.hasPrice).map((r) => r.ticker));
  const totalValue = rows.filter((r) => r.hasPrice).reduce((s, r) => s + r.value, 0);
  const totalCost = positions
    .filter((p) => pricedTickers.has(p.ticker))
    .reduce((s, p) => s + p.costBasis, 0);
  const pnlAbs = totalValue - totalCost;
  const pnlPct = totalCost === 0 ? 0 : (pnlAbs / totalCost) * 100;
  return { totalValue, totalCost, pnlAbs, pnlPct, rows };
}

export function donutData(rows: SummaryRow[]): Array<{ name: string; value: number }> {
  return rows.map((r) => ({ name: r.ticker, value: r.value }));
}
