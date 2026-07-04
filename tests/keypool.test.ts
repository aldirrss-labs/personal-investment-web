import { afterEach, describe, expect, test } from "vitest";
import { createKeyPool, keysFromEnv } from "@/lib/keypool";

describe("createKeyPool", () => {
  test("round-robin & size", () => {
    const p = createKeyPool(["a", "b"]);
    expect([p.next(), p.next(), p.next()]).toEqual(["a", "b", "a"]);
    expect(p.size).toBe(2);
  });
  test("throw bila kosong", () => {
    expect(() => createKeyPool([])).toThrow();
  });
});

describe("keysFromEnv", () => {
  const KP = "TEST_KEYS_PLURAL";
  const KS = "TEST_KEY_SINGULAR";
  afterEach(() => {
    delete process.env[KP];
    delete process.env[KS];
  });

  test("parse plural comma-separated (trim + buang kosong)", () => {
    process.env[KP] = " k1 , k2 ,, k3 ";
    expect(keysFromEnv(KP, KS)).toEqual(["k1", "k2", "k3"]);
  });
  test("fallback ke singular bila plural kosong", () => {
    process.env[KS] = "solo";
    expect(keysFromEnv(KP, KS)).toEqual(["solo"]);
  });
  test("array kosong bila dua-duanya kosong", () => {
    expect(keysFromEnv(KP, KS)).toEqual([]);
  });
});
