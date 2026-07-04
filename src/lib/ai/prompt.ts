import { aiLanguageInstruction } from "@/lib/language";
import type { AiInput } from "./types";

const RUBRIC = `Scoring rubric (0-100) for each criterion:
- 90-100: exceptional / very wide & durable
- 70-89: strong
- 50-69: average
- 30-49: weak
- 0-29: poor / none
Criteria to score:
- moat: durability & width of economic moat
- competitive: competitive/market position
- management: management quality & capital allocation
- industry: industry prospect / secular tailwind
- risk: risk profile (higher score = lower risk)`;

export function buildAnalystPrompt(input: AiInput): string {
  const f = input.fundamentals;
  const fundamentalsBlock = f
    ? [
        `Fundamentals (already fetched, do not invent numbers):`,
        `- revenue growth (%): ${f.revenueGrowth}`,
        `- net margin (%): ${f.netMargin}`,
        `- ROE (%): ${f.roe}`,
        `- debt/equity: ${f.debtToEquity}`,
        `- P/E: ${f.pe}`,
      ].join("\n")
    : `Fundamentals are NOT available (not fetched). Assess qualitatively from your knowledge of the company; do not invent or fabricate specific numbers.`;
  return [
    aiLanguageInstruction(input.language),
    `You are an equity analyst. Analyze the company ${input.ticker}.`,
    fundamentalsBlock,
    input.positionPct !== undefined
      ? `Current portfolio weight of this holding: ${input.positionPct}%`
      : ``,
    RUBRIC,
    `Return ONLY valid JSON with this exact shape (no markdown fences):`,
    `{"criteria":{"moat":{"label":"...","score":0},"competitive":{"label":"...","score":0},"management":{"label":"...","score":0},"industry":{"label":"...","score":0},"risk":{"label":"...","score":0}},"decision":"Accumulate|Hold|Reduce|Avoid","reason":"2-4 sentences referencing the numbers","keyRisks":["..."],"confidence":0.0}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
