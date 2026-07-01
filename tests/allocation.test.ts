import { describe, expect, test } from "vitest";
import { recommendAllocation } from "@/lib/allocation";

const sum = (o: Record<string, number>) =>
  Object.values(o).reduce((s, v) => s + v, 0);

describe("recommendAllocation", () => {
  test("skor sama -> alokasi merata", () => {
    const r = recommendAllocation({
      scores: { A: 50, B: 50, C: 50 },
      sectors: { A: "x", B: "y", C: "z" },
      caps: { perStock: 100, perSector: {} },
      aggressiveness: 1,
    });
    expect(r.allocation.A).toBeCloseTo(33.333, 2);
    expect(sum(r.allocation)).toBeCloseTo(100, 6);
  });

  test("skor lebih tinggi -> alokasi lebih besar (tilt)", () => {
    const r = recommendAllocation({
      scores: { A: 80, B: 40 },
      sectors: { A: "x", B: "y" },
      caps: { perStock: 100, perSector: {} },
      aggressiveness: 1,
    });
    expect(r.allocation.A).toBeGreaterThan(r.allocation.B);
    expect(sum(r.allocation)).toBeCloseTo(100, 6);
  });

  test("cap per saham ditegakkan & sisa diredistribusi", () => {
    // 3 saham, cap 40 -> total masih feasible (maks 120 >= 100)
    const r = recommendAllocation({
      scores: { A: 100, B: 50, C: 50 },
      sectors: { A: "x", B: "y", C: "z" },
      caps: { perStock: 40, perSector: {} },
      aggressiveness: 5,
    });
    expect(r.allocation.A).toBeLessThanOrEqual(40 + 1e-6);
    expect(sum(r.allocation)).toBeCloseTo(100, 6);
    expect(r.activeCaps).toContain("stock:A");
  });

  test("cap sektor ditegakkan", () => {
    const r = recommendAllocation({
      scores: { A: 90, B: 90, C: 10 },
      sectors: { A: "semi", B: "semi", C: "cloud" },
      caps: { perStock: 100, perSector: { semi: 50 } },
      aggressiveness: 3,
    });
    const semi = r.allocation.A + r.allocation.B;
    expect(semi).toBeLessThanOrEqual(50 + 1e-6);
    expect(sum(r.allocation)).toBeCloseTo(100, 6);
    expect(r.activeCaps).toContain("sector:semi");
  });
});
