import { prisma } from "./db";
import type { Tx } from "./types";
import type { GroupWeights } from "./scoring";
import type { Caps } from "./allocation";

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

export async function getSectors(): Promise<Record<string, string>> {
  const rows = await prisma.company.findMany({ include: { sector: true } });
  const out: Record<string, string> = {};
  for (const r of rows) out[r.ticker] = r.sector?.name ?? "unknown";
  return out;
}
