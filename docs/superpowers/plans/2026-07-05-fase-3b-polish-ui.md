# Fase 3b — Polish UI + Live Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rombak UI ke shadcn/ui dengan app shell (sidebar + topbar + dark mode) dan dashboard tracking portfolio ber-harga-live (stat cards, donut alokasi, tabel posisi).

**Architecture:** Tambah shadcn/ui + next-themes + recharts. App shell membungkus semua halaman. Logika (ringkasan portfolio, transform chart, fetch harga) = fungsi murni/teruji di `src/lib/`. Harga live via FMP `/stable/quote` di-cache ke `PriceCache`; dashboard baca cache, tombol "Refresh harga" mengisi cache.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, shadcn/ui (Radix), next-themes, recharts, Prisma, Vitest.

## Global Constraints

- shadcn/ui + Tailwind; komponen di `src/components/ui`.
- Sidebar bergrup dari array literal (extensible untuk Crypto/Portfolio nanti).
- Tema light/dark/system via `next-themes` (`attribute="class"`).
- Chart: Recharts (donut alokasi by market value). **Sebelum menulis kode chart, muat skill `dataviz`.**
- Harga: FMP `/stable/quote`, cache `PriceCache`, fallback stale; dashboard baca cache, tombol refresh mengisi.
- Fungsi murni di `src/lib/**` tanpa import React/Next/Prisma → wajib unit test.
- i18n: teks baru di `messages/{id,en}.json`, parity test dijaga.
- Frequent commits. Spec: `docs/superpowers/specs/2026-07-05-fase-3b-polish-ui-design.md`.

---

## File Structure

```
src/lib/portfolio.ts           # portfolioSummary + donutData (murni)
src/lib/fmp.ts                 # (modify) fetchQuotes()
src/lib/repo.ts                # (modify) savePrices/getCachedPrices
prisma/schema.prisma           # (modify) PriceCache
src/components/ui/*            # shadcn (card, table, badge, button, select, input, label, separator)
src/lib/utils.ts               # cn() dari shadcn
src/components/theme/ThemeProvider.tsx
src/components/theme/ThemeToggle.tsx
src/components/shell/Sidebar.tsx
src/components/shell/Topbar.tsx
src/components/shell/AppShell.tsx
src/app/layout.tsx             # (modify) ThemeProvider + AppShell
src/app/page.tsx               # (modify) Dashboard baru
src/app/dashboard/actions.ts   # fetchAndCachePrices()
src/components/RefreshPricesButton.tsx
src/components/AllocationDonut.tsx
src/app/recommendation/page.tsx, src/app/review/*, src/app/stock/[ticker]/page.tsx, src/app/settings/* # (modify) shadcn
messages/{id,en}.json          # (modify)
tests/portfolio.test.ts
tests/fmp-quote.test.ts
```

---

### Task 1: Setup shadcn/ui + next-themes + shell

