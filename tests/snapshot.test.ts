import { describe, expect, test } from "vitest";
import { criterionScoresFromAnalysis, buildSnapshotEntries } from "@/lib/snapshot";

const analysis = {
  criteria: {
    moat: { label: "Wide", score: 90 },
    competitive: { label: "Strong", score: 80 },
    management: { label: "Good", score: 70 },
    industry: { label: "Tailwind", score: 85 },
    risk: { label: "Moderate", score: 60 },
  },
  decision: "Accumulate" as const,
  reason: "x",
  keyRisks: [],
  confidence: 0.8,
};

describe("criterionScoresFromAnalysis", () => {
  test("hasilkan 5 baris group moat, manual=false, rawValue dari skor AI", () => {
    const rows = criterionScoresFromAnalysis("NVDA", "2026Q3", analysis);
    expect(rows).toHaveLength(5);
    const moat = rows.find((r) => r.key === "moat");
    expect(moat).toEqual({
      ticker: "NVDA",
      quarter: "2026Q3",
      group: "moat",
      key: "moat",
      rawValue: 90,
      manual: false,
    });
    expect(rows.every((r) => r.manual === false && r.group === "moat")).toBe(true);
  });
});

describe("buildSnapshotEntries", () => {
  test("gabungkan skor, alokasi, breakdown per ticker", () => {
    const entries = buildSnapshotEntries(
      { NVDA: 82, MSFT: 70 },
      { NVDA: 55, MSFT: 45 },
      { NVDA: { moat: 90 }, MSFT: { moat: 70 } },
    );
    expect(entries).toContainEqual({
      ticker: "NVDA",
      compositeScore: 82,
      allocationPct: 55,
      breakdown: { moat: 90 },
    });
    expect(entries).toHaveLength(2);
  });
});
