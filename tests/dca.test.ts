import { describe, expect, test } from "vitest";
import { suggestDcaAmounts } from "@/lib/dca";

describe("suggestDcaAmounts", () => {
  test("split proporsional sesuai alokasi %, qty dari usd/harga", () => {
    const result = suggestDcaAmounts(1000, { NVDA: 60, MSFT: 40 }, { NVDA: 100, MSFT: 50 });
    expect(result).toEqual([
      { ticker: "NVDA", allocationPct: 60, suggestedUsd: 600, suggestedQty: 6, price: 100 },
      { ticker: "MSFT", allocationPct: 40, suggestedUsd: 400, suggestedQty: 8, price: 50 },
    ]);
  });

  test("ticker tanpa harga -> suggestedQty 0 (bukan Infinity/NaN)", () => {
    const result = suggestDcaAmounts(1000, { NVDA: 100 }, {});
    expect(result).toEqual([
      { ticker: "NVDA", allocationPct: 100, suggestedUsd: 1000, suggestedQty: 0, price: 0 },
    ]);
  });

  test("budget 0 -> semua suggested 0", () => {
    const result = suggestDcaAmounts(0, { NVDA: 100 }, { NVDA: 100 });
    expect(result[0].suggestedUsd).toBe(0);
    expect(result[0].suggestedQty).toBe(0);
  });
});