**Files:**
- Create: `src/components/theme/ThemeProvider.tsx`, `src/components/theme/ThemeToggle.tsx`, `src/components/shell/Sidebar.tsx`, `src/components/shell/Topbar.tsx`, `src/components/shell/AppShell.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `AppShell` membungkus children dgn sidebar+topbar; `ThemeProvider`; komponen shadcn tersedia di `src/components/ui`.

- [ ] **Step 1: Install deps + shadcn init (non-interaktif)**

Run:
```bash
npm i next-themes recharts
npx shadcn@latest init -d
npx shadcn@latest add card table badge button select input label separator --yes
```
Expected: `src/components/ui/*.tsx` terbuat, `src/lib/utils.ts` (cn) terbuat, `tailwind.config.ts` & `globals.css` diperbarui (CSS variables + dark).

- [ ] **Step 2: ThemeProvider**

Create `src/components/theme/ThemeProvider.tsx`:
```tsx
"use client";
import { ThemeProvider as NextThemes } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemes>
  );
}
```

- [ ] **Step 3: ThemeToggle**

Create `src/components/theme/ThemeToggle.tsx`:
```tsx
"use client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button variant="outline" size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? "☀️" : "🌙"}
    </Button>
  );
}
```

- [ ] **Step 4: Sidebar (bergrup, extensible)**

Create `src/components/shell/Sidebar.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const GROUPS = [
  { key: "stocks", items: [
    { href: "/", key: "dashboard" },
    { href: "/recommendation", key: "recommendation" },
    { href: "/review", key: "review" },
  ] },
  { key: "config", items: [{ href: "/settings", key: "settings" }] },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const path = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4 hidden md:block">
      <div className="font-bold mb-4">Investment SPK</div>
      <nav className="space-y-4">
        {GROUPS.map((g) => (
          <div key={g.key}>
            <div className="text-xs uppercase text-muted-foreground mb-1">{t(g.key)}</div>
            <ul className="space-y-1">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href}
                    className={`block rounded px-2 py-1 text-sm ${path === it.href ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}>
                    {t(it.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 5: Topbar + AppShell**

Create `src/components/shell/Topbar.tsx`:
```tsx
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Topbar() {
  return (
    <header className="flex items-center justify-end gap-3 border-b border-border px-6 py-3">
      <LocaleSwitcher />
      <ThemeToggle />
    </header>
  );
}
```

Create `src/components/shell/AppShell.tsx`:
```tsx
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Bungkus root layout + i18n nav keys**

Modify `src/app/layout.tsx` — bungkus `NextIntlClientProvider` children dengan `ThemeProvider` + `AppShell`:
```tsx
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </NextIntlClientProvider>
```
Tambah import `ThemeProvider` & `AppShell`. Tambahkan `suppressHydrationWarning` pada `<html>` (syarat next-themes).

Tambah ke `messages/id.json` (dan EN):
```json
"nav": { "stocks": "Saham", "config": "Konfigurasi", "dashboard": "Dashboard", "recommendation": "Rekomendasi", "review": "Review", "settings": "Pengaturan" }
```
EN: `{ "stocks": "Stocks", "config": "Config", "dashboard": "Dashboard", "recommendation": "Recommendation", "review": "Review", "settings": "Settings" }`

- [ ] **Step 7: Verifikasi**

Run: `npm run test -- tests/i18n-parity.test.ts && npx tsc --noEmit && npm run build`
Expected: parity PASS, TYPECHECK OK, build sukses.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add shadcn/ui, theme provider, and app shell (sidebar+topbar)"
```

---

### Task 2: Harga live FMP + cache

**Files:**
- Modify: `src/lib/fmp.ts`, `prisma/schema.prisma`, `src/lib/repo.ts`
- Create: `tests/fmp-quote.test.ts`

**Interfaces:**
- Produces:
  - `fetchQuotes(tickers: string[], fetchImpl?: typeof fetch, apiKey?: string): Promise<Record<string, number>>`
  - repo `savePrices(prices: Record<string, number>): Promise<void>`, `getCachedPrices(tickers: string[]): Promise<Record<string, number>>`
  - model `PriceCache`.

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/fmp-quote.test.ts`:
```ts
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
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/fmp-quote.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasi `fetchQuotes` (di `src/lib/fmp.ts`)**

Tambahkan:
```ts
export async function fetchQuotes(
  tickers: string[],
  fetchImpl: typeof fetch = fetch,
  apiKey?: string,
): Promise<Record<string, number>> {
  const key = apiKey ?? getFmpKeys()[0] ?? "";
  const out: Record<string, number> = {};
  for (const t of tickers) {
    try {
      const res = await fetchImpl(`${BASE}/quote?symbol=${t}&apikey=${key}`);
      if (!res.ok) continue;
      const json = (await res.json()) as any;
      const p = Array.isArray(json) ? json[0] : json;
      if (typeof p?.price === "number") out[t] = p.price;
    } catch {
      /* lewati */
    }
  }
  return out;
}
```

- [ ] **Step 4: Skema PriceCache + migrasi**

Append ke `prisma/schema.prisma`:
```prisma
model PriceCache {
  ticker    String   @id
  price     Float
  updatedAt DateTime @updatedAt
}
```
Run: `npx prisma migrate dev --name price_cache`
Expected: migrasi sukses.

- [ ] **Step 5: Repo cache**

Tambahkan ke `src/lib/repo.ts`:
```ts
export async function savePrices(prices: Record<string, number>): Promise<void> {
  for (const [ticker, price] of Object.entries(prices)) {
    await prisma.priceCache.upsert({ where: { ticker }, update: { price }, create: { ticker, price } });
  }
}

