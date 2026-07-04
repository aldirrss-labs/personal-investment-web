# Fase 3c — Perbandingan Antar-Quartal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Halaman `/compare` yang menampilkan evolusi skor, alokasi, decision AI, dan moat rating tiap saham lintas quartal (tabel dari 2 quartal, line chart dari 3 quartal).

**Architecture:** Fungsi murni di `src/lib/compare.ts` menggabung `QuarterlySnapshot`/`SnapshotEntry`/`AiAnalysis` yang sudah ada (tanpa skema baru) menjadi struktur per-ticker. Halaman server component membaca lewat repo baru, olah via fungsi murni, render Card+Table (shadcn) dan Card+LineChart (Recharts, palet sama dengan `AllocationDonut` Fase 3b).

**Tech Stack:** Next.js 14, TypeScript, Prisma, Recharts, shadcn/ui, Vitest, next-intl.

## Global Constraints

- Tidak ada tabel/model Prisma baru — pakai `QuarterlySnapshot`, `SnapshotEntry`, `AiAnalysis` yang ada.
- Tabel muncul dari **2 quartal**; line chart muncul dari **3 quartal**, dibatasi **top 7 ticker** (by `allocationPct` pada quartal terakhir).
- Palet chart: pakai set warna kategorikal tervalidasi yang sama dengan `AllocationDonut` (`src/components/AllocationDonut.tsx`), pilih varian light/dark sesuai `useTheme()`.
- Ticker tanpa data di suatu quartal → cell "—" di UI, bukan error; fungsi murni tidak menyisipkan entry kosong untuk quartal itu.
- Fungsi murni di `src/lib/**` tanpa import React/Next/Prisma → wajib unit test.
- i18n: teks baru di `messages/{id,en}.json`, parity test dijaga. Sidebar: tambah item nav `compare`.
- Frequent commits. Spec: `docs/superpowers/specs/2026-07-05-fase-3c-compare-quarters-design.md`.

---

## File Structure

```
src/lib/compare.ts             # buildComparisonRows, topTickersByLatestAllocation, chartSeries (murni)
src/lib/repo.ts                # (modify) getAllSnapshotsWithEntries, getAllAiAnalyses
src/components/shell/Sidebar.tsx # (modify) tambah item "compare"
src/app/compare/page.tsx       # halaman perbandingan
src/components/ComparisonLineChart.tsx # line chart Recharts
messages/{id,en}.json          # (modify)
tests/compare.test.ts
```

---

### Task 1: Fungsi murni perbandingan (`compare.ts`)

**Files:**
- Create: `src/lib/compare.ts`, `tests/compare.test.ts`

**Interfaces:**
- Produces:
  - `type ComparisonCell = { quarter: string; compositeScore: number; allocationPct: number; decision?: string; moatLabel?: string }`
  - `type SnapshotInput = { quarter: string; entries: Array<{ ticker: string; compositeScore: number; allocationPct: number }> }`
  - `type AnalysisInput = { ticker: string; quarter: string; decision: string; criteria: unknown }`
  - `buildComparisonRows(snapshots: SnapshotInput[], analyses: AnalysisInput[]): Record<string, ComparisonCell[]>`
  - `topTickersByLatestAllocation(rows: Record<string, ComparisonCell[]>, n: number): string[]`
  - `chartSeries(rows: Record<string, ComparisonCell[]>, tickers: string[]): Array<Record<string, number | string>>`

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/compare.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { buildComparisonRows, topTickersByLatestAllocation, chartSeries } from "@/lib/compare";

const snapshots = [
  {
    quarter: "2026Q3",
    entries: [
      { ticker: "NVDA", compositeScore: 80, allocationPct: 30 },
      { ticker: "MSFT", compositeScore: 60, allocationPct: 20 },
    ],
  },
  {
    quarter: "2026Q4",
    entries: [
      { ticker: "NVDA", compositeScore: 85, allocationPct: 35 },
      { ticker: "AMD", compositeScore: 40, allocationPct: 10 },
    ],
  },
];

