# Fase 3d — Alur Portfolio & Navigasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Halaman Portfolio dengan form Log DCA budget-driven (menutup gap "tidak ada UI input transaksi"), navigasi sidebar yang lebih jelas (grup collapsible "Alokasi & Keputusan"), dan tab penjelas di 3 halaman lama.

**Architecture:** Fungsi murni (`dca.ts`, `wib.ts`) untuk kalkulasi & waktu WIB — teruji unit. Logika rekomendasi diekstrak jadi `getCurrentAllocation()` (dipakai langsung oleh server action baru, **tanpa** self-fetch HTTP — menghindari anti-pattern lama). Repo ditambah fungsi transaksi (list/hapus/batch-tambah). UI: halaman `/portfolio` baru + `DecisionTabs` di 3 halaman lama + Sidebar collapsible.

**Tech Stack:** Next.js 14, TypeScript, Prisma, Vitest, next-intl, shadcn/ui.

## Global Constraints

- **Route lama tidak dipindah** (`/recommendation`, `/review`, `/compare` tetap ada apa adanya).
- Waktu transaksi: **tanggal+jam eksplisit WIB (UTC+7, tanpa DST)** — konsisten apa pun timezone proses yang menjalankan server.
- Budget DCA dalam **USD langsung**, tanpa konversi kurs.
- Tidak ada edit transaksi in-place — hanya **hapus** (dengan konfirmasi).
- Fungsi murni di `src/lib/**` tanpa import React/Next/Prisma → wajib unit test.
- Server action baru **tidak** melakukan self-fetch HTTP ke `/api/*` sendiri — panggil fungsi logika langsung.
- i18n: teks baru di `messages/{id,en}.json`, parity test dijaga; reuse key `dashboard.*` yang sudah ada (ticker/price/value/pnl/qty/avgCost) alih-alih duplikasi.
- Frequent commits. Spec: `docs/superpowers/specs/2026-07-05-fase-3d-portfolio-flow-design.md`.

---

## File Structure

```
src/lib/dca.ts                     # suggestDcaAmounts (murni)
src/lib/wib.ts                     # parseWibDatetimeLocal, formatWib (murni)
src/lib/recommendation.ts          # getCurrentAllocation (extract dari route)
src/app/api/recommendation/route.ts # (modify) pakai getCurrentAllocation()
src/lib/repo.ts                    # (modify) getAllTransactions, deleteTransaction, addTransactions
src/components/DecisionTabs.tsx    # tab strip untuk 3 halaman lama
src/app/recommendation/page.tsx    # (modify) tambah <DecisionTabs/>
src/app/review/page.tsx            # (modify) tambah <DecisionTabs/>
src/app/compare/page.tsx           # (modify) tambah <DecisionTabs/>
src/components/shell/Sidebar.tsx   # (modify) collapsible groups + portfolio + decisions
src/app/portfolio/page.tsx         # halaman Portfolio
src/app/portfolio/actions.ts       # previewDca, confirmDca, removeTransaction
src/app/portfolio/LogDcaForm.tsx   # form client budget-driven
src/components/DeleteTransactionButton.tsx
src/app/page.tsx                  # (modify) hapus tabel posisi, tambah link Portfolio
messages/{id,en}.json             # (modify)
tests/dca.test.ts
tests/wib.test.ts
```

---

### Task 1: Fungsi murni `dca.ts` + `wib.ts` (TDD)

**Files:**
- Create: `src/lib/dca.ts`, `src/lib/wib.ts`, `tests/dca.test.ts`, `tests/wib.test.ts`

**Interfaces:**
- Produces:
  - `type DcaSuggestion = { ticker: string; allocationPct: number; suggestedUsd: number; suggestedQty: number; price: number }`
  - `suggestDcaAmounts(budgetUsd: number, allocation: Record<string, number>, prices: Record<string, number>): DcaSuggestion[]`
  - `parseWibDatetimeLocal(value: string): Date`
  - `formatWib(date: Date): string`

- [ ] **Step 1: Tulis test dca — pastikan gagal**

