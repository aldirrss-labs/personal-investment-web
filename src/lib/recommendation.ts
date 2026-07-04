import { getTransactions, getGroupWeights, getCaps, getSectors } from "./repo";
import { positionsFromTx } from "./holdings";
import { compositeScores, type Criterion } from "./scoring";
import { recommendAllocation } from "./allocation";
import { prisma } from "./db";

export async function getCurrentAllocation(): Promise<{
  scores: Record<string, number>;
  allocation: Record<string, number>;
  activeCaps: string[];
}> {
  const txs = await getTransactions();
  const positions = positionsFromTx(txs);
  const tickers = positions.map((p) => p.ticker);

  const rows = await prisma.criterionScore.findMany({ where: { ticker: { in: tickers } } });
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

  return { scores, ...rec };
}
