import { makeOpenAICompatProvider } from "./groq";
import type { AiProvider } from "../types";

export function makeOpenRouterProvider(
  keys: string[],
  model: string,
  fetchImpl?: typeof fetch,
): AiProvider {
  return makeOpenAICompatProvider({
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keys,
    model,
    fetchImpl,
  });
}
