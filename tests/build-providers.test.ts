import { describe, expect, test } from "vitest";
import { buildProviders } from "@/lib/ai/index";

const env = {
  GEMINI_API_KEYS: "g1,g2",
  GROQ_API_KEYS: "q1",
  OPENROUTER_API_KEYS: "",
  GEMINI_MODEL: "env-gemini",
  GROQ_MODEL: "env-groq",
} as unknown as NodeJS.ProcessEnv;

describe("buildProviders", () => {
  test("urutan sesuai cfg.order & lewati provider tanpa key", () => {
    const ps = buildProviders({ order: ["groq", "gemini", "openrouter"], models: {}, env });
    expect(ps.map((p) => p.name)).toEqual(["groq", "gemini"]); // openrouter tanpa key -> dilewati
  });
  test("model dari Setting menang atas env (tidak error, provider terbentuk)", () => {
    const ps = buildProviders({ order: ["gemini"], models: { gemini: "store-gemini" }, env });
    expect(ps).toHaveLength(1);
    expect(ps[0].name).toBe("gemini");
  });
});
