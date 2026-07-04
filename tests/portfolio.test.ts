import { describe, expect, test } from "vitest";
import { portfolioSummary, donutData } from "@/lib/portfolio";

const positions = [
  { ticker: "A", qty: 2, avgCost: 100, costBasis: 200 },
  { ticker: "B", qty: 1, avgCost: 100, costBasis: 100 },
];

describe("portfolioSummary", () => {
  test("hitung nilai, pnl, dan baris", () => {
    const s = portfolioSummary(positions, { A: 150, B: 50 });
    expect(s.totalValue).toBe(350); // 2*150 + 1*50
    expect(s.totalCost).toBe(300);
    expect(s.pnlAbs).toBe(50);
    expect(s.pnlPct).toBeCloseTo(16.667, 2);
    const a = s.rows.find((r) => r.ticker === "A")!;
    expect(a.value).toBe(300);
    expect(a.pnlAbs).toBe(100);
    expect(a.pnlPct).toBeCloseTo(50, 6);
  });
  test("harga hilang -> price 0, value 0", () => {
    const s = portfolioSummary(positions, { A: 150 });
    const b = s.rows.find((r) => r.ticker === "B")!;
    expect(b.price).toBe(0);
    expect(b.value).toBe(0);
  });
});

describe("donutData", () => {
  test("ubah rows -> {name,value}", () => {
    const s = portfolioSummary(positions, { A: 150, B: 50 });
    expect(donutData(s.rows)).toEqual([
      { name: "A", value: 300 },
      { name: "B", value: 50 },
    ]);
  });
});
