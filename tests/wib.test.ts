import { describe, expect, test } from "vitest";
import { parseWibDatetimeLocal, formatWib } from "@/lib/wib";

describe("parseWibDatetimeLocal", () => {
  test("14:30 WIB (UTC+7) -> 07:30 UTC", () => {
    const d = parseWibDatetimeLocal("2026-07-05T14:30");
    expect(d.toISOString()).toBe("2026-07-05T07:30:00.000Z");
  });
  test("terima value dengan detik", () => {
    const d = parseWibDatetimeLocal("2026-07-05T14:30:15");
    expect(d.toISOString()).toBe("2026-07-05T07:30:15.000Z");
  });
});

describe("formatWib", () => {
  test("format balik ke WIB dari Date UTC", () => {
    const d = new Date("2026-07-05T07:30:00.000Z");
    expect(formatWib(d)).toBe("2026-07-05 14:30 WIB");
  });
});

describe("parseWibDatetimeLocal invalid input", () => {
  test("string kosong throw error", () => {
    expect(() => parseWibDatetimeLocal("")).toThrow();
  });
});