Create `tests/dca.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { suggestDcaAmounts } from "@/lib/dca";

describe("suggestDcaAmounts", () => {
  test("split proporsional sesuai alokasi %, qty dari usd/harga", () => {
    const result = suggestDcaAmounts(1000, { NVDA: 60, MSFT: 40 }, { NVDA: 100, MSFT: 50 });
    expect(result).toEqual([
      { ticker: "NVDA", allocationPct: 60, suggestedUsd: 600, suggestedQty: 6, price: 100 },
      { ticker: "MSFT", allocationPct: 40, suggestedUsd: 400, suggestedQty: 8, price: 50 },
    ]);
  });

  test("ticker tanpa harga -> suggestedQty 0 (bukan Infinity/NaN)", () => {
    const result = suggestDcaAmounts(1000, { NVDA: 100 }, {});
    expect(result).toEqual([
      { ticker: "NVDA", allocationPct: 100, suggestedUsd: 1000, suggestedQty: 0, price: 0 },
    ]);
  });

  test("budget 0 -> semua suggested 0", () => {
    const result = suggestDcaAmounts(0, { NVDA: 100 }, { NVDA: 100 });
    expect(result[0].suggestedUsd).toBe(0);
    expect(result[0].suggestedQty).toBe(0);
  });
});
```

Run: `npm run test -- tests/dca.test.ts`
Expected: FAIL (module belum ada).

- [ ] **Step 2: Implementasi `dca.ts`**

Create `src/lib/dca.ts`:
```ts
export type DcaSuggestion = {
  ticker: string;
  allocationPct: number;
  suggestedUsd: number;
  suggestedQty: number;
  price: number;
};

export function suggestDcaAmounts(
  budgetUsd: number,
  allocation: Record<string, number>,
  prices: Record<string, number>,
): DcaSuggestion[] {
  return Object.entries(allocation).map(([ticker, allocationPct]) => {
    const price = prices[ticker] ?? 0;
    const suggestedUsd = budgetUsd * (allocationPct / 100);
    const suggestedQty = price > 0 ? suggestedUsd / price : 0;
    return { ticker, allocationPct, suggestedUsd, suggestedQty, price };
  });
}
```

Run: `npm run test -- tests/dca.test.ts`
Expected: PASS (3 test).

- [ ] **Step 3: Tulis test wib — pastikan gagal**

Create `tests/wib.test.ts`:
```ts
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
```

Run: `npm run test -- tests/wib.test.ts`
Expected: FAIL (module belum ada).

- [ ] **Step 4: Implementasi `wib.ts`**

Create `src/lib/wib.ts`:
```ts
/** Terima string datetime-local ("YYYY-MM-DDTHH:mm[:ss]"), perlakukan eksplisit sebagai WIB (UTC+7). */
export function parseWibDatetimeLocal(value: string): Date {
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}+07:00`);
}

/** Format Date (tersimpan UTC-internal) kembali ke tampilan WIB, deterministik lintas locale. */
export function formatWib(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} WIB`;
}
```

- [ ] **Step 5: Jalankan semua test — pastikan lulus**

Run: `npm run test -- tests/dca.test.ts tests/wib.test.ts`
Expected: PASS (6 test total).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add DCA suggestion and WIB datetime pure helpers"
```

---

### Task 2: Ekstrak `getCurrentAllocation()` (hindari self-fetch)

**Files:**
- Create: `src/lib/recommendation.ts`
- Modify: `src/app/api/recommendation/route.ts`

**Interfaces:**
- Consumes: `getTransactions`, `getGroupWeights`, `getCaps`, `getSectors` (ada di `repo.ts`),
  `positionsFromTx` (ada), `compositeScores`/`Criterion` (ada), `recommendAllocation` (ada), `prisma` (ada).
- Produces: `getCurrentAllocation(): Promise<{ scores: Record<string, number>; allocation: Record<string, number>; activeCaps: string[] }>`

- [ ] **Step 1: Implementasi (pindahkan logika dari route, tanpa mengubah perilaku)**

Create `src/lib/recommendation.ts`:
```ts
import { getTransactions, getGroupWeights, getCaps, getSectors } from "./repo";
import { positionsFromTx } from "./holdings";
import { compositeScores, type Criterion } from "./scoring";
import { recommendAllocation } from "./allocation";
import { prisma } from "./db";

