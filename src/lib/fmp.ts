export type FundamentalSet = {
  revenueGrowth: number;
  netMargin: number;
  roe: number;
  debtToEquity: number;
  pe: number;
};

import { keysFromEnv } from "./keypool";

const BASE = "https://financialmodelingprep.com/stable";

/** Daftar API key FMP dari env: FMP_API_KEYS (plural) atau fallback FMP_API_KEY. */
export function getFmpKeys(): string[] {
  return keysFromEnv("FMP_API_KEYS", "FMP_API_KEY");
}

/**
 * Gabungkan respons 3 endpoint stable FMP menjadi FundamentalSet.
 * Rasio FMP dalam bentuk desimal (0.25 = 25%) → dikali 100 untuk persen.
 */
export function mapFundamentals(growth: any, ratios: any, metrics: any): FundamentalSet {
  return {
    revenueGrowth: (growth?.revenueGrowth ?? 0) * 100,
    netMargin: (ratios?.netProfitMarginTTM ?? 0) * 100,
    roe: (metrics?.returnOnEquityTTM ?? 0) * 100,
    debtToEquity: ratios?.debtToEquityRatioTTM ?? 0,
    pe: ratios?.priceToEarningsRatioTTM ?? 0,
  };
}

function first(json: unknown): any {
  return Array.isArray(json) ? json[0] : json;
}

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`FMP ${res.status}`);
  return res.json();
}

export async function fetchProfile(
  ticker: string,
  fetchImpl: typeof fetch = fetch,
  apiKey?: string,
): Promise<{ sector: string; industry: string }> {
  const key = apiKey ?? getFmpKeys()[0] ?? "";
  const res = await fetchImpl(`${BASE}/profile?symbol=${ticker}&apikey=${key}`);
  if (!res.ok) throw new Error(`FMP ${res.status}`);
  const json = (await res.json()) as any;
  const p = Array.isArray(json) ? json[0] : json;
  return { sector: p?.sector ?? "", industry: p?.industry ?? "" };
}

export async function fetchFundamentals(
  ticker: string,
  fetchImpl: typeof fetch = fetch,
  apiKey?: string,
): Promise<FundamentalSet> {
  const key = apiKey ?? getFmpKeys()[0] ?? "";
  const q = `symbol=${ticker}&apikey=${key}`;
  const [growth, ratios, metrics] = await Promise.all([
    getJson(`${BASE}/financial-growth?${q}&limit=1`, fetchImpl),
    getJson(`${BASE}/ratios-ttm?${q}`, fetchImpl),
    getJson(`${BASE}/key-metrics-ttm?${q}`, fetchImpl),
  ]);
  return mapFundamentals(first(growth), first(ratios), first(metrics));
}
