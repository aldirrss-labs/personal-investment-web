import { describe, expect, test } from "vitest";
import { validateWeights, clampCap, sanitizeSectorCaps, DEFAULT_WEIGHTS } from "@/lib/settings";

describe("validateWeights", () => {
  test("angka valid dipertahankan", () => {
    expect(validateWeights({ fundamental: 40, moat: 30, technical: 10, diversification: 20 })).toEqual({
      fundamental: 40,
      moat: 30,
      technical: 10,
      diversification: 20,
    });
  });
  test("negatif -> 0, non-angka -> 0", () => {
    expect(validateWeights({ fundamental: -5, moat: "x", technical: 10, diversification: 20 })).toEqual({
      fundamental: 0,
      moat: 0,
      technical: 10,
      diversification: 20,
    });
  });
  test("semua 0 -> default", () => {
    expect(validateWeights({ fundamental: 0, moat: 0, technical: 0, diversification: 0 })).toEqual(
      DEFAULT_WEIGHTS,
    );
  });
});

describe("clampCap", () => {
  test.each([
    [50, 50],
    [-3, 0],
    [150, 100],
    ["x", 0],
  ])("%s -> %s", (input, out) => {
    expect(clampCap(input as unknown)).toBe(out);
  });
});

describe("sanitizeSectorCaps", () => {
  test("clamp & buang key kosong", () => {
    expect(sanitizeSectorCaps({ Semiconductors: 120, Software: -1, "": 30, Cloud: 40 })).toEqual({
      Semiconductors: 100,
      Software: 0,
      Cloud: 40,
    });
  });
});
