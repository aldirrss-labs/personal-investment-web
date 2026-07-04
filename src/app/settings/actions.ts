"use server";

import { revalidatePath } from "next/cache";
import {
  saveGroupWeights,
  saveCaps,
  saveAiLanguage,
  saveAiModels,
  saveProviderOrder,
  assignSector,
  getCompaniesWithSector,
} from "@/lib/repo";
import { validateWeights, clampCap, sanitizeSectorCaps } from "@/lib/settings";
import { fetchProfile, getFmpKeys } from "@/lib/fmp";
import { createKeyPool } from "@/lib/keypool";
import { listGeminiModels, listGroqModels, listOpenRouterModels } from "@/lib/ai/models";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function saveSettings(input: {
  weights: Record<string, unknown>;
  perStock: unknown;
  sectorCaps: Record<string, unknown>;
  aiLanguage: "follow_ui" | "en" | "id";
  models: { gemini?: string; groq?: string; openrouter?: string };
  providerOrder: string[];
}): Promise<{ ok: true }> {
  await saveGroupWeights(validateWeights(input.weights));
  await saveCaps({ perStock: clampCap(input.perStock), perSector: sanitizeSectorCaps(input.sectorCaps) });
  await saveAiLanguage(input.aiLanguage);
  await saveAiModels(input.models);
  await saveProviderOrder(input.providerOrder);
  revalidatePath("/settings");
  return { ok: true };
}

export async function fetchAllSectors(): Promise<Array<{ ticker: string; sector: string | null }>> {
  const companies = await getCompaniesWithSector();
  const keys = getFmpKeys();
  const pool = keys.length ? createKeyPool(keys) : null;
  if (pool) {
    for (let i = 0; i < companies.length; i++) {
      if (i > 0) await sleep(1200);
      try {
        const p = await fetchProfile(companies[i].ticker, undefined, pool.next());
        if (p.industry) await assignSector(companies[i].ticker, p.industry);
      } catch {
        /* lewati; bisa diisi manual */
      }
    }
  }
  revalidatePath("/settings");
  return getCompaniesWithSector();
}

export async function refreshModels(): Promise<{
  gemini: string[];
  groq: string[];
  openrouter: string[];
}> {
  const gk = (process.env.GEMINI_API_KEYS ?? "").split(",")[0]?.trim();
  const qk = (process.env.GROQ_API_KEYS ?? "").split(",")[0]?.trim();
  const [gemini, groq, openrouter] = await Promise.all([
    gk ? listGeminiModels(gk).catch(() => []) : Promise.resolve([]),
    qk ? listGroqModels(qk).catch(() => []) : Promise.resolve([]),
    listOpenRouterModels().catch(() => []),
  ]);
  return { gemini, groq, openrouter };
}
