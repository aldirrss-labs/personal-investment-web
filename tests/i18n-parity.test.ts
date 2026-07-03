import { describe, expect, test } from "vitest";
import en from "../messages/en.json";
import id from "../messages/id.json";

function flatKeys(obj: Record<string, any>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null ? flatKeys(v, key) : [key];
  });
}

describe("dictionary parity", () => {
  test("en dan id punya set key yang identik", () => {
    const enKeys = flatKeys(en).sort();
    const idKeys = flatKeys(id).sort();
    expect(enKeys).toEqual(idKeys);
  });
});
