import type { AiAnalysis, AiInput, AiProvider } from "./types";

export async function analyzeWithFallback(
  input: AiInput,
  providers: AiProvider[],
): Promise<{ analysis: AiAnalysis; provider: string; model: string } | null> {
  for (const p of providers) {
    try {
      const { analysis, model } = await p.analyze(input);
      return { analysis, provider: p.name, model };
    } catch {
      continue;
    }
  }
  return null;
}
