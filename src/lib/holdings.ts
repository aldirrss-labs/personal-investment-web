import type { Tx, Position } from "./types";

export function positionsFromTx(txs: Tx[]): Position[] {
  const map = new Map<string, { qty: number; costBasis: number }>();
  for (const t of txs) {
    const cur = map.get(t.ticker) ?? { qty: 0, costBasis: 0 };
    cur.qty += t.qty;
    cur.costBasis += t.qty * t.price;
    map.set(t.ticker, cur);
  }
  return Array.from(map.entries()).map(([ticker, v]) => ({
    ticker,
    qty: v.qty,
    costBasis: v.costBasis,
    avgCost: v.qty === 0 ? 0 : v.costBasis / v.qty,
  }));
}

export function marketValue(pos: Position, price: number): number {
  return pos.qty * price;
}

export function pnl(pos: Position, price: number): { abs: number; pct: number } {
  const abs = marketValue(pos, price) - pos.costBasis;
  const pct = pos.costBasis === 0 ? 0 : (abs / pos.costBasis) * 100;
  return { abs, pct };
}

export function actualAllocation(
  positions: Position[],
  prices: Record<string, number>,
): Record<string, number> {
  const values = positions.map((p) => ({
    t: p.ticker,
    v: marketValue(p, prices[p.ticker] ?? 0),
  }));
  const total = values.reduce((s, x) => s + x.v, 0);
  const out: Record<string, number> = {};
  for (const { t, v } of values) out[t] = total === 0 ? 0 : (v / total) * 100;
  return out;
}
