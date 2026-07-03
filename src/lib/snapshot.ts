import { AI_CRITERIA, type AiAnalysis } from "./ai/types";

export function criterionScoresFromAnalysis(
  ticker: string,
  quarter: string,
  a: AiAnalysis,
): Array<{
  ticker: string;
  quarter: string;
  group: "moat";
  key: string;
  rawValue: number;
  manual: false;
}> {
  return AI_CRITERIA.map((key) => ({
    ticker,
    quarter,
    group: "moat" as const,
    key,
    rawValue: a.criteria[key].score,
    manual: false as const,
  }));
}

export function buildSnapshotEntries(
  scores: Record<string, number>,
  allocation: Record<string, number>,
  breakdowns: Record<string, unknown>,
): Array<{ ticker: string; compositeScore: number; allocationPct: number; breakdown: unknown }> {
  return Object.keys(allocation).map((ticker) => ({
    ticker,
    compositeScore: scores[ticker] ?? 0,
    allocationPct: allocation[ticker],
    breakdown: breakdowns[ticker] ?? {},
  }));
}
