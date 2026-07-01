export type FundamentalSet = {
  revenueGrowth: number;
  netMargin: number;
  roe: number;
  debtToEquity: number;
  pe: number;
};

export function mapProfileMetrics(raw: any): FundamentalSet {
  return {
    revenueGrowth: (raw.revenueGrowth ?? 0) * 100,
    netMargin: (raw.netProfitMargin ?? 0) * 100,
    roe: (raw.roe ?? 0) * 100,
    debtToEquity: raw.debtToEquity ?? 0,
    pe: raw.peRatio ?? 0,
  };
}

export async function fetchFundamentals(
  ticker: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FundamentalSet> {
  const key = process.env.FMP_API_KEY ?? "";
  const url = `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}?apikey=${key}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`FMP ${res.status}`);
  const json = (await res.json()) as any[];
  if (!Array.isArray(json) || json.length === 0) throw new Error("FMP empty");
  return mapProfileMetrics(json[0]);
}
