import { NextResponse } from "next/server";
import {
  getTransactions,
  getGroupWeights,
  getCaps,
  getSectors,
} from "@/lib/repo";
import { positionsFromTx } from "@/lib/holdings";
import { compositeScores, type Criterion } from "@/lib/scoring";
import { recommendAllocation } from "@/lib/allocation";
import { prisma } from "@/lib/db";

export async function GET() {
  const txs = await getTransactions();
  const positions = positionsFromTx(txs);
  const tickers = positions.map((p) => p.ticker);

  // ambil skor kriteria manual/fetched dari CriterionScore (fallback netral 50)
  const rows = await prisma.criterionScore.findMany({
    where: { ticker: { in: tickers } },
  });
  const criteria: Criterion[] = [];
  const seen = new Set<string>();
  const raw: Record<string, Record<string, number>> = {};
  for (const t of tickers) raw[t] = {};
  for (const r of rows) {
    raw[r.ticker][r.key] = r.rawValue;
    const id = `${r.group}:${r.key}`;
    if (!seen.has(id)) {
      criteria.push({ key: r.key, group: r.group, direction: "benefit" });
      seen.add(id);
    }
  }
  // isi kriteria yang hilang dgn 50 agar tidak NaN
  for (const t of tickers) for (const c of criteria) raw[t][c.key] ??= 50;

  const scores = criteria.length
    ? compositeScores({ criteria, raw, groupWeights: await getGroupWeights() })
    : Object.fromEntries(tickers.map((t) => [t, 50]));

  const rec = recommendAllocation({
    scores,
    sectors: await getSectors(),
    caps: await getCaps(),
    aggressiveness: 1,
  });

  return NextResponse.json({ scores, ...rec });
}
