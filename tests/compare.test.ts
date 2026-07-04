import { describe, expect, test } from "vitest";
import { buildComparisonRows, topTickersByLatestAllocation, chartSeries } from "@/lib/compare";

const snapshots = [
  {
    quarter: "2026Q3",
    entries: [
      { ticker: "NVDA", compositeScore: 80, allocationPct: 30 },
      { ticker: "MSFT", compositeScore: 60, allocationPct: 20 },
    ],
  },
  {
    quarter: "2026Q4",
    entries: [
      { ticker: "NVDA", compositeScore: 85, allocationPct: 35 },
      { ticker: "AMD", compositeScore: 40, allocationPct: 10 },
    ],
  },
];

const analyses = [
  {
    ticker: "NVDA",
    quarter: "2026Q3",
    decision: "Accumulate",
    criteria: { moat: { label: "Wide", score: 90 } },
  },
  {
    ticker: "NVDA",
    quarter: "2026Q4",
    decision: "Accumulate",
    criteria: { moat: { label: "Wide", score: 92 } },
  },
  {
    ticker: "MSFT",
    quarter: "2026Q3",
    decision: "Hold",
    criteria: { moat: { label: "Narrow", score: 60 } },
  },
];

describe("buildComparisonRows", () => {
  test("gabung skor+alokasi+decision+moat per ticker per quartal, urut quartal menaik", () => {
    const rows = buildComparisonRows(snapshots, analyses);
    expect(rows.NVDA).toEqual([
      {
        quarter: "2026Q3",
        compositeScore: 80,
        allocationPct: 30,
        decision: "Accumulate",
        moatLabel: "Wide",
      },
      {
        quarter: "2026Q4",
        compositeScore: 85,
        allocationPct: 35,
        decision: "Accumulate",
        moatLabel: "Wide",
      },
    ]);
  });
  test("ticker tanpa entry di suatu quartal -> array cell lebih pendek (bukan cell kosong)", () => {
    const rows = buildComparisonRows(snapshots, analyses);
    expect(rows.MSFT).toHaveLength(1);
    expect(rows.MSFT[0].quarter).toBe("2026Q3");
    expect(rows.AMD).toHaveLength(1);
    expect(rows.AMD[0].quarter).toBe("2026Q4");
  });
  test("tanpa data AiAnalysis -> decision/moatLabel undefined", () => {
    const rows = buildComparisonRows(snapshots, []);
    expect(rows.AMD[0].decision).toBeUndefined();
    expect(rows.AMD[0].moatLabel).toBeUndefined();
  });
});

describe("topTickersByLatestAllocation", () => {
  test("urut by allocationPct pada cell terakhir tiap ticker, potong ke n", () => {
    const rows = buildComparisonRows(snapshots, analyses);
    // NVDA latest=35 (2026Q4), MSFT latest=20 (2026Q3, satu2nya cell), AMD latest=10 (2026Q4)
    expect(topTickersByLatestAllocation(rows, 2)).toEqual(["NVDA", "MSFT"]);
  });
});

describe("chartSeries", () => {
  test("bentuk {quarter, [ticker]: score} per quartal, urut menaik", () => {
    const rows = buildComparisonRows(snapshots, analyses);
    const series = chartSeries(rows, ["NVDA", "MSFT"]);
    expect(series).toEqual([
      { quarter: "2026Q3", NVDA: 80, MSFT: 60 },
      { quarter: "2026Q4", NVDA: 85 },
    ]);
  });
});
