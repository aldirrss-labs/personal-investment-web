import { AI_CRITERIA, DECISIONS, type AiAnalysis, type Decision } from "./types";

function num(v: unknown, min: number, max: number, label: string): number {
  if (typeof v !== "number" || Number.isNaN(v) || v < min || v > max) {
    throw new Error(`invalid ${label}: ${v}`);
  }
  return v;
}

function str(v: unknown, label: string): string {
  if (typeof v !== "string" || v.length === 0) throw new Error(`invalid ${label}`);
  return v;
}

export function parseAiAnalysis(data: unknown): AiAnalysis {
  if (typeof data !== "object" || data === null) throw new Error("not an object");
  const d = data as Record<string, any>;

  const criteria = {} as AiAnalysis["criteria"];
  if (typeof d.criteria !== "object" || d.criteria === null) throw new Error("criteria missing");
  for (const key of AI_CRITERIA) {
    const c = d.criteria[key];
    if (typeof c !== "object" || c === null) throw new Error(`criterion ${key} missing`);
    criteria[key] = {
      label: str(c.label, `${key}.label`),
      score: num(c.score, 0, 100, `${key}.score`),
    };
  }

  if (!DECISIONS.includes(d.decision)) throw new Error(`invalid decision: ${d.decision}`);

  if (!Array.isArray(d.keyRisks) || d.keyRisks.some((r: unknown) => typeof r !== "string")) {
    throw new Error("invalid keyRisks");
  }

  return {
    criteria,
    decision: d.decision as Decision,
    reason: str(d.reason, "reason"),
    keyRisks: d.keyRisks as string[],
    confidence: num(d.confidence, 0, 1, "confidence"),
  };
}
