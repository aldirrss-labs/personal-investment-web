import { buildAnalystPrompt } from "../prompt";
import { parseAiAnalysis } from "../schema";
import { createKeyPool } from "../keypool";
import type { AiInput, AiProvider, AiResult } from "../types";

export function extractGeminiText(json: any): string {
  const t = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof t !== "string") throw new Error("no content");
  return t;
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

export function makeGeminiProvider(
  keys: string[],
  model: string,
  fetchImpl?: typeof fetch,
): AiProvider {
  const pool = createKeyPool(keys);
  const doFetch = fetchImpl ?? fetch;
  return {
    name: "gemini",
    async analyze(input: AiInput): Promise<AiResult> {
      const key = pool.next();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await doFetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildAnalystPrompt(input) }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) throw new Error(`gemini ${res.status}`);
      const text = stripFences(extractGeminiText(await res.json()));
      return { analysis: parseAiAnalysis(JSON.parse(text)), model };
    },
  };
}
