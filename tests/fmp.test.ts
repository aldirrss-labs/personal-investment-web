import { describe, expect, test, vi } from "vitest";
import { mapFundamentals, fetchFundamentals } from "@/lib/fmp";

describe("mapFundamentals", () => {
  test("map field stable FMP -> FundamentalSet (rasio desimal -> persen)", () => {
    const m = mapFundamentals(
      { revenueGrowth: 0.25 },
      { netProfitMarginTTM: 0.3, debtToEquityRatioTTM: 0.5, priceToEarningsRatioTTM: 40 },
      { returnOnEquityTTM: 0.4 },
    );
    expect(m).toEqual({ revenueGrowth: 25, netMargin: 30, roe: 40, debtToEquity: 0.5, pe: 40 });
  });
});

describe("fetchFundamentals", () => {
  test("gabung 3 endpoint stable (financial-growth, ratios-ttm, key-metrics-ttm)", async () => {
    const fakeFetch = vi.fn(async (url: string) => {
      const u = String(url);
      let body: unknown;
      if (u.includes("financial-growth")) body = [{ revenueGrowth: 0.1 }];
      else if (u.includes("ratios-ttm"))
        body = [{ netProfitMarginTTM: 0.2, debtToEquityRatioTTM: 1, priceToEarningsRatioTTM: 20 }];
      else body = [{ returnOnEquityTTM: 0.3 }];
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;

    const set = await fetchFundamentals("NVDA", fakeFetch);
    expect(set.revenueGrowth).toBe(10);
    expect(set.netMargin).toBe(20);
    expect(set.roe).toBe(30);
    expect(set.pe).toBe(20);
    expect(set.debtToEquity).toBe(1);
    expect(fakeFetch).toHaveBeenCalledTimes(3);
  });

  test("melempar bila salah satu endpoint gagal", async () => {
    const fakeFetch = vi.fn(
      async () => new Response("nope", { status: 403 }),
    ) as unknown as typeof fetch;
    await expect(fetchFundamentals("NVDA", fakeFetch)).rejects.toThrow();
  });
});
