import { describe, expect, test } from "vitest";
import { normalize, compositeScores } from "@/lib/scoring";

describe("normalize", () => {
  test("benefit: nilai tertinggi jadi 1, terendah 0", () => {
    const n = normalize({ A: 10, B: 20, C: 30 }, "benefit");
    expect(n.A).toBeCloseTo(0, 6);
    expect(n.C).toBeCloseTo(1, 6);
    expect(n.B).toBeCloseTo(0.5, 6);
  });
  test("cost: nilai terendah jadi 1", () => {
    const n = normalize({ A: 10, B: 30 }, "cost");
    expect(n.A).toBeCloseTo(1, 6);
    expect(n.B).toBeCloseTo(0, 6);
  });
  test("semua nilai sama -> semua 1 (netral)", () => {
    const n = normalize({ A: 5, B: 5 }, "benefit");
    expect(n.A).toBeCloseTo(1, 6);
    expect(n.B).toBeCloseTo(1, 6);
  });
});

describe("compositeScores", () => {
  test("skor tertimbang per kelompok, skala 0..100", () => {
    const criteria = [
      { key: "growth", group: "fundamental", direction: "benefit" as const },
      { key: "pe", group: "fundamental", direction: "cost" as const },
      { key: "moat", group: "moat", direction: "benefit" as const },
    ];
    const raw = {
      NVDA: { growth: 30, pe: 40, moat: 9 },
      MSFT: { growth: 10, pe: 20, moat: 7 },
    };
    const scores = compositeScores({
      criteria,
      raw,
      groupWeights: { fundamental: 50, moat: 50 },
    });
    // NVDA: fundamental = avg(growth norm=1, pe norm=0)=0.5; moat norm=1 -> 0.5*50+1*50=75
    expect(scores.NVDA).toBeCloseTo(75, 4);
    // MSFT: fundamental = avg(growth 0, pe 1)=0.5; moat 0 -> 0.5*50+0*50=25
    expect(scores.MSFT).toBeCloseTo(25, 4);
  });
});
