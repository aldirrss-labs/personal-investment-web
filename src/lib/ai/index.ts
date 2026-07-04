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

function keysFrom(env: NodeJS.ProcessEnv, name: string): string[] {
  return (env[name] ?? "").split(",").map((k) => k.trim()).filter(Boolean);
}

export function buildProviders(cfg: {
  order: string[];
  models: { gemini?: string; groq?: string; openrouter?: string };
  env?: NodeJS.ProcessEnv;
}): AiProvider[] {
  const env = cfg.env ?? process.env;
  const out: AiProvider[] = [];
  for (const name of cfg.order) {
    if (name === "gemini") {
      const k = keysFrom(env, "GEMINI_API_KEYS");
      if (k.length) out.push(makeGeminiProvider(k, cfg.models.gemini || env.GEMINI_MODEL || "", undefined));
    } else if (name === "groq") {
      const k = keysFrom(env, "GROQ_API_KEYS");
      if (k.length) out.push(makeGroqProvider(k, cfg.models.groq || env.GROQ_MODEL || "", undefined));
    } else if (name === "openrouter") {
      const k = keysFrom(env, "OPENROUTER_API_KEYS");
      if (k.length)
        out.push(makeOpenRouterProvider(k, cfg.models.openrouter || env.OPENROUTER_MODEL || "", undefined));
    }
  }
  return out;
}

export function providersFromEnv(): AiProvider[] {
  const order = (process.env.AI_PROVIDER_ORDER ?? "gemini,groq,openrouter")
    .split(",")
    .map((s) => s.trim());
  return buildProviders({ order, models: {} });
}

export async function buildProvidersFromStore(): Promise<AiProvider[]> {
  const { getAiModels, getProviderOrder } = await import("@/lib/repo");
  const envOrder = (process.env.AI_PROVIDER_ORDER ?? "gemini,groq,openrouter")
    .split(",")
    .map((s) => s.trim());
  const order = (await getProviderOrder()) ?? envOrder;
  const models = await getAiModels();
  return buildProviders({ order, models });
}
