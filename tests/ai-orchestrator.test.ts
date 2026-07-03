import { describe, expect, test, vi } from "vitest";
import { analyzeWithFallback } from "@/lib/ai/orchestrator";
import type { AiProvider, AiInput } from "@/lib/ai/types";

const input: AiInput = {
  ticker: "NVDA",
  fundamentals: { revenueGrowth: 25, netMargin: 30, roe: 40, debtToEquity: 0.5, pe: 40 },
  language: "id",
};

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

function provider(name: string, impl: () => Promise<any>): AiProvider {
  return { name, analyze: vi.fn(impl) };
}

describe("analyzeWithFallback", () => {
  test("pakai provider pertama yang sukses", async () => {
    const p1 = provider("gemini", async () => {
      throw new Error("rate limit");
    });
    const p2 = provider("groq", async () => ({ analysis, model: "m2" }));
    const res = await analyzeWithFallback(input, [p1, p2]);
    expect(res).toEqual({ analysis, provider: "groq", model: "m2" });
    expect(p2.analyze).toHaveBeenCalledOnce();
  });

  test("null bila semua provider gagal", async () => {
    const p1 = provider("gemini", async () => {
      throw new Error("x");
    });
    const p2 = provider("groq", async () => {
      throw new Error("y");
    });
    expect(await analyzeWithFallback(input, [p1, p2])).toBeNull();
  });
});
