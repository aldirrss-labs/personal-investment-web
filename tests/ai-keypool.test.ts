import { describe, expect, test } from "vitest";
import { createKeyPool } from "@/lib/ai/keypool";

describe("createKeyPool", () => {
  test("round-robin memutar key", () => {
    const pool = createKeyPool(["a", "b", "c"]);
    expect([pool.next(), pool.next(), pool.next(), pool.next()]).toEqual(["a", "b", "c", "a"]);
  });
  test("size mencerminkan jumlah key", () => {
    expect(createKeyPool(["a", "b"]).size).toBe(2);
  });
  test("throw bila kosong", () => {
    expect(() => createKeyPool([])).toThrow();
  });
});
