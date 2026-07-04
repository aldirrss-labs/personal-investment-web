export type FundamentalSet = {
  revenueGrowth: number;
  netMargin: number;
  roe: number;
  debtToEquity: number;
  pe: number;
};

const BASE = "https://financialmodelingprep.com/stable";

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

export async function fetchFundamentals(
  ticker: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FundamentalSet> {
  const key = process.env.FMP_API_KEY ?? "";
  const q = `symbol=${ticker}&apikey=${key}`;
  const [growth, ratios, metrics] = await Promise.all([
    getJson(`${BASE}/financial-growth?${q}&limit=1`, fetchImpl),
    getJson(`${BASE}/ratios-ttm?${q}`, fetchImpl),
    getJson(`${BASE}/key-metrics-ttm?${q}`, fetchImpl),
  ]);
  return mapFundamentals(first(growth), first(ratios), first(metrics));
}