const analyses = [
  { ticker: "NVDA", quarter: "2026Q3", decision: "Accumulate", criteria: { moat: { label: "Wide", score: 90 } } },
  { ticker: "NVDA", quarter: "2026Q4", decision: "Accumulate", criteria: { moat: { label: "Wide", score: 92 } } },
  { ticker: "MSFT", quarter: "2026Q3", decision: "Hold", criteria: { moat: { label: "Narrow", score: 60 } } },
];

describe("buildComparisonRows", () => {
  test("gabung skor+alokasi+decision+moat per ticker per quartal, urut quartal menaik", () => {
    const rows = buildComparisonRows(snapshots, analyses);
    expect(rows.NVDA).toEqual([
      { quarter: "2026Q3", compositeScore: 80, allocationPct: 30, decision: "Accumulate", moatLabel: "Wide" },
      { quarter: "2026Q4", compositeScore: 85, allocationPct: 35, decision: "Accumulate", moatLabel: "Wide" },
    ]);
  });
  test("ticker tanpa entry di suatu quartal -> array cell lebih pendek (bukan cell kosong)", () => {
    const rows = buildComparisonRows(snapshots, analyses);
    expect(rows.MSFT).toHaveLength(1);
    expect(rows.MSFT[0].quarter).toBe("2026Q3");
    expect(rows.AMD).toHaveLength(1);
    expect(rows.AMD[0].quarter).toBe("2026Q4");
  });
  test("tanpa data AiAnalysis -> decision/moatLabel undefined", () => {
    const rows = buildComparisonRows(snapshots, []);
    expect(rows.AMD[0].decision).toBeUndefined();
    expect(rows.AMD[0].moatLabel).toBeUndefined();
  });
});

describe("topTickersByLatestAllocation", () => {
  test("urut by allocationPct pada cell quartal terakhir tiap ticker, potong ke n", () => {
    const rows = buildComparisonRows(snapshots, analyses);
    expect(topTickersByLatestAllocation(rows, 2)).toEqual(["NVDA", "AMD"]);
  });
});

