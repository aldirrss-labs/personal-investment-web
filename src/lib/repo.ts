import { prisma } from "./db";
import type { Tx } from "./types";
import type { GroupWeights } from "./scoring";
import type { Caps } from "./allocation";
import type { AiLanguageSetting } from "./language";
import type { AiAnalysis } from "./ai/types";
import type { Weights } from "./settings";

async function putSetting(key: string, value: unknown): Promise<void> {
  const v = JSON.stringify(value);
  await prisma.setting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
}

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
  if (!s) return "follow_ui";
  let v: unknown;
  try {
    v = JSON.parse(s.value);
  } catch {
    v = s.value;
  }
  return v === "en" || v === "id" || v === "follow_ui" ? v : "follow_ui";
}

export async function saveGroupWeights(w: Weights): Promise<void> {
  await putSetting("saw_weights", w);
}

export async function saveCaps(caps: {
  perStock: number;
  perSector: Record<string, number>;
}): Promise<void> {
  await putSetting("caps", caps);
}

export async function saveAiLanguage(v: "follow_ui" | "en" | "id"): Promise<void> {
  await putSetting("ai_language", v);
}

export async function saveAiModels(m: {
  gemini?: string;
  groq?: string;
  openrouter?: string;
}): Promise<void> {
  await putSetting("ai_models", m);
}

export async function saveProviderOrder(order: string[]): Promise<void> {
  await putSetting("ai_provider_order", order);
}

export async function getAiModels(): Promise<{
  gemini?: string;
  groq?: string;
  openrouter?: string;
}> {
  const s = await prisma.setting.findUnique({ where: { key: "ai_models" } });
  return s ? JSON.parse(s.value) : {};
}

export async function getProviderOrder(): Promise<string[] | null> {
  const s = await prisma.setting.findUnique({ where: { key: "ai_provider_order" } });
  return s ? JSON.parse(s.value) : null;
}

export async function assignSector(ticker: string, sectorName: string): Promise<void> {
  const name = sectorName.trim();
  if (!name) return;
  const sector = await prisma.sector.upsert({ where: { name }, update: {}, create: { name } });
  await prisma.company.update({ where: { ticker }, data: { sectorId: sector.id } });
}

export async function getCompaniesWithSector(): Promise<
  Array<{ ticker: string; sector: string | null }>
> {
  const rows = await prisma.company.findMany({
    include: { sector: true },
    orderBy: { ticker: "asc" },
  });
  return rows.map((r) => ({ ticker: r.ticker, sector: r.sector?.name ?? null }));
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

export async function savePrices(prices: Record<string, number>): Promise<void> {
  for (const [ticker, price] of Object.entries(prices)) {
    await prisma.priceCache.upsert({
      where: { ticker },
      update: { price },
      create: { ticker, price },
    });
  }
}

export async function getCachedPrices(tickers: string[]): Promise<Record<string, number>> {
  const rows = await prisma.priceCache.findMany({ where: { ticker: { in: tickers } } });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.ticker] = r.price;
  return out;
}

export async function getAllSnapshotsWithEntries(): Promise<
  Array<{
    quarter: string;
    entries: Array<{ ticker: string; compositeScore: number; allocationPct: number }>;
  }>
> {
  const snaps = await prisma.quarterlySnapshot.findMany({
    orderBy: { quarter: "asc" },
    include: { entries: true },
  });
  return snaps.map((s) => ({
    quarter: s.quarter,
    entries: s.entries.map((e) => ({
      ticker: e.ticker,
      compositeScore: e.compositeScore,
      allocationPct: e.allocationPct,
    })),
  }));
}

export async function getAllAiAnalyses(): Promise<
  Array<{ ticker: string; quarter: string; decision: string; criteria: unknown }>
> {
  const rows = await prisma.aiAnalysis.findMany({
    select: { ticker: true, quarter: true, decision: true, criteria: true },
  });
  return rows;
}

export async function getAllTransactions(): Promise<
  Array<{ id: string; ticker: string; qty: number; price: number; date: Date }>
> {
  const rows = await prisma.transaction.findMany({ orderBy: { date: "desc" } });
  return rows.map((r) => ({ id: r.id, ticker: r.ticker, qty: r.qty, price: r.price, date: r.date }));
}

export async function deleteTransaction(id: string): Promise<void> {
  await prisma.transaction.delete({ where: { id } });
}

export async function addTransactions(
  rows: Array<{ ticker: string; qty: number; price: number; date: Date }>,
): Promise<void> {
  for (const r of rows) {
    await prisma.company.upsert({
      where: { ticker: r.ticker },
      update: {},
      create: { ticker: r.ticker, name: r.ticker },
    });
    await prisma.transaction.create({ data: r });
  }
}
