export type ComparisonCell = {
  quarter: string;
  compositeScore: number;
  allocationPct: number;
  decision?: string;
  moatLabel?: string;
};

export type SnapshotInput = {
  quarter: string;
  entries: Array<{ ticker: string; compositeScore: number; allocationPct: number }>;
};

export type AnalysisInput = { ticker: string; quarter: string; decision: string; criteria: unknown };

function moatLabelFrom(criteria: unknown): string | undefined {
  const c = criteria as { moat?: { label?: string } } | undefined;
  return c?.moat?.label;
}

export function buildComparisonRows(
  snapshots: SnapshotInput[],
  analyses: AnalysisInput[],
): Record<string, ComparisonCell[]> {
  const sorted = [...snapshots].sort((a, b) => a.quarter.localeCompare(b.quarter));
  const analysisByKey = new Map<string, AnalysisInput>();
  for (const a of analyses) analysisByKey.set(`${a.ticker}|${a.quarter}`, a);

  const rows: Record<string, ComparisonCell[]> = {};
  for (const snap of sorted) {
    for (const e of snap.entries) {
      const a = analysisByKey.get(`${e.ticker}|${snap.quarter}`);
      const cell: ComparisonCell = {
        quarter: snap.quarter,
        compositeScore: e.compositeScore,
        allocationPct: e.allocationPct,
        decision: a?.decision,
        moatLabel: moatLabelFrom(a?.criteria),
      };
      (rows[e.ticker] ??= []).push(cell);
    }
  }
  return rows;
}

export function topTickersByLatestAllocation(
  rows: Record<string, ComparisonCell[]>,
  n: number,
): string[] {
  return Object.entries(rows)
    .map(([ticker, cells]) => ({ ticker, latest: cells[cells.length - 1]?.allocationPct ?? 0 }))
    .sort((a, b) => b.latest - a.latest)
    .slice(0, n)
    .map((r) => r.ticker);
}

export function chartSeries(
  rows: Record<string, ComparisonCell[]>,
  tickers: string[],
): Array<Record<string, number | string>> {
  const quarters = Array.from(
    new Set(tickers.flatMap((t) => (rows[t] ?? []).map((c) => c.quarter))),
  ).sort((a, b) => a.localeCompare(b));

  return quarters.map((quarter) => {
    const point: Record<string, number | string> = { quarter };
    for (const t of tickers) {
      const cell = (rows[t] ?? []).find((c) => c.quarter === quarter);
      if (cell) point[t] = cell.compositeScore;
    }
    return point;
  });
}
