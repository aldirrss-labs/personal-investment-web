import { describe, expect, test } from "vitest";
import { resolveAiLanguage, aiLanguageInstruction } from "@/lib/language";

describe("resolveAiLanguage", () => {
  test("follow_ui memakai locale UI", () => {
    expect(resolveAiLanguage("follow_ui", "id")).toBe("id");
    expect(resolveAiLanguage("follow_ui", "en")).toBe("en");
  });
  test("override eksplisit mengabaikan locale UI", () => {
    expect(resolveAiLanguage("en", "id")).toBe("en");
    expect(resolveAiLanguage("id", "en")).toBe("id");
  });
});

describe("aiLanguageInstruction", () => {
  test("menghasilkan instruksi bahasa untuk prompt", () => {
    expect(aiLanguageInstruction("id")).toMatch(/Indonesia/i);
    expect(aiLanguageInstruction("en")).toMatch(/English/i);
  });
});