export async function getCurrentAllocation(): Promise<{
  scores: Record<string, number>;
  allocation: Record<string, number>;
  activeCaps: string[];
}> {
  const txs = await getTransactions();
  const positions = positionsFromTx(txs);
  const tickers = positions.map((p) => p.ticker);

  const rows = await prisma.criterionScore.findMany({ where: { ticker: { in: tickers } } });
  const criteria: Criterion[] = [];
  const seen = new Set<string>();
  const raw: Record<string, Record<string, number>> = {};
  for (const t of tickers) raw[t] = {};
  for (const r of rows) {
    raw[r.ticker][r.key] = r.rawValue;
    const id = `${r.group}:${r.key}`;
    if (!seen.has(id)) {
      criteria.push({ key: r.key, group: r.group, direction: "benefit" });
      seen.add(id);
    }
  }
  for (const t of tickers) for (const c of criteria) raw[t][c.key] ??= 50;

  const scores = criteria.length
    ? compositeScores({ criteria, raw, groupWeights: await getGroupWeights() })
    : Object.fromEntries(tickers.map((t) => [t, 50]));

  const rec = recommendAllocation({
    scores,
    sectors: await getSectors(),
    caps: await getCaps(),
    aggressiveness: 1,
  });

  return { scores, ...rec };
}
```

- [ ] **Step 2: Sederhanakan route agar memanggil fungsi ini**

Replace `src/app/api/recommendation/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getCurrentAllocation } from "@/lib/recommendation";

export async function GET() {
  return NextResponse.json(await getCurrentAllocation());
}
```

- [ ] **Step 3: Typecheck + full test**

Run: `npx tsc --noEmit && npm run test`
Expected: TYPECHECK OK, semua test lama tetap PASS (perilaku endpoint tidak berubah).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: extract getCurrentAllocation for reuse without self-fetch"
```

---

### Task 3: Repo — transaksi (list/hapus/batch-tambah)

**Files:**
- Modify: `src/lib/repo.ts`

**Interfaces:**
- Produces:
  - `getAllTransactions(): Promise<Array<{ id: string; ticker: string; qty: number; price: number; date: Date }>>`
  - `deleteTransaction(id: string): Promise<void>`
  - `addTransactions(rows: Array<{ ticker: string; qty: number; price: number; date: Date }>): Promise<void>`

- [ ] **Step 1: Tambah fungsi (di `src/lib/repo.ts`, setelah `getAllAiAnalyses`)**

```ts
export async function getAllTransactions(): Promise<
  Array<{ id: string; ticker: string; qty: number; price: number; date: Date }>
> {
  const rows = await prisma.transaction.findMany({ orderBy: { date: "desc" } });
  return rows.map((r) => ({ id: r.id, ticker: r.ticker, qty: r.qty, price: r.price, date: r.date }));
}

export async function deleteTransaction(id: string): Promise<void> {
  await prisma.transaction.delete({ where: { id } });
}

export async function addTransactions(
  rows: Array<{ ticker: string; qty: number; price: number; date: Date }>,
): Promise<void> {
  for (const r of rows) {
    await prisma.company.upsert({
      where: { ticker: r.ticker },
      update: {},
      create: { ticker: r.ticker, name: r.ticker },
    });
    await prisma.transaction.create({ data: r });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: TYPECHECK OK.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add repo functions for transaction list/delete/batch-add"
```

---

### Task 4: `DecisionTabs` + wire ke 3 halaman lama

**Files:**
- Create: `src/components/DecisionTabs.tsx`
- Modify: `src/app/recommendation/page.tsx`, `src/app/review/page.tsx`, `src/app/compare/page.tsx`

**Interfaces:**
- Consumes: `useTranslations("nav")` (key `recommendation`/`review`/`compare` sudah ada).

- [ ] **Step 1: Implementasi**

Create `src/components/DecisionTabs.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const TABS = [
  { href: "/recommendation", key: "recommendation" },
  { href: "/review", key: "review" },
  { href: "/compare", key: "compare" },
];

export default function DecisionTabs() {
  const t = useTranslations("nav");
  const path = usePathname();
  return (
    <div className="flex gap-2 border-b border-border pb-2 mb-4">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-3 py-1.5 rounded-t text-sm ${
            path === tab.href
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50"
          }`}
        >
          {t(tab.key)}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Pasang di `src/app/recommendation/page.tsx`**

Tambahkan import `import DecisionTabs from "@/components/DecisionTabs";` dan sisipkan
`<DecisionTabs />` tepat setelah pembuka `<div className="space-y-4">`, sebelum `<h1>`.

- [ ] **Step 3: Pasang di `src/app/review/page.tsx`**