describe("chartSeries", () => {
  test("bentuk {quarter, [ticker]: score} per quartal, urut menaik", () => {
    const rows = buildComparisonRows(snapshots, analyses);
    const series = chartSeries(rows, ["NVDA", "MSFT"]);
    expect(series).toEqual([
      { quarter: "2026Q3", NVDA: 80, MSFT: 60 },
      { quarter: "2026Q4", NVDA: 85 },
    ]);
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/compare.test.ts`
Expected: FAIL (module belum ada).

- [ ] **Step 3: Implementasi**

Create `src/lib/compare.ts`:
```ts
export type ComparisonCell = {
  quarter: string;
  compositeScore: number;
  allocationPct: number;
  decision?: string;
  moatLabel?: string;
};

export type SnapshotInput = {
  quarter: string;
  entries: Array<{ ticker: string; compositeScore: number; allocationPct: number }>;
};

export type AnalysisInput = { ticker: string; quarter: string; decision: string; criteria: unknown };

function moatLabelFrom(criteria: unknown): string | undefined {
  const c = criteria as { moat?: { label?: string } } | undefined;
  return c?.moat?.label;
}

export function buildComparisonRows(
  snapshots: SnapshotInput[],
  analyses: AnalysisInput[],
): Record<string, ComparisonCell[]> {
  const sorted = [...snapshots].sort((a, b) => a.quarter.localeCompare(b.quarter));
  const analysisByKey = new Map<string, AnalysisInput>();
  for (const a of analyses) analysisByKey.set(`${a.ticker}|${a.quarter}`, a);

  const rows: Record<string, ComparisonCell[]> = {};
  for (const snap of sorted) {
    for (const e of snap.entries) {
      const a = analysisByKey.get(`${e.ticker}|${snap.quarter}`);
      const cell: ComparisonCell = {
        quarter: snap.quarter,
        compositeScore: e.compositeScore,
        allocationPct: e.allocationPct,
        decision: a?.decision,
        moatLabel: moatLabelFrom(a?.criteria),
      };
      (rows[e.ticker] ??= []).push(cell);
    }
  }
  return rows;
}

export function topTickersByLatestAllocation(
  rows: Record<string, ComparisonCell[]>,
  n: number,
): string[] {
  return Object.entries(rows)
    .map(([ticker, cells]) => ({ ticker, latest: cells[cells.length - 1]?.allocationPct ?? 0 }))
    .sort((a, b) => b.latest - a.latest)
    .slice(0, n)
    .map((r) => r.ticker);
}

export function chartSeries(
  rows: Record<string, ComparisonCell[]>,
  tickers: string[],
): Array<Record<string, number | string>> {
  const quarters = Array.from(
    new Set(tickers.flatMap((t) => (rows[t] ?? []).map((c) => c.quarter))),
  ).sort((a, b) => a.localeCompare(b));

  return quarters.map((quarter) => {
    const point: Record<string, number | string> = { quarter };
    for (const t of tickers) {
      const cell = (rows[t] ?? []).find((c) => c.quarter === quarter);
      if (cell) point[t] = cell.compositeScore;
    }
    return point;
  });
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/compare.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add pure comparison helpers (rows, top tickers, chart series)"
```

---

### Task 2: Repo — semua snapshot & analisa AI

**Files:**
- Modify: `src/lib/repo.ts`

**Interfaces:**
- Consumes: `prisma` (ada).
- Produces:
  - `getAllSnapshotsWithEntries(): Promise<Array<{ quarter: string; entries: Array<{ ticker: string; compositeScore: number; allocationPct: number }> }>>`
  - `getAllAiAnalyses(): Promise<Array<{ ticker: string; quarter: string; decision: string; criteria: unknown }>>`

- [ ] **Step 1: Tambah fungsi (di `src/lib/repo.ts`)**

Tambahkan setelah `getCachedPrices`:
```ts
export async function getAllSnapshotsWithEntries(): Promise<
  Array<{
    quarter: string;
    entries: Array<{ ticker: string; compositeScore: number; allocationPct: number }>;
  }>
> {
  const snaps = await prisma.quarterlySnapshot.findMany({
    orderBy: { quarter: "asc" },
    include: { entries: true },
  });
  return snaps.map((s) => ({
    quarter: s.quarter,
    entries: s.entries.map((e) => ({
      ticker: e.ticker,
      compositeScore: e.compositeScore,
      allocationPct: e.allocationPct,
    })),
  }));
}

export async function getAllAiAnalyses(): Promise<
  Array<{ ticker: string; quarter: string; decision: string; criteria: unknown }>
> {
  const rows = await prisma.aiAnalysis.findMany({
    select: { ticker: true, quarter: true, decision: true, criteria: true },
  });
  return rows;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: TYPECHECK OK.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add repo readers for all snapshots and AI analyses"
```

---

### Task 3: Line chart komponen (Recharts)

**Files:**
- Create: `src/components/ComparisonLineChart.tsx`

**Interfaces:**
- Consumes: output `chartSeries` (Task 1) sebagai prop `data`, daftar `tickers: string[]` untuk key garis.

**Catatan:** reuse palet kategorikal tervalidasi yang sama dengan `AllocationDonut.tsx` (skill `dataviz`
sudah dimuat & divalidasi di Fase 3b — tidak perlu validasi ulang, hanya reuse array warna).

- [ ] **Step 1: Implementasi**

Create `src/components/ComparisonLineChart.tsx`:
```tsx
"use client";
import { useTheme } from "next-themes";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Sama dengan AllocationDonut.tsx: palet kategorikal tervalidasi (skill dataviz),
// fixed hue order, tidak di-cycle.
const COLORS_LIGHT = [
  "#2a78d6",
  "#1baf7a",
  "#eda100",
  "#008300",
  "#4a3aa7",
  "#e34948",
  "#e87ba4",
];
const COLORS_DARK = [
  "#3987e5",
  "#199e70",
  "#c98500",
  "#008300",
  "#9085e9",
  "#e66767",
  "#d55181",
];

export default function ComparisonLineChart({
  data,
  tickers,
}: {
  data: Array<Record<string, number | string>>;
  tickers: string[];
}) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? COLORS_DARK : COLORS_LIGHT;
  if (data.length === 0) return null;
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="quarter" />
          <YAxis />
          <Tooltip />
          <Legend />
          {tickers.map((t, i) => (
            <Line
              key={t}
              type="monotone"
              dataKey={t}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: TYPECHECK OK.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add comparison line chart component"
```

---

### Task 4: Halaman `/compare` + i18n + sidebar

**Files:**
- Create: `src/app/compare/page.tsx`
- Modify: `messages/id.json`, `messages/en.json`, `src/components/shell/Sidebar.tsx`

**Interfaces:**
- Consumes: `getAllSnapshotsWithEntries`, `getAllAiAnalyses` (Task 2), `buildComparisonRows`,
  `topTickersByLatestAllocation`, `chartSeries` (Task 1), `ComparisonLineChart` (Task 3).

- [ ] **Step 1: i18n keys**

Tambah ke `messages/id.json` (setelah blok `"dashboard"`):
```json
"compare": {
  "title": "Perbandingan Antar-Quartal",
  "insufficientData": "Perlu minimal 2 quartal untuk membandingkan.",
  "ticker": "Ticker",
  "score": "Skor",
  "allocation": "Alokasi %",
  "decision": "Keputusan",
  "moat": "Moat",
  "trend": "Tren Skor Komposit"
}
```
`messages/en.json`:
```json
"compare": {
  "title": "Quarter-over-Quarter Comparison",
  "insufficientData": "Need at least 2 quarters to compare.",
  "ticker": "Ticker",
  "score": "Score",
  "allocation": "Allocation %",
  "decision": "Decision",
  "moat": "Moat",
  "trend": "Composite Score Trend"
}
```
Tambah `"nav.compare": "Perbandingan"` (id) / `"Compare"` (en) di blok `"nav"`.

- [ ] **Step 2: Tambah item sidebar**

Di `src/components/shell/Sidebar.tsx`, tambahkan item baru di grup `stocks` setelah `review`:
```ts
      { href: "/compare", key: "compare" },
```
(masuk ke array `items` grup `stocks`, sebelum grup `config`.)

- [ ] **Step 3: Halaman Compare**

Create `src/app/compare/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { getAllSnapshotsWithEntries, getAllAiAnalyses } from "@/lib/repo";
import { buildComparisonRows, topTickersByLatestAllocation, chartSeries } from "@/lib/compare";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ComparisonLineChart from "@/components/ComparisonLineChart";

export default async function ComparePage() {
  const t = await getTranslations("compare");
  const snapshots = await getAllSnapshotsWithEntries();
  const analyses = await getAllAiAnalyses();
  const rows = buildComparisonRows(snapshots, analyses);
  const quarterCount = snapshots.length;
  const tickers = Object.keys(rows).sort();

  if (quarterCount < 2) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("insufficientData")}</p>
      </div>
    );
  }

  const topTickers = topTickersByLatestAllocation(rows, 7);
  const series = chartSeries(rows, topTickers);
  const quarters = Array.from(new Set(snapshots.map((s) => s.quarter))).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {quarterCount >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("trend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ComparisonLineChart data={series} tickers={topTickers} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ticker")}</TableHead>
                {quarters.map((q) => (
                  <TableHead key={q}>{q}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickers.map((ticker) => (
                <TableRow key={ticker}>
                  <TableCell>
                    <a className="underline" href={`/stock/${ticker}`}>
                      {ticker}
                    </a>
                  </TableCell>
                  {quarters.map((q) => {
                    const cell = rows[ticker].find((c) => c.quarter === q);
                    return (
                      <TableCell key={q}>
                        {cell ? (
                          <div className="text-xs space-y-0.5">
                            <div>
                              {t("score")}: {cell.compositeScore.toFixed(1)}
                            </div>
                            <div>
                              {t("allocation")}: {cell.allocationPct.toFixed(1)}%
                            </div>
                            {cell.decision && (
                              <div>
                                {t("decision")}: {cell.decision}
                              </div>
                            )}
                            {cell.moatLabel && (
                              <div>
                                {t("moat")}: {cell.moatLabel}
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    );
                  })}
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

- [ ] **Step 4: Verifikasi statis**

Run: `npm run test -- tests/i18n-parity.test.ts && npx tsc --noEmit`
Expected: parity PASS, TYPECHECK OK.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add compare page (table + trend chart across quarters)"
```

---

### Task 5: Verifikasi end-to-end (backfill quartal uji)

**Files:** tidak ada file baru — verifikasi manual.

**Interfaces:**
- Consumes: `runReview(quarterOverride?: string)` (server action Fase 2, sudah ada, tidak diubah).

- [ ] **Step 1: Full test suite + build**

Run: `npm run test && npx tsc --noEmit && npm run build`
Expected: semua test PASS, TYPECHECK OK, build sukses.

- [ ] **Step 2: Verifikasi kondisi "< 2 quartal" (kondisi saat ini)**

Run (dev server berjalan, DB saat ini punya 1 snapshot `2026Q3`):
```bash
npm run dev
# buka /compare -> harus tampil pesan "Perlu minimal 2 quartal untuk membandingkan."
```

- [ ] **Step 3: Backfill 1 quartal uji via runReview**

Panggil server action `runReview("2026Q4")` (lewat UI kalau tersedia input override, atau lewat
pemanggilan langsung dari server/skrip sementara) untuk membuat snapshot kedua. Setelah itu:
```bash
# /compare sekarang harus tampil TABEL (2 quartal: 2026Q3, 2026Q4)
# chart tren TIDAK tampil (baru 2 quartal, syarat >=3)
```
Expected: tabel muncul dengan kolom `2026Q3` dan `2026Q4`, sel berisi skor/alokasi/decision/moat
atau "—" untuk ticker yang tidak ada di salah satu quartal.

- [ ] **Step 4: Backfill quartal uji kedua untuk uji chart**

Panggil `runReview("2026Q1")` sekali lagi (quartal ketiga apa pun, urutan tidak masalah karena
tabel/chart mengurutkan sendiri). Verifikasi:
```bash
# /compare sekarang harus tampil TABEL (3 kolom quartal) + CHART tren (top 7 ticker)
```
Expected: `ComparisonLineChart` ter-render dengan garis per ticker, tidak error di console.

- [ ] **Step 5: Bersihkan data uji (opsional, tanya user)**

Jika quartal uji (`2026Q4`, `2026Q1` backfill) tidak diinginkan tetap ada di database, hapus via:
```sql
DELETE FROM "QuarterlySnapshot" WHERE quarter IN ('2026Q4', '2026Q1');
DELETE FROM "AiAnalysis" WHERE quarter IN ('2026Q4', '2026Q1');
```
Konfirmasi ke user sebelum menjalankan penghapusan data.

---

## Self-Review

**Spec coverage:**
- Tabel dari 2 quartal, chart dari 3 quartal → Task 4 (`quarterCount >= 2` / `>= 3`). ✓
- Metrik skor+alokasi+decision+moat → Task 1 `ComparisonCell` + Task 4 render. ✓
- Halaman baru `/compare` di sidebar grup Saham → Task 4. ✓
- Tanpa skema baru → Task 2 hanya baca model existing. ✓
- Top 7 ticker + palet tervalidasi konsisten dgn Fase 3b → Task 1 `topTickersByLatestAllocation` + Task 3 (warna sama persis dgn `AllocationDonut`). ✓
- Ticker hilang di suatu quartal → "—" → Task 1 (tidak insert cell kosong) + Task 4 (`cell ? ... : "—"`). ✓
- Testing unit (rows, top tickers, chart series) → Task 1. ✓
- Verifikasi e2e dgn backfill quartal uji → Task 5. ✓

**Placeholder scan:** tidak ada TBD/TODO; tiap step berisi kode nyata. Task 5 Step 5 (hapus data uji)
sengaja meminta konfirmasi user dulu — itu instruksi eksplisit, bukan placeholder.

**Type consistency:** `ComparisonCell`, `SnapshotInput`, `AnalysisInput` dipakai konsisten dari Task 1
ke Task 4; `chartSeries` return type `Array<Record<string, number|string>>` cocok dgn prop `data`
`ComparisonLineChart` (Task 3); `getAllSnapshotsWithEntries`/`getAllAiAnalyses` (Task 2) return shape
sama persis dengan `SnapshotInput`/`AnalysisInput` (Task 1) — tidak perlu adapter tambahan di Task 4.
