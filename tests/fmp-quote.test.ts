import { describe, expect, test, vi } from "vitest";
import { fetchQuotes } from "@/lib/fmp";

describe("fetchQuotes", () => {
  test("map ticker -> price dari /stable/quote", async () => {
    const f = vi.fn(async (url: string) => {
      const sym = new URL(url).searchParams.get("symbol");
      const price = sym === "NVDA" ? 190 : 400;
      return new Response(JSON.stringify([{ symbol: sym, price }]), { status: 200 });
    }) as unknown as typeof fetch;
    const prices = await fetchQuotes(["NVDA", "MSFT"], f, "K");
    expect(prices).toEqual({ NVDA: 190, MSFT: 400 });
  });
  test("lewati ticker yang gagal (tidak throw seluruhnya)", async () => {
    const f = vi.fn(async (url: string) => {
      const sym = new URL(url).searchParams.get("symbol");
      if (sym === "BAD") return new Response("x", { status: 402 });
      return new Response(JSON.stringify([{ symbol: sym, price: 100 }]), { status: 200 });
    }) as unknown as typeof fetch;
    const prices = await fetchQuotes(["NVDA", "BAD"], f, "K");
    expect(prices).toEqual({ NVDA: 100 });
  });
});
