import { makeGeminiProvider, extractGeminiText } from "./providers/gemini";
import { makeGroqProvider, extractOpenAIText } from "./providers/groq";
import { makeOpenRouterProvider } from "./providers/openrouter";
import type { AiProvider } from "./types";

export {
  extractGeminiText,
  extractOpenAIText,
  makeGeminiProvider,
  makeGroqProvider,
  makeOpenRouterProvider,
};

function keys(name: string): string[] {
  return (process.env[name] ?? "").split(",").map((k) => k.trim()).filter(Boolean);
}

export function providersFromEnv(): AiProvider[] {
  const order = (process.env.AI_PROVIDER_ORDER ?? "gemini,groq,openrouter")
    .split(",")
    .map((s) => s.trim());
  const out: AiProvider[] = [];
  for (const name of order) {
    if (name === "gemini") {
      const k = keys("GEMINI_API_KEYS");
      if (k.length) out.push(makeGeminiProvider(k, process.env.GEMINI_MODEL ?? "", undefined));
    } else if (name === "groq") {
      const k = keys("GROQ_API_KEYS");
      if (k.length) out.push(makeGroqProvider(k, process.env.GROQ_MODEL ?? "", undefined));
    } else if (name === "openrouter") {
      const k = keys("OPENROUTER_API_KEYS");
      if (k.length)
        out.push(makeOpenRouterProvider(k, process.env.OPENROUTER_MODEL ?? "", undefined));
    }
  }
  return out;
}
