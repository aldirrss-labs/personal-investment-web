import { describe, expect, test, vi } from "vitest";
import {
  listGeminiModels,
  listGroqModels,
  listOpenRouterModels,
  isChatModelId,
} from "@/lib/ai/models";

function resp(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("isChatModelId", () => {
  test("buang model non-chat", () => {
    expect(isChatModelId("llama-3.3-70b-versatile")).toBe(true);
    expect(isChatModelId("whisper-large-v3")).toBe(false);
    expect(isChatModelId("meta-llama/llama-prompt-guard-2-86m")).toBe(false);
    expect(isChatModelId("canopylabs/orpheus-v1-english")).toBe(false);
  });
});

describe("listGeminiModels", () => {
  test("hanya model generateContent, tanpa prefix models/", async () => {
    const f = vi.fn(async () =>
      resp({
        models: [
          { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
          { name: "models/embedding-001", supportedGenerationMethods: ["embedContent"] },
        ],
      }),
    ) as unknown as typeof fetch;
    expect(await listGeminiModels("K", f)).toEqual(["gemini-2.5-flash"]);
  });
});

describe("listGroqModels", () => {
  test("id chat saja (buang whisper dsb)", async () => {
    const f = vi.fn(async () =>
      resp({
        data: [{ id: "openai/gpt-oss-120b" }, { id: "whisper-large-v3" }, { id: "llama-3.1-8b-instant" }],
      }),
    ) as unknown as typeof fetch;
    expect(await listGroqModels("K", f)).toEqual(["openai/gpt-oss-120b", "llama-3.1-8b-instant"]);
  });
});

describe("listOpenRouterModels", () => {
  test("kembalikan semua id", async () => {
    const f = vi.fn(async () =>
      resp({ data: [{ id: "google/gemini-3.5-flash" }, { id: "x/y:free" }] }),
    ) as unknown as typeof fetch;
    expect(await listOpenRouterModels(f)).toEqual(["google/gemini-3.5-flash", "x/y:free"]);
  });
});
