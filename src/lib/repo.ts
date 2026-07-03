import { prisma } from "./db";
import type { Tx } from "./types";
import type { GroupWeights } from "./scoring";
import type { Caps } from "./allocation";
import type { AiLanguageSetting } from "./language";
import type { AiAnalysis } from "./ai/types";

export async function getTransactions(): Promise<Tx[]> {
  const rows = await prisma.transaction.findMany();
  return rows.map((r) => ({ ticker: r.ticker, qty: r.qty, price: r.price }));
}

export async function addTransaction(t: Tx & { date: string }): Promise<void> {
  await prisma.company.upsert({
    where: { ticker: t.ticker },
    update: {},
    create: { ticker: t.ticker, name: t.ticker },
  });
  await prisma.transaction.create({
    data: { ticker: t.ticker, qty: t.qty, price: t.price, date: new Date(t.date) },
  });
}

export async function getGroupWeights(): Promise<GroupWeights> {
  const s = await prisma.setting.findUnique({ where: { key: "saw_weights" } });
  if (s) return JSON.parse(s.value);
  return { fundamental: 35, moat: 30, technical: 15, diversification: 20 };
}

export async function getCaps(): Promise<Caps> {
  const s = await prisma.setting.findUnique({ where: { key: "caps" } });
  if (s) return JSON.parse(s.value);
  return { perStock: 25, perSector: {} };
}

export async function getAiLanguage(): Promise<AiLanguageSetting> {
  const s = await prisma.setting.findUnique({ where: { key: "ai_language" } });
  const v = s?.value;
  return v === "en" || v === "id" || v === "follow_ui" ? v : "follow_ui";
}

export async function getSectors(): Promise<Record<string, string>> {
  const rows = await prisma.company.findMany({ include: { sector: true } });
  const out: Record<string, string> = {};
  for (const r of rows) out[r.ticker] = r.sector?.name ?? "unknown";
  return out;
}

export async function saveCriterionScores(
  rows: Array<{
    ticker: string;
    quarter: string;
    group: string;
    key: string;
    rawValue: number;
    manual: boolean;
  }>,
): Promise<void> {
  for (const r of rows) {
    const where = {
      ticker_quarter_group_key: {
        ticker: r.ticker,
        quarter: r.quarter,
        group: r.group,
        key: r.key,
      },
    };
    const existing = await prisma.criterionScore.findUnique({ where });
    if (existing?.manual) continue; // jangan timpa override manual
    await prisma.criterionScore.upsert({
      where,
      update: { rawValue: r.rawValue, manual: r.manual },
      create: r,
    });
  }
}

export async function saveAiAnalysis(a: {
  ticker: string;
  quarter: string;
  analysis: AiAnalysis;
  provider: string;
  model: string;
  language: string;
}): Promise<void> {
  const data = {
    ticker: a.ticker,
    quarter: a.quarter,
    criteria: a.analysis.criteria as any,
    decision: a.analysis.decision,
    reason: a.analysis.reason,
    keyRisks: a.analysis.keyRisks as any,
    confidence: a.analysis.confidence,
    provider: a.provider,
    model: a.model,
    language: a.language,
  };
  await prisma.aiAnalysis.upsert({
    where: { ticker_quarter: { ticker: a.ticker, quarter: a.quarter } },
    update: data,
    create: data,
  });
}

export async function saveSnapshot(
  quarter: string,
  activeCaps: string[],
  entries: Array<{
    ticker: string;
    compositeScore: number;
    allocationPct: number;
    breakdown: unknown;
  }>,
): Promise<void> {
  await prisma.quarterlySnapshot.deleteMany({ where: { quarter } }); // overwrite
  await prisma.quarterlySnapshot.create({
    data: {
      quarter,
      activeCaps: activeCaps as any,
      entries: { create: entries.map((e) => ({ ...e, breakdown: e.breakdown as any })) },
    },
  });
}

export async function getSnapshot(quarter: string) {
  return prisma.quarterlySnapshot.findUnique({ where: { quarter }, include: { entries: true } });
}

export async function listQuarters(): Promise<string[]> {
  const rows = await prisma.quarterlySnapshot.findMany({
    orderBy: { quarter: "desc" },
    select: { quarter: true },
  });
  return rows.map((r) => r.quarter);
}

export async function getAiAnalysis(ticker: string, quarter: string) {
  return prisma.aiAnalysis.findUnique({ where: { ticker_quarter: { ticker, quarter } } });
}