export async function getCachedPrices(tickers: string[]): Promise<Record<string, number>> {
  const rows = await prisma.priceCache.findMany({ where: { ticker: { in: tickers } } });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.ticker] = r.price;
  return out;
}
```

- [ ] **Step 6: Jalankan test + typecheck**

Run: `npm run test -- tests/fmp-quote.test.ts && npx tsc --noEmit`
Expected: PASS + TYPECHECK OK.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add FMP fetchQuotes and price cache"
```

---

### Task 3: portfolioSummary + donutData (murni)

**Files:**
- Create: `src/lib/portfolio.ts`, `tests/portfolio.test.ts`

**Interfaces:**
- Consumes: `Position` (`@/lib/types`).
- Produces:
  - `type SummaryRow = { ticker: string; qty: number; avgCost: number; price: number; value: number; pnlAbs: number; pnlPct: number }`
  - `portfolioSummary(positions: Position[], prices: Record<string, number>): { totalValue: number; totalCost: number; pnlAbs: number; pnlPct: number; rows: SummaryRow[] }`
  - `donutData(rows: SummaryRow[]): Array<{ name: string; value: number }>`

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/portfolio.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { portfolioSummary, donutData } from "@/lib/portfolio";

const positions = [
  { ticker: "A", qty: 2, avgCost: 100, costBasis: 200 },
  { ticker: "B", qty: 1, avgCost: 100, costBasis: 100 },
];

describe("portfolioSummary", () => {
  test("hitung nilai, pnl, dan baris", () => {
    const s = portfolioSummary(positions, { A: 150, B: 50 });
    expect(s.totalValue).toBe(350); // 2*150 + 1*50
    expect(s.totalCost).toBe(300);
    expect(s.pnlAbs).toBe(50);
    expect(s.pnlPct).toBeCloseTo(16.667, 2);
    const a = s.rows.find((r) => r.ticker === "A")!;
    expect(a.value).toBe(300);
    expect(a.pnlAbs).toBe(100);
    expect(a.pnlPct).toBeCloseTo(50, 6);
  });
  test("harga hilang -> price 0, value 0", () => {
    const s = portfolioSummary(positions, { A: 150 });
    const b = s.rows.find((r) => r.ticker === "B")!;
    expect(b.price).toBe(0);
    expect(b.value).toBe(0);
  });
});