Sama seperti Step 2 — sisipkan `<DecisionTabs />` sebelum `<div className="flex items-center justify-between">` yang berisi `<h1>`.

- [ ] **Step 4: Pasang di `src/app/compare/page.tsx`**

Sama seperti Step 2 — sisipkan `<DecisionTabs />` sebelum `<h1>` di kedua cabang return (yang
`quarterCount < 2` dan yang normal).

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: TYPECHECK OK.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add DecisionTabs linking recommendation/review/compare"
```

---

### Task 5: Sidebar collapsible + i18n nav

**Files:**
- Modify: `src/components/shell/Sidebar.tsx`, `messages/id.json`, `messages/en.json`

**Interfaces:**
- Produces: sidebar dengan grup "stocks" (Dashboard, Portfolio), grup collapsible "decisions"
  (Rekomendasi/Review/Compare), grup "config" (Settings).

- [ ] **Step 1: i18n — tambah `nav.portfolio` & `nav.decisions`**

Di `messages/id.json`, ubah blok `"nav"`:
```json
"nav": {
  "stocks": "Saham",
  "config": "Konfigurasi",
  "dashboard": "Dashboard",
  "portfolio": "Portfolio",
  "decisions": "Alokasi & Keputusan",
  "recommendation": "Rekomendasi",
  "review": "Review",
  "compare": "Perbandingan",
  "settings": "Pengaturan"
},
```
Di `messages/en.json`:
```json
"nav": {
  "stocks": "Stocks",
  "config": "Config",
  "dashboard": "Dashboard",
  "portfolio": "Portfolio",
  "decisions": "Allocation & Decisions",
  "recommendation": "Recommendation",
  "review": "Review",
  "compare": "Compare",
  "settings": "Settings"
},
```

- [ ] **Step 2: Implementasi Sidebar collapsible**

Replace `src/components/shell/Sidebar.tsx`:
```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const GROUPS = [
  {
    key: "stocks",
    collapsible: false,
    items: [
      { href: "/", key: "dashboard" },
      { href: "/portfolio", key: "portfolio" },
    ],
  },
  {
    key: "decisions",
    collapsible: true,
    items: [
      { href: "/recommendation", key: "recommendation" },
      { href: "/review", key: "review" },
      { href: "/compare", key: "compare" },
    ],
  },
  { key: "config", collapsible: false, items: [{ href: "/settings", key: "settings" }] },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const path = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ decisions: true });

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4 hidden md:block">
      <div className="font-bold mb-4">Investment SPK</div>
      <nav className="space-y-4">
        {GROUPS.map((g) => {
          const isOpen = !g.collapsible || openGroups[g.key];
          return (
            <div key={g.key}>
              <button
                type="button"
                className="w-full text-left text-xs uppercase text-muted-foreground mb-1 flex items-center justify-between"
                onClick={() => g.collapsible && setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))}
              >
                <span>{t(g.key)}</span>
                {g.collapsible && <span>{isOpen ? "▾" : "▸"}</span>}
              </button>
              {isOpen && (
                <ul className="space-y-1">
                  {g.items.map((it) => (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={`block rounded px-2 py-1 text-sm ${
                          path === it.href
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        {t(it.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Verifikasi parity + typecheck**

Run: `npm run test -- tests/i18n-parity.test.ts && npx tsc --noEmit`
Expected: parity PASS, TYPECHECK OK.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: restructure sidebar into collapsible groups, add portfolio nav"
```

---

### Task 6: Halaman Portfolio (holdings + Log DCA + riwayat + hapus)

**Files:**
- Create: `src/app/portfolio/page.tsx`, `src/app/portfolio/actions.ts`, `src/app/portfolio/LogDcaForm.tsx`, `src/components/DeleteTransactionButton.tsx`
- Modify: `messages/id.json`, `messages/en.json`

**Interfaces:**
- Consumes: `getTransactions`, `getCachedPrices`, `getAllTransactions`, `deleteTransaction`,
  `addTransactions` (Task 3), `positionsFromTx` (ada), `portfolioSummary` (ada),
  `getCurrentAllocation` (Task 2), `suggestDcaAmounts`/`DcaSuggestion` (Task 1),
  `parseWibDatetimeLocal`/`formatWib` (Task 1).

- [ ] **Step 1: i18n — tambah namespace `portfolio` + `dashboard.viewPortfolio`**

Di `messages/id.json`, tambahkan setelah blok `"compare"`:
```json
"portfolio": {
  "title": "Portfolio",
  "holdings": "Kepemilikan",
  "logDca": "Log DCA",
  "history": "Riwayat Transaksi",
  "budgetUsd": "Total Budget (USD)",
  "purchaseDatetime": "Tanggal & Jam Pembelian (WIB)",
  "preview": "Preview Alokasi",
  "allocationPct": "Alokasi %",
  "suggestedUsd": "USD Sugesti",
  "confirmSave": "Konfirmasi & Simpan",
  "saved": "Transaksi tersimpan",
  "datetimeWib": "Tanggal & Jam (WIB)",
  "delete": "Hapus",
  "confirmDelete": "Hapus transaksi ini?"
},
```
Dan tambahkan `"viewPortfolio": "Lihat Portfolio"` ke dalam blok `"dashboard"` yang sudah ada.

`messages/en.json`, setelah blok `"compare"`:
```json
"portfolio": {
  "title": "Portfolio",
  "holdings": "Holdings",
  "logDca": "Log DCA",
  "history": "Transaction History",
  "budgetUsd": "Total Budget (USD)",
  "purchaseDatetime": "Purchase Date & Time (WIB)",
  "preview": "Preview Allocation",
  "allocationPct": "Allocation %",
  "suggestedUsd": "Suggested USD",
  "confirmSave": "Confirm & Save",
  "saved": "Transaction saved",
  "datetimeWib": "Date & Time (WIB)",
  "delete": "Delete",
  "confirmDelete": "Delete this transaction?"
},
```
Dan tambahkan `"viewPortfolio": "View Portfolio"` ke blok `"dashboard"`.

- [ ] **Step 2: Server actions**

Create `src/app/portfolio/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  getCachedPrices,
  deleteTransaction,
  addTransactions,
} from "@/lib/repo";
import { getCurrentAllocation } from "@/lib/recommendation";
import { suggestDcaAmounts, type DcaSuggestion } from "@/lib/dca";
import { parseWibDatetimeLocal } from "@/lib/wib";

export async function previewDca(budgetUsd: number): Promise<DcaSuggestion[]> {
  const { allocation } = await getCurrentAllocation();
  const tickers = Object.keys(allocation);
  const prices = await getCachedPrices(tickers);
  return suggestDcaAmounts(budgetUsd, allocation, prices);
}

export async function confirmDca(
  rows: Array<{ ticker: string; qty: number; price: number }>,
  datetimeLocal: string,
): Promise<{ ok: true }> {
  const date = parseWibDatetimeLocal(datetimeLocal);
  const toSave = rows.filter((r) => r.qty > 0).map((r) => ({ ...r, date }));
  await addTransactions(toSave);
  revalidatePath("/portfolio");
  revalidatePath("/");
  return { ok: true };
}

export async function removeTransaction(id: string): Promise<{ ok: true }> {
  await deleteTransaction(id);
  revalidatePath("/portfolio");
  revalidatePath("/");
  return { ok: true };
}
```

- [ ] **Step 3: Form Log DCA (client)**

Create `src/app/portfolio/LogDcaForm.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { previewDca, confirmDca } from "./actions";
import type { DcaSuggestion } from "@/lib/dca";

function nowWibForInput(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default function LogDcaForm() {
  const t = useTranslations("portfolio");
  const td = useTranslations("dashboard");
  const [isPending, start] = useTransition();
  const [budget, setBudget] = useState(0);
  const [datetimeLocal, setDatetimeLocal] = useState(nowWibForInput());
  const [rows, setRows] = useState<DcaSuggestion[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end flex-wrap">
        <label className="text-sm">
          {t("budgetUsd")}
          <Input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-32"
          />
        </label>
        <label className="text-sm">
          {t("purchaseDatetime")}
          <Input
            type="datetime-local"
            value={datetimeLocal}
            onChange={(e) => setDatetimeLocal(e.target.value)}
          />
        </label>
        <Button
          disabled={isPending || budget <= 0}
          onClick={() => start(async () => setRows(await previewDca(budget)))}
        >
          {t("preview")}
        </Button>
      </div>

      {rows.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td("ticker")}</TableHead>
                <TableHead>{t("allocationPct")}</TableHead>
                <TableHead>{t("suggestedUsd")}</TableHead>
                <TableHead>{td("qty")}</TableHead>
                <TableHead>{td("price")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.ticker}>
                  <TableCell>{r.ticker}</TableCell>
                  <TableCell>{r.allocationPct.toFixed(1)}%</TableCell>
                  <TableCell>${r.suggestedUsd.toFixed(2)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      value={r.suggestedQty}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...r, suggestedQty: Number(e.target.value) };
                        setRows(next);
                      }}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={r.price}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...r, price: Number(e.target.value) };
                        setRows(next);
                      }}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            disabled={isPending}
            onClick={() =>
              start(async () => {
                await confirmDca(
                  rows.map((r) => ({ ticker: r.ticker, qty: r.suggestedQty, price: r.price })),
                  datetimeLocal,
                );
                setMsg(t("saved"));
                setRows([]);
                setBudget(0);
              })
            }
          >
            {t("confirmSave")}
          </Button>
        </>
      )}
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Tombol hapus transaksi (client)**

Create `src/components/DeleteTransactionButton.tsx`:
```tsx
"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { removeTransaction } from "@/app/portfolio/actions";

export default function DeleteTransactionButton({ id }: { id: string }) {
  const t = useTranslations("portfolio");
  const [isPending, start] = useTransition();
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (confirm(t("confirmDelete"))) {
          start(async () => {
            await removeTransaction(id);
          });
        }
      }}
    >
      {t("delete")}
    </Button>
  );
}
```

- [ ] **Step 5: Halaman Portfolio (server)**

Create `src/app/portfolio/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { getTransactions, getCachedPrices, getAllTransactions } from "@/lib/repo";
import { positionsFromTx } from "@/lib/holdings";
import { portfolioSummary } from "@/lib/portfolio";
import { formatWib } from "@/lib/wib";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LogDcaForm from "./LogDcaForm";
import DeleteTransactionButton from "@/components/DeleteTransactionButton";

export default async function PortfolioPage() {
  const t = await getTranslations("portfolio");
  const td = await getTranslations("dashboard");
  const positions = positionsFromTx(await getTransactions());
  const prices = await getCachedPrices(positions.map((p) => p.ticker));
  const s = portfolioSummary(positions, prices);
  const transactions = await getAllTransactions();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("holdings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td("ticker")}</TableHead>
                <TableHead>{td("qty")}</TableHead>
                <TableHead>{td("avgCost")}</TableHead>
                <TableHead>{td("price")}</TableHead>
                <TableHead>{td("value")}</TableHead>
                <TableHead>{td("pnl")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.rows.map((r) => (
                <TableRow key={r.ticker}>
                  <TableCell>
                    <a className="underline" href={`/stock/${r.ticker}`}>
                      {r.ticker}
                    </a>
                  </TableCell>
                  <TableCell>{r.qty}</TableCell>
                  <TableCell>${r.avgCost.toFixed(2)}</TableCell>
                  <TableCell>${r.price.toFixed(2)}</TableCell>
                  <TableCell>${r.value.toFixed(2)}</TableCell>
                  <TableCell>{r.pnlPct.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("logDca")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LogDcaForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td("ticker")}</TableHead>
                <TableHead>{td("qty")}</TableHead>
                <TableHead>{td("price")}</TableHead>
                <TableHead>{t("datetimeWib")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{tx.ticker}</TableCell>
                  <TableCell>{tx.qty}</TableCell>
                  <TableCell>${tx.price.toFixed(2)}</TableCell>
                  <TableCell>{formatWib(tx.date)}</TableCell>
                  <TableCell>
                    <DeleteTransactionButton id={tx.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Verifikasi statis**

Run: `npm run test -- tests/i18n-parity.test.ts && npx tsc --noEmit`
Expected: parity PASS, TYPECHECK OK.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add portfolio page (holdings, log DCA form, transaction history)"
```

---

### Task 7: Dashboard — hapus tabel posisi, tambah link Portfolio

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `dashboard.viewPortfolio` (i18n, Task 6).

- [ ] **Step 1: Hapus grid dua-kolom (donut+tabel), ganti tabel dengan link ke Portfolio**

Replace bagian akhir `src/app/page.tsx` (blok `<div className="grid gap-6 md:grid-cols-2">...`)
menjadi:
```tsx
      <Card>
        <CardHeader>
          <CardTitle>{t("allocation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AllocationDonut data={donutData(s.rows)} />
        </CardContent>
      </Card>

      <a className="text-sm underline" href="/portfolio">
        {t("viewPortfolio")} &rarr;
      </a>
```
Hapus import `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` dan `Badge` dari
`src/app/page.tsx` bila sudah tidak dipakai di file itu (cek dengan grep sebelum hapus import).

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: TYPECHECK OK, build sukses.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: simplify dashboard, link to portfolio for holdings detail"
```

---

### Task 8: Verifikasi end-to-end

**Files:** tidak ada file baru — verifikasi manual.

- [ ] **Step 1: Full test suite + build**

Run: `npm run test && npx tsc --noEmit && npm run build`
Expected: semua test PASS, TYPECHECK OK, build sukses.

- [ ] **Step 2: Verifikasi alur Log DCA end-to-end (dev server)**

Run: `npm run dev`, buka `/portfolio`:
1. Isi Total Budget (USD) mis. `500`, tanggal default (now WIB) — klik **Preview Alokasi**.
2. Tabel preview muncul dengan alokasi %, USD sugesti, qty (editable), harga (editable) per ticker.
3. Klik **Konfirmasi & Simpan** — pesan "Transaksi tersimpan" muncul.
4. Cek tabel **Riwayat Transaksi** di bawahnya — baris baru muncul dengan waktu WIB yang benar
   (samakan dengan jam yang diinput, bukan bergeser timezone).
5. Cek tabel **Kepemilikan** di atas — qty/avg cost ter-update mencerminkan transaksi baru.
6. Klik **Hapus** pada salah satu baris riwayat → konfirmasi → baris hilang, kepemilikan
   ter-update kembali (revalidate).

- [ ] **Step 3: Verifikasi navigasi**

- Sidebar: klik "Alokasi & Keputusan" untuk collapse/expand grup; klik tiap sub-link
  (Rekomendasi/Review/Compare) — `DecisionTabs` di atas tiap halaman menyorot tab aktif dan
  bisa lompat ke 2 lainnya.
- Dashboard: tidak ada lagi tabel posisi, ada link "Lihat Portfolio →" yang mengarah ke `/portfolio`.

- [ ] **Step 4: Commit (jika ada penyesuaian dari verifikasi manual)**

```bash
git add -A && git commit -m "fix: address issues found during manual e2e verification" --allow-empty
```
(Gunakan hanya bila ada perubahan riil; jika verifikasi bersih tanpa perubahan, lewati commit ini.)

---

## Self-Review

**Spec coverage:**
- Sidebar collapsible + Portfolio + grup "Alokasi & Keputusan" → Task 5. ✓
- Route lama tidak dipindah, `DecisionTabs` sebagai penjelas → Task 4. ✓
- Tabel posisi pindah dari Dashboard ke Portfolio → Task 6 (holdings) + Task 7 (hapus dari Dashboard). ✓
- Form Log DCA budget-driven (USD, preview editable, konfirmasi) → Task 6. ✓
- Tanggal+jam eksplisit WIB → Task 1 (`parseWibDatetimeLocal`/`formatWib`) + Task 6 (pakai di form & tabel riwayat). ✓
- Hapus transaksi (bukan edit) → Task 3 (`deleteTransaction`) + Task 6 (`DeleteTransactionButton`). ✓
- Hindari self-fetch HTTP untuk logika rekomendasi → Task 2 (`getCurrentAllocation` dipanggil langsung, bukan `fetch()`). ✓
- Testing unit (dca, wib) → Task 1. ✓
- Verifikasi e2e alur penuh → Task 8. ✓

**Placeholder scan:** tidak ada TBD/TODO; tiap step berisi kode nyata. Task 8 Step 4 sengaja
kondisional ("jika ada perubahan") — bukan placeholder logika, itu instruksi eksplisit.

**Type consistency:** `DcaSuggestion` dipakai konsisten Task 1 → Task 6 (`previewDca` return type,
`LogDcaForm` state). `getCurrentAllocation()` return shape sama dipakai Task 2 (route) dan Task 6
(`previewDca`). `getAllTransactions`/`deleteTransaction`/`addTransactions` (Task 3) dipakai persis
sesuai signature di Task 6 actions. `parseWibDatetimeLocal`/`formatWib` (Task 1) dipakai di Task 6
tanpa adaptor tambahan.
