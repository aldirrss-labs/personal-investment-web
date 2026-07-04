export type Weights = {
  fundamental: number;
  moat: number;
  technical: number;
  diversification: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  fundamental: 35,
  moat: 30,
  technical: 15,
  diversification: 20,
};

function nonNeg(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function validateWeights(input: Record<string, unknown>): Weights {
  const w: Weights = {
    fundamental: nonNeg(input.fundamental),
    moat: nonNeg(input.moat),
    technical: nonNeg(input.technical),
    diversification: nonNeg(input.diversification),
  };
  const sum = w.fundamental + w.moat + w.technical + w.diversification;
  return sum === 0 ? { ...DEFAULT_WEIGHTS } : w;
}

export function clampCap(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

export function sanitizeSectorCaps(input: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!k.trim()) continue;
    out[k] = clampCap(v);
  }
  return out;
}
