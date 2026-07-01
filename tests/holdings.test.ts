import { describe, expect, test } from "vitest";
import { positionsFromTx, pnl, actualAllocation } from "@/lib/holdings";

describe("positionsFromTx", () => {
  test("agregasi qty & hitung avg cost tertimbang", () => {
    const pos = positionsFromTx([
      { ticker: "NVDA", qty: 2, price: 100 },
      { ticker: "NVDA", qty: 2, price: 200 },
    ]);
    expect(pos).toEqual([{ ticker: "NVDA", qty: 4, avgCost: 150, costBasis: 600 }]);
  });
});

describe("pnl", () => {
  test("hitung PnL abs & persen", () => {
    const p = pnl({ ticker: "NVDA", qty: 4, avgCost: 150, costBasis: 600 }, 200);
    expect(p.abs).toBe(200);
    expect(p.pct).toBeCloseTo(33.333, 2);
  });
});

describe("actualAllocation", () => {
  test("persen berdasar market value, total 100", () => {
    const positions = [
      { ticker: "A", qty: 1, avgCost: 100, costBasis: 100 },
      { ticker: "B", qty: 1, avgCost: 100, costBasis: 100 },
    ];
    const alloc = actualAllocation(positions, { A: 300, B: 100 });
    expect(alloc.A).toBeCloseTo(75, 6);
    expect(alloc.B).toBeCloseTo(25, 6);
  });
});