describe("donutData", () => {
  test("ubah rows -> {name,value}", () => {
    const s = portfolioSummary(positions, { A: 150, B: 50 });
    expect(donutData(s.rows)).toEqual([
      { name: "A", value: 300 },
      { name: "B", value: 50 },
    ]);
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/portfolio.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

Create `src/lib/portfolio.ts`:
```ts
import type { Position } from "./types";

export type SummaryRow = {
  ticker: string;
  qty: number;
  avgCost: number;
  price: number;
  value: number;
  pnlAbs: number;
  pnlPct: number;
};

export function portfolioSummary(
  positions: Position[],
  prices: Record<string, number>,
): { totalValue: number; totalCost: number; pnlAbs: number; pnlPct: number; rows: SummaryRow[] } {
  const rows: SummaryRow[] = positions.map((p) => {
    const price = prices[p.ticker] ?? 0;
    const value = p.qty * price;
    const pnlAbs = value - p.costBasis;
    const pnlPct = p.costBasis === 0 ? 0 : (pnlAbs / p.costBasis) * 100;
    return { ticker: p.ticker, qty: p.qty, avgCost: p.avgCost, price, value, pnlAbs, pnlPct };
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalCost = positions.reduce((s, p) => s + p.costBasis, 0);
  const pnlAbs = totalValue - totalCost;
  const pnlPct = totalCost === 0 ? 0 : (pnlAbs / totalCost) * 100;
  return { totalValue, totalCost, pnlAbs, pnlPct, rows };
}

export function donutData(rows: SummaryRow[]): Array<{ name: string; value: number }> {
  return rows.map((r) => ({ name: r.ticker, value: r.value }));
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/portfolio.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add portfolio summary and donut data helpers"
```

---

### Task 4: Dashboard baru (stat cards + donut + tabel posisi)

**Files:**
- Create: `src/app/dashboard/actions.ts`, `src/components/RefreshPricesButton.tsx`, `src/components/AllocationDonut.tsx`
- Modify: `src/app/page.tsx`, `messages/{id,en}.json`

**Interfaces:**
- Consumes: `getTransactions` (ada), `positionsFromTx` (ada), `portfolioSummary`/`donutData` (Task 3), `fetchQuotes` (Task 2), `savePrices`/`getCachedPrices` (Task 2), `getFmpKeys` (ada).

**Catatan chart:** muat skill `dataviz` sebelum menulis `AllocationDonut`.

- [ ] **Step 1: i18n keys**

Tambah ke `messages/id.json` (dan EN):
```json
"dashboard": {
  "totalValue": "Total Nilai", "pnl": "PnL", "positions": "Posisi",
  "refreshPrices": "Refresh harga", "allocation": "Alokasi (nilai pasar)",
  "ticker": "Ticker", "qty": "Jumlah", "avgCost": "Avg Cost", "price": "Harga", "value": "Nilai",
  "noPrices": "Belum ada harga. Klik Refresh harga."
}
```
EN: padanan (Total Value / PnL / Positions / Refresh prices / Allocation (market value) / Ticker / Qty / Avg Cost / Price / Value / No prices yet. Click Refresh prices.).

- [ ] **Step 2: Action refresh harga**

Create `src/app/dashboard/actions.ts`:
```ts
"use server";
import { getTransactions, savePrices, getCachedPrices } from "@/lib/repo";
import { positionsFromTx } from "@/lib/holdings";
import { fetchQuotes, getFmpKeys } from "@/lib/fmp";
import { revalidatePath } from "next/cache";

export async function fetchAndCachePrices(): Promise<{ ok: boolean }> {
  const txs = await getTransactions();
  const tickers = positionsFromTx(txs).map((p) => p.ticker);
  const key = getFmpKeys()[0];
  if (!key || tickers.length === 0) return { ok: false };
  const prices = await fetchQuotes(tickers, undefined, key);
  await savePrices(prices);
  revalidatePath("/");
  return { ok: Object.keys(prices).length > 0 };
}
```

- [ ] **Step 3: RefreshPricesButton**

Create `src/components/RefreshPricesButton.tsx`:
```tsx
"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { fetchAndCachePrices } from "@/app/dashboard/actions";

export default function RefreshPricesButton() {
  const t = useTranslations("dashboard");
  const [isPending, start] = useTransition();
  return (
    <Button size="sm" disabled={isPending} onClick={() => start(async () => { await fetchAndCachePrices(); })}>
      {t("refreshPrices")}
    </Button>
  );
}
```

- [ ] **Step 4: AllocationDonut (Recharts)**

Create `src/components/AllocationDonut.tsx`:
```tsx
"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777"];

export default function AllocationDonut({ data }: { data: Array<{ name: string; value: number }> }) {
  if (data.every((d) => d.value === 0)) return null;
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => v.toFixed(2)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Dashboard page**

Replace `src/app/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { getTransactions, getCachedPrices } from "@/lib/repo";
import { positionsFromTx } from "@/lib/holdings";
import { portfolioSummary, donutData } from "@/lib/portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import RefreshPricesButton from "@/components/RefreshPricesButton";
import AllocationDonut from "@/components/AllocationDonut";

export default async function Home() {
  const t = await getTranslations("dashboard");
  const positions = positionsFromTx(await getTransactions());
  const prices = await getCachedPrices(positions.map((p) => p.ticker));
  const s = portfolioSummary(positions, prices);
  const hasPrices = Object.keys(prices).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <RefreshPricesButton />
      </div>

      {!hasPrices && <p className="text-amber-600 text-sm">{t("noPrices")}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{t("totalValue")}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">${s.totalValue.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{t("pnl")}</CardTitle></CardHeader>
          <CardContent className={`text-2xl font-bold ${s.pnlAbs >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${s.pnlAbs.toFixed(2)} ({s.pnlPct.toFixed(2)}%)</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{t("positions")}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{positions.length}</CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("allocation")}</CardTitle></CardHeader>
          <CardContent><AllocationDonut data={donutData(s.rows)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("positions")}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("ticker")}</TableHead><TableHead>{t("price")}</TableHead>
                <TableHead>{t("value")}</TableHead><TableHead>{t("pnl")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {s.rows.map((r) => (
                  <TableRow key={r.ticker}>
                    <TableCell><a className="underline" href={`/stock/${r.ticker}`}>{r.ticker}</a></TableCell>
                    <TableCell>${r.price.toFixed(2)}</TableCell>
                    <TableCell>${r.value.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={r.pnlAbs >= 0 ? "default" : "destructive"}>
                        {r.pnlPct.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verifikasi**

Run: `npm run test && npx tsc --noEmit && npm run build`
Expected: test PASS (parity termasuk), TYPECHECK OK, build sukses.

Manual: `npm run dev`, buka `/`, klik "Refresh harga" → stat cards & donut terisi; posisi dgn PnL badge.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add live dashboard (stat cards, allocation donut, positions table)"
```

---

### Task 5: Refactor Recommendation + Review ke shadcn

**Files:**
- Modify: `src/app/recommendation/page.tsx`, `src/app/review/page.tsx`, `src/components/RunReviewButton.tsx`

**Interfaces:**
- Consumes: komponen shadcn (Task 1), data existing (tak berubah).

- [ ] **Step 1: Recommendation ke Card/Table/Badge**

Replace isi `src/app/recommendation/page.tsx` (pertahankan `getData()` yang ada, ganti markup):
```tsx
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

async function getData() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/recommendation`, { cache: "no-store" });
  return res.json() as Promise<{ scores: Record<string, number>; allocation: Record<string, number>; activeCaps: string[] }>;
}

export default async function RecommendationPage() {
  const t = await getTranslations("recommendation");
  const data = await getData();
  const rows = Object.keys(data.allocation).sort((a, b) => data.allocation[b] - data.allocation[a]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {data.activeCaps.length > 0 && (
        <div className="flex gap-2">{data.activeCaps.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}</div>
      )}
      <Card><CardHeader><CardTitle>{t("allocation")}</CardTitle></CardHeader><CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("ticker")}</TableHead><TableHead>{t("score")}</TableHead><TableHead>{t("allocation")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((tk) => (
              <TableRow key={tk}>
                <TableCell><a className="underline" href={`/stock/${tk}`}>{tk}</a></TableCell>
                <TableCell>{data.scores[tk]?.toFixed(1)}</TableCell>
                <TableCell>{data.allocation[tk].toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
```

- [ ] **Step 2: Review ke Card/Table/Badge**

Replace markup `src/app/review/page.tsx` (pertahankan query `getSnapshot`/`listQuarters`):
```tsx
import { getTranslations } from "next-intl/server";
import { getSnapshot, listQuarters } from "@/lib/repo";
import RunReviewButton from "@/components/RunReviewButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ReviewPage({ searchParams }: { searchParams: { q?: string } }) {
  const t = await getTranslations("review");
  const quarters = await listQuarters();
  const quarter = searchParams.q ?? quarters[0];
  const snap = quarter ? await getSnapshot(quarter) : null;
  const entries = (snap?.entries ?? []).slice().sort((a, b) => b.allocationPct - a.allocationPct);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <RunReviewButton />
      </div>
      {quarters.length > 0 && (
        <form className="text-sm flex items-center gap-2">
          <label>{t("quarter")}:</label>
          <select name="q" defaultValue={quarter} className="border rounded px-2 py-1 bg-background">
            {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <button className="underline" type="submit">↻</button>
        </form>
      )}
      {!snap && <p className="text-muted-foreground">{t("noSnapshot")}</p>}
      {snap && (
        <Card><CardHeader><CardTitle>{quarter}</CardTitle></CardHeader><CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t("ticker")}</TableHead><TableHead>{t("score")}</TableHead><TableHead>{t("allocation")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.ticker}>
                  <TableCell><a className="underline" href={`/stock/${e.ticker}`}>{e.ticker}</a></TableCell>
                  <TableCell>{e.compositeScore.toFixed(1)}</TableCell>
                  <TableCell><Badge variant="secondary">{e.allocationPct.toFixed(1)}%</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: RunReviewButton pakai Button shadcn**

Di `src/components/RunReviewButton.tsx`, ganti elemen `<button ...>` menjadi `<Button ...>` dari `@/components/ui/button` (import ditambah); pertahankan logika `useTransition`/`runReview`.

- [ ] **Step 4: Verifikasi + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: OK.
```bash
git add -A && git commit -m "feat: refactor recommendation & review pages to shadcn"
```

---

### Task 6: Refactor Stockcard + Settings ke shadcn

**Files:**
- Modify: `src/app/stock/[ticker]/page.tsx`, `src/app/settings/SettingsForm.tsx`

**Interfaces:**
- Consumes: komponen shadcn (Task 1), data existing.

- [ ] **Step 1: Stockcard ke Card + Badge + bar confidence**

Replace markup blok `ai` di `src/app/stock/[ticker]/page.tsx` menjadi:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// ... di dalam return, ganti blok {ai && ...}:
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {ticker}
              <Badge>{ai.decision}</Badge>
              <Badge variant="secondary">{(ai.criteria as any).moat?.label} moat</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><b>{t("reason")}:</b> {ai.reason}</p>
            <div>
              <b>{t("confidence")}:</b>
              <div className="h-2 w-40 rounded bg-muted mt-1">
                <div className="h-2 rounded bg-blue-600" style={{ width: `${ai.confidence * 100}%` }} />
              </div>
            </div>
            <div>
              <b>{t("criteria")}:</b>
              <div className="flex flex-wrap gap-2 mt-1">
                {AI_CRITERIA.map((k) => {
                  const c = (ai.criteria as any)[k];
                  return <Badge key={k} variant="outline">{k}: {c?.score}</Badge>;
                })}
              </div>
            </div>
            <div>
              <b>{t("risks")}:</b>
              <ul className="list-disc ml-6">{(ai.keyRisks as string[]).map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
            <p className="text-xs text-muted-foreground">{ai.provider} · {ai.model} · {quarter}</p>
          </CardContent>
        </Card>
```
(Pertahankan bagian `!ai` empty-state; bungkus judul halaman dgn `text-2xl font-bold`.)

- [ ] **Step 2: Settings form pakai Card sections**

Di `src/app/settings/SettingsForm.tsx`, bungkus tiap `<section>` dengan `<Card><CardContent className="pt-6 space-y-2">...`, ganti `<input>`/`<select>`/`<button>` ke `Input`/`Select`(atau biarkan native select bila lebih cepat)/`Button` shadcn. Minimal: import `Card, CardContent` dan `Button`, ganti tombol Simpan & Fetch/Refresh ke `Button`, bungkus section dgn Card. Pertahankan seluruh state & handler.

- [ ] **Step 3: Verifikasi + commit**

Run: `npm run test && npx tsc --noEmit && npm run build`
Expected: test PASS, TYPECHECK OK, build sukses.
```bash
git add -A && git commit -m "feat: refactor stockcard & settings to shadcn"
```

---

## Self-Review

**Spec coverage:**
- shadcn/ui + next-themes + recharts → Task 1 (+ Task 4 donut). ✓
- Sidebar bergrup extensible + topbar + theme toggle → Task 1. ✓
- Harga live FMP `/stable/quote` + cache + fallback → Task 2 + Task 4 (dashboard baca cache, tombol refresh). ✓
- `portfolioSummary` + donut data (murni, teruji) → Task 3. ✓
- Dashboard stat cards + donut + tabel posisi → Task 4. ✓
- Refactor Recommendation/Review/Stockcard/Settings → Task 5 + Task 6. ✓
- i18n parity → keys ditambah tiap task, test parity dijalankan. ✓
- Testing unit (portfolioSummary, fetchQuotes, donutData) → Task 2,3. ✓

**Placeholder scan:** tidak ada TBD/TODO; tiap step berisi kode/perintah nyata. shadcn CLI dijalankan dgn flag non-interaktif (`init -d`, `add --yes`).

**Type consistency:** `SummaryRow`/`portfolioSummary`/`donutData` konsisten (Task 3 ↔ Task 4). `fetchQuotes` signature sama (Task 2 def ↔ Task 4 action). `getCachedPrices`/`savePrices` konsisten (Task 2 ↔ Task 4). Komponen shadcn diimport dari `@/components/ui/*` seragam.

**Catatan:** Dashboard sengaja baca **cache** (bukan fetch saat render) agar tidak menembak FMP tiap load; tombol "Refresh harga" yang memicu fetch+cache. Chart: muat skill `dataviz` sebelum Task 4 Step 4.
