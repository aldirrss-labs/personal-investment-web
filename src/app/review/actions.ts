"use server";

import { prisma } from "@/lib/db";
import {
  getTransactions,
  getGroupWeights,
  getCaps,
  getSectors,
  getAiLanguage,
  saveCriterionScores,
  saveAiAnalysis,
  saveSnapshot,
} from "@/lib/repo";
import { positionsFromTx } from "@/lib/holdings";
import { compositeScores, type Criterion } from "@/lib/scoring";
import { recommendAllocation } from "@/lib/allocation";
import { fetchFundamentals, getFmpKeys } from "@/lib/fmp";
import { createKeyPool } from "@/lib/keypool";
import { buildProvidersFromStore } from "@/lib/ai";
import { analyzeWithFallback } from "@/lib/ai/orchestrator";
import { criterionScoresFromAnalysis, buildSnapshotEntries } from "@/lib/snapshot";
import { currentQuarter } from "@/lib/quarter";
import { resolveAiLanguage } from "@/lib/language";
import { getUserLocale } from "@/i18n/locale-actions";
import { revalidatePath } from "next/cache";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Jeda antar-saham untuk menghindari rate-limit borongan FMP free tier.
const THROTTLE_MS = 1200;

export async function runReview(
  quarterOverride?: string,
): Promise<{ quarter: string; aiUnavailable: boolean }> {
  const now = new Date();
  const quarter =
    quarterOverride ?? currentQuarter({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const txs = await getTransactions();
  const positions = positionsFromTx(txs);
  const tickers = positions.map((p) => p.ticker);

  const providers = await buildProvidersFromStore();
  const language = resolveAiLanguage(await getAiLanguage(), await getUserLocale());
  let aiUnavailable = providers.length === 0;

  const fmpKeys = getFmpKeys();
  const fmpPool = fmpKeys.length ? createKeyPool(fmpKeys) : null;

  // AI per saham, sekuensial + jeda (anti rate-limit). Fundamental gagal -> mode degraded.
  for (let idx = 0; idx < tickers.length; idx++) {
    const t = tickers[idx];
    if (idx > 0) await sleep(THROTTLE_MS);

    let fundamentals;
    if (fmpPool) {
      try {
        fundamentals = await fetchFundamentals(t, undefined, fmpPool.next());
      } catch {
        fundamentals = undefined; // FMP gagal/limit -> AI tetap jalan kualitatif
      }
    }

    if (providers.length === 0) continue;
    const res = await analyzeWithFallback({ ticker: t, fundamentals, language }, providers);
    if (!res) {
      aiUnavailable = true;
      continue;
    }
    await saveCriterionScores(criterionScoresFromAnalysis(t, quarter, res.analysis));
    await saveAiAnalysis({
      ticker: t,
      quarter,
      analysis: res.analysis,
      provider: res.provider,
      model: res.model,
      language,
    });
  }

  // skor SAW dari CriterionScore (fallback netral 50)
  const rows = await prisma.criterionScore.findMany({
    where: { ticker: { in: tickers }, quarter },
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
  const entries = buildSnapshotEntries(scores, rec.allocation, raw);
  await saveSnapshot(quarter, rec.activeCaps, entries);

  revalidatePath("/review");
  return { quarter, aiUnavailable };
}
