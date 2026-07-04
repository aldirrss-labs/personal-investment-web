import { describe, expect, test, vi } from "vitest";
import { fetchProfile } from "@/lib/fmp";

describe("fetchProfile", () => {
  test("ambil sector & industry dari /stable/profile", async () => {
    const f = vi.fn(async () =>
      new Response(
        JSON.stringify([{ symbol: "NVDA", sector: "Technology", industry: "Semiconductors" }]),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;
    const p = await fetchProfile("NVDA", f, "K");
    expect(p).toEqual({ sector: "Technology", industry: "Semiconductors" });
    expect(String((f as any).mock.calls[0][0])).toContain("/stable/profile");
  });
  test("melempar bila HTTP gagal", async () => {
    const f = vi.fn(async () => new Response("x", { status: 402 })) as unknown as typeof fetch;
    await expect(fetchProfile("NVDA", f, "K")).rejects.toThrow();
  });
});
