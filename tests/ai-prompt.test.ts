import { describe, expect, test } from "vitest";
import { buildAnalystPrompt } from "@/lib/ai/prompt";

const input = {
  ticker: "NVDA",
  fundamentals: { revenueGrowth: 25, netMargin: 30, roe: 40, debtToEquity: 0.5, pe: 40 },
  positionPct: 22,
  language: "id" as const,
};

describe("buildAnalystPrompt", () => {
  test("memuat ticker, angka fundamental, rubrik, instruksi bahasa, dan format JSON", () => {
    const p = buildAnalystPrompt(input);
    expect(p).toContain("NVDA");
    expect(p).toContain("25"); // revenueGrowth
    expect(p).toMatch(/rubric|rubrik/i);
    expect(p).toMatch(/Indonesia/i); // instruksi bahasa id
    expect(p).toMatch(/JSON/);
    expect(p).toContain("moat");
  });
  test("instruksi bahasa berubah untuk en", () => {
    const p = buildAnalystPrompt({ ...input, language: "en" });
    expect(p).toMatch(/English/i);
  });

  test("mode degraded: tanpa fundamentals -> minta kualitatif & jangan mengarang angka", () => {
    const { fundamentals, ...rest } = input;
    const p = buildAnalystPrompt(rest);
    expect(p).toMatch(/not available|unavailable|tidak tersedia/i);
    expect(p).toMatch(/do not (invent|fabricate)|jangan mengarang/i);
    // tetap memuat ticker, rubrik, dan format JSON
    expect(p).toContain("NVDA");
    expect(p).toMatch(/JSON/);
  });
});
