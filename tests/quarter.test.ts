import { describe, expect, test } from "vitest";
import { currentQuarter } from "@/lib/quarter";

describe("currentQuarter", () => {
  test.each([
    [1, "Q1"],
    [3, "Q1"],
    [4, "Q2"],
    [6, "Q2"],
    [7, "Q3"],
    [9, "Q3"],
    [10, "Q4"],
    [12, "Q4"],
  ])("bulan %i -> %s", (month, q) => {
    expect(currentQuarter({ year: 2026, month })).toBe(`2026${q}`);
  });
});
