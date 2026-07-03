import { buildAnalystPrompt } from "../prompt";
import { parseAiAnalysis } from "../schema";
import { createKeyPool } from "../keypool";
import type { AiInput, AiProvider, AiResult } from "../types";

export function extractOpenAIText(json: any): string {
  const t = json?.choices?.[0]?.message?.content;
  if (typeof t !== "string") throw new Error("no content");
  return t;
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

export function makeOpenAICompatProvider(opts: {
  name: string;
  baseUrl: string;
  keys: string[];
  model: string;
  fetchImpl?: typeof fetch;
}): AiProvider {
  const pool = createKeyPool(opts.keys);
  const fetchImpl = opts.fetchImpl ?? fetch;
  return {
    name: opts.name,
    async analyze(input: AiInput): Promise<AiResult> {
      const key = pool.next();
      const res = await fetchImpl(`${opts.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: opts.model,
          messages: [{ role: "user", content: buildAnalystPrompt(input) }],
          temperature: 0.2,
        }),
      });
      if (!res.ok) throw new Error(`${opts.name} ${res.status}`);
      const text = stripFences(extractOpenAIText(await res.json()));
      return { analysis: parseAiAnalysis(JSON.parse(text)), model: opts.model };
    },
  };
}

export function makeGroqProvider(
  keys: string[],
  model: string,
  fetchImpl?: typeof fetch,
): AiProvider {
  return makeOpenAICompatProvider({
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    keys,
    model,
    fetchImpl,
  });
}
