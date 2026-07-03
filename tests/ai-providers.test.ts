import { describe, expect, test, vi } from "vitest";
import { extractGeminiText, extractOpenAIText, makeGroqProvider } from "@/lib/ai/index";
import type { AiInput } from "@/lib/ai/types";

const analysisJson = JSON.stringify({
  criteria: {
    moat: { label: "Wide", score: 90 },
    competitive: { label: "Strong", score: 80 },
    management: { label: "Good", score: 70 },
    industry: { label: "Tailwind", score: 85 },
    risk: { label: "Moderate", score: 60 },
  },
  decision: "Accumulate",
  reason: "x",
  keyRisks: [],
  confidence: 0.8,
});

const input: AiInput = {
  ticker: "NVDA",
  fundamentals: { revenueGrowth: 25, netMargin: 30, roe: 40, debtToEquity: 0.5, pe: 40 },
  language: "id",
};

describe("extractors", () => {
  test("extractGeminiText mengambil teks kandidat", () => {
    const t = extractGeminiText({ candidates: [{ content: { parts: [{ text: "hello" }] } }] });
    expect(t).toBe("hello");
  });
  test("extractOpenAIText mengambil message content", () => {
    const t = extractOpenAIText({ choices: [{ message: { content: "world" } }] });
    expect(t).toBe("world");
  });
});

describe("makeGroqProvider", () => {
  test("memakai key dari pool (Authorization Bearer) dan mengembalikan analysis ter-parse", async () => {
    const fakeFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: analysisJson } }] }), {
          status: 200,
        }),
    ) as unknown as typeof fetch;
    const p = makeGroqProvider(["KEY1"], "some-model", fakeFetch);
    const res = await p.analyze(input);
    expect(res.model).toBe("some-model");
    expect(res.analysis.criteria.moat.score).toBe(90);
    const call = (fakeFetch as any).mock.calls[0];
    expect(call[1].headers.Authorization).toBe("Bearer KEY1");
  });

  test("melempar bila HTTP gagal (agar orchestrator fallback)", async () => {
    const fakeFetch = vi.fn(
      async () => new Response("nope", { status: 429 }),
    ) as unknown as typeof fetch;
    const p = makeGroqProvider(["KEY1"], "some-model", fakeFetch);
    await expect(p.analyze(input)).rejects.toThrow();
  });
});
