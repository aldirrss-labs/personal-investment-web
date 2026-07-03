import { describe, expect, test } from "vitest";
import { parseAiAnalysis } from "@/lib/ai/schema";

const valid = {
  criteria: {
    moat: { label: "Wide", score: 90 },
    competitive: { label: "Strong", score: 80 },
    management: { label: "Good", score: 70 },
    industry: { label: "Tailwind", score: 85 },
    risk: { label: "Moderate", score: 60 },
  },
  decision: "Accumulate",
  reason: "Strong moat and growth.",
  keyRisks: ["valuation"],
  confidence: 0.8,
};

describe("parseAiAnalysis", () => {
  test("terima objek valid", () => {
    expect(parseAiAnalysis(valid)).toEqual(valid);
  });
  test("tolak decision tak dikenal", () => {
    expect(() => parseAiAnalysis({ ...valid, decision: "Yolo" })).toThrow();
  });
  test("tolak kriteria hilang", () => {
    const { moat, ...rest } = valid.criteria;
    expect(() => parseAiAnalysis({ ...valid, criteria: rest })).toThrow();
  });
  test("tolak skor di luar 0..100", () => {
    const bad = { ...valid, criteria: { ...valid.criteria, moat: { label: "X", score: 150 } } };
    expect(() => parseAiAnalysis(bad)).toThrow();
  });
  test("tolak confidence di luar 0..1", () => {
    expect(() => parseAiAnalysis({ ...valid, confidence: 5 })).toThrow();
  });
});
