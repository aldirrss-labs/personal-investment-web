import { describe, expect, test, vi } from "vitest";
import { mapProfileMetrics, fetchFundamentals } from "@/lib/fmp";

describe("mapProfileMetrics", () => {
  test("map field FMP -> FundamentalSet", () => {
    const m = mapProfileMetrics({
      revenueGrowth: 0.25,
      netProfitMargin: 0.3,
      roe: 0.4,
      debtToEquity: 0.5,
      peRatio: 40,
    });
    expect(m).toEqual({
      revenueGrowth: 25,
      netMargin: 30,
      roe: 40,
      debtToEquity: 0.5,
      pe: 40,
    });
  });
});

describe("fetchFundamentals", () => {
  test("panggil endpoint & kembalikan set ter-map", async () => {
    const fakeFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              revenueGrowth: 0.1,
              netProfitMargin: 0.2,
              roe: 0.3,
              debtToEquity: 1,
              peRatio: 20,
            },
          ]),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;
    const set = await fetchFundamentals("NVDA", fakeFetch);
    expect(set.revenueGrowth).toBe(10);
    expect(fakeFetch).toHaveBeenCalledOnce();
  });
});
