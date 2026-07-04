import type { FundamentalSet } from "@/lib/fmp";
import type { ResolvedLanguage } from "@/lib/language";

export const AI_CRITERIA = ["moat", "competitive", "management", "industry", "risk"] as const;
export type AiCriterionKey = (typeof AI_CRITERIA)[number];

export type CriterionRating = { label: string; score: number };
export type Decision = "Accumulate" | "Hold" | "Reduce" | "Avoid";
export const DECISIONS: Decision[] = ["Accumulate", "Hold", "Reduce", "Avoid"];

export type AiAnalysis = {
  criteria: Record<AiCriterionKey, CriterionRating>;
  decision: Decision;
  reason: string;
  keyRisks: string[];
  confidence: number;
};

export type AiInput = {
  ticker: string;
  fundamentals?: FundamentalSet;
  positionPct?: number;
  language: ResolvedLanguage;
};

export type AiResult = { analysis: AiAnalysis; model: string };

export interface AiProvider {
  name: string;
  analyze(input: AiInput): Promise<AiResult>;
}
