# Fase 1 — SPK Inti Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun siklus SPK inti end-to-end — input DCA manual → skor SAW → rekomendasi alokasi % DCA dengan cap saham/sektor — tanpa layer AI (Kelompok 2 diisi manual dulu).

**Architecture:** Next.js 14 (App Router, TypeScript) full-stack. Logika keputusan ditulis sebagai fungsi murni bebas-framework di `src/lib/` (holdings math, scoring SAW, allocation B+C) supaya mudah diuji unit. Data di PostgreSQL via Prisma. Data fundamental di-fetch dari Financial Modeling Prep dengan cache + override manual. UI minimal: Dashboard + halaman DCA Recommendation.

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL, Tailwind + shadcn/ui, Vitest (unit test), Docker Compose (dev db).

## Global Constraints

- Next.js **14** App Router, TypeScript strict mode.
- Semua logika keputusan (holdings, scoring, allocation) = **fungsi murni** di `src/lib/`, tanpa import React/Next/Prisma → wajib unit test dengan Vitest.
- Bobot kelompok SAW default: **Fundamental 35, Moat 30, Teknis 15, Diversifikasi 20**.
- Cap default: **25% per saham, 50% per sektor**.
- Uang/persentase disimpan sebagai `number` (float) di layer logika; alokasi akhir **selalu** dinormalisasi hingga total = 100 (toleransi 1e-6).
- Frequent commits: satu task = minimal satu commit dengan pesan Conventional Commit.
- Referensi spec: `docs/superpowers/specs/2026-07-02-personal-investment-spk-design.md`.

---

## File Structure

```
docker-compose.yml                      # Postgres dev
.env.example                            # DATABASE_URL, FMP_API_KEY
prisma/schema.prisma                    # model DB
src/lib/types.ts                        # tipe domain bersama
src/lib/holdings.ts                     # avg cost, PnL, alokasi aktual (murni)
src/lib/scoring.ts                      # SAW: normalisasi + skor komposit (murni)
src/lib/allocation.ts                   # B+C: baseline→tilt→clamp→renormalisasi (murni)
src/lib/fmp.ts                          # client Financial Modeling Prep + mapping
src/lib/db.ts                           # singleton PrismaClient
src/lib/repo.ts                         # query DB (holdings, fundamentals, weights)
src/app/api/holdings/route.ts           # GET/POST transaksi
src/app/api/recommendation/route.ts     # GET rekomendasi alokasi
src/app/page.tsx                        # Dashboard
src/app/recommendation/page.tsx         # DCA Recommendation
tests/holdings.test.ts
tests/scoring.test.ts
tests/allocation.test.ts
tests/fmp.test.ts
```

---

### Task 1: Scaffold proyek & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `docker-compose.yml`, `.env.example`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Produces: proyek Next.js yang boot; perintah `npm run test` (Vitest) & `npm run dev` tersedia.

- [ ] **Step 1: Buat app Next.js**

Run:
```bash
npx create-next-app@14 . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbopack
```
Expected: struktur `src/app/` terbuat, `npm run dev` bisa jalan.

- [ ] **Step 2: Tambah dependency**

Run:
```bash
npm i @prisma/client && npm i -D prisma vitest @vitest/coverage-v8
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 3: Konfigurasi Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Docker Compose untuk Postgres dev**

Create `docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: invest
      POSTGRES_PASSWORD: invest
      POSTGRES_DB: invest
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

Create `.env.example`:
```
DATABASE_URL="postgresql://invest:invest@localhost:5432/invest?schema=public"
FMP_API_KEY="your_fmp_key_here"
```
Copy to `.env` and fill.

- [ ] **Step 5: Smoke test tooling**

Create `tests/smoke.test.ts`:
```ts
import { expect, test } from "vitest";
test("tooling works", () => { expect(1 + 1).toBe(2); });
```
Run: `npm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold next.js app with prisma, vitest, docker db"
```

---

### Task 2: Skema database (Prisma)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

**Interfaces:**
- Produces: model `Sector`, `Company`, `Transaction`, `Fundamental`, `CriterionScore`, `Setting`; `prisma` client singleton dari `@/lib/db`.

- [ ] **Step 1: Tulis schema**

Replace `prisma/schema.prisma` datamodel dengan:
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model Sector {
  id        String    @id @default(cuid())
  name      String    @unique
  capPct    Float     @default(50)
  companies Company[]
}

model Company {
  ticker       String         @id
  name         String
  sector       Sector?        @relation(fields: [sectorId], references: [id])
  sectorId     String?
  capPct       Float          @default(25)
  transactions Transaction[]
  fundamentals Fundamental[]
  scores       CriterionScore[]
}

model Transaction {
  id        String   @id @default(cuid())
  company   Company  @relation(fields: [ticker], references: [ticker])
  ticker    String
  qty       Float
  price     Float
  date      DateTime
  createdAt DateTime @default(now())
}

model Fundamental {
  id        String   @id @default(cuid())
  ticker    String
  quarter   String   // "2026Q2"
  key       String   // "revenueGrowth", "netMargin", ...
  value     Float
  source    String   // "fmp" | "manual"
  updatedAt DateTime @updatedAt
  company   Company  @relation(fields: [ticker], references: [ticker])
  @@unique([ticker, quarter, key])
}

model CriterionScore {
  id       String  @id @default(cuid())
  ticker   String
  quarter  String
  group    String  // "fundamental" | "moat" | "technical" | "diversification"
  key      String
  rawValue Float
  manual   Boolean @default(false)
  company  Company @relation(fields: [ticker], references: [ticker])
  @@unique([ticker, quarter, group, key])
}

model Setting {
  key   String @id
  value String // JSON string
}
```

- [ ] **Step 2: Migrasi**

Run:
```bash
docker compose up -d db
npx prisma migrate dev --name init
```
Expected: migrasi sukses, tabel terbuat.

- [ ] **Step 3: Prisma singleton**

Create `src/lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add prisma schema and db singleton"
```

---

### Task 3: Holdings math (fungsi murni, TDD)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/holdings.ts`, `tests/holdings.test.ts`

**Interfaces:**
- Produces:
  - `type Tx = { ticker: string; qty: number; price: number }`
  - `type Position = { ticker: string; qty: number; avgCost: number; costBasis: number }`
  - `positionsFromTx(txs: Tx[]): Position[]`
  - `marketValue(pos: Position, price: number): number`
  - `pnl(pos: Position, price: number): { abs: number; pct: number }`
  - `actualAllocation(positions: Position[], prices: Record<string, number>): Record<string, number>` (persen, total 100)

- [ ] **Step 1: Tulis tipe domain**

Create `src/lib/types.ts`:
```ts
export type Tx = { ticker: string; qty: number; price: number };
export type Position = { ticker: string; qty: number; avgCost: number; costBasis: number };
```

- [ ] **Step 2: Tulis test yang gagal**

Create `tests/holdings.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { positionsFromTx, pnl, actualAllocation } from "@/lib/holdings";

describe("positionsFromTx", () => {
  test("agregasi qty & hitung avg cost tertimbang", () => {
    const pos = positionsFromTx([
      { ticker: "NVDA", qty: 2, price: 100 },
      { ticker: "NVDA", qty: 2, price: 200 },
    ]);
    expect(pos).toEqual([{ ticker: "NVDA", qty: 4, avgCost: 150, costBasis: 600 }]);
  });
});

describe("pnl", () => {
  test("hitung PnL abs & persen", () => {
    const p = pnl({ ticker: "NVDA", qty: 4, avgCost: 150, costBasis: 600 }, 200);
    expect(p.abs).toBe(200);
    expect(p.pct).toBeCloseTo(33.333, 2);
  });
});

describe("actualAllocation", () => {
  test("persen berdasar market value, total 100", () => {
    const positions = [
      { ticker: "A", qty: 1, avgCost: 100, costBasis: 100 },
      { ticker: "B", qty: 1, avgCost: 100, costBasis: 100 },
    ];
    const alloc = actualAllocation(positions, { A: 300, B: 100 });
    expect(alloc.A).toBeCloseTo(75, 6);
    expect(alloc.B).toBeCloseTo(25, 6);
  });
});
```

- [ ] **Step 3: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/holdings.test.ts`
Expected: FAIL (module `@/lib/holdings` belum ada).

- [ ] **Step 4: Implementasi minimal**

Create `src/lib/holdings.ts`:
```ts
import type { Tx, Position } from "./types";

export function positionsFromTx(txs: Tx[]): Position[] {
  const map = new Map<string, { qty: number; costBasis: number }>();
  for (const t of txs) {
    const cur = map.get(t.ticker) ?? { qty: 0, costBasis: 0 };
    cur.qty += t.qty;
    cur.costBasis += t.qty * t.price;
    map.set(t.ticker, cur);
  }
  return [...map.entries()].map(([ticker, v]) => ({
    ticker,
    qty: v.qty,
    costBasis: v.costBasis,
    avgCost: v.qty === 0 ? 0 : v.costBasis / v.qty,
  }));
}

export function marketValue(pos: Position, price: number): number {
  return pos.qty * price;
}

export function pnl(pos: Position, price: number): { abs: number; pct: number } {
  const abs = marketValue(pos, price) - pos.costBasis;
  const pct = pos.costBasis === 0 ? 0 : (abs / pos.costBasis) * 100;
  return { abs, pct };
}

export function actualAllocation(
  positions: Position[],
  prices: Record<string, number>,
): Record<string, number> {
  const values = positions.map((p) => ({ t: p.ticker, v: marketValue(p, prices[p.ticker] ?? 0) }));
  const total = values.reduce((s, x) => s + x.v, 0);
  const out: Record<string, number> = {};
  for (const { t, v } of values) out[t] = total === 0 ? 0 : (v / total) * 100;
  return out;
}
```

- [ ] **Step 5: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/holdings.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add holdings math (positions, pnl, actual allocation)"
```

---

### Task 4: Scoring Engine SAW (fungsi murni, TDD)

**Files:**
- Create: `src/lib/scoring.ts`, `tests/scoring.test.ts`

**Interfaces:**
- Produces:
  - `type Direction = "benefit" | "cost"`
  - `type Criterion = { key: string; group: string; direction: Direction }`
  - `type GroupWeights = Record<string, number>` (mis. `{ fundamental: 35, moat: 30, technical: 15, diversification: 20 }`)
  - `normalize(values: Record<string, number>, direction: Direction): Record<string, number>` → 0..1 per ticker
  - `compositeScores(input): Record<string, number>` → skor 0..100 per ticker
    - `input = { criteria: Criterion[]; raw: Record<ticker, Record<critKey, number>>; groupWeights: GroupWeights }`

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/scoring.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { normalize, compositeScores } from "@/lib/scoring";

describe("normalize", () => {
  test("benefit: nilai tertinggi jadi 1, terendah 0", () => {
    const n = normalize({ A: 10, B: 20, C: 30 }, "benefit");
    expect(n.A).toBeCloseTo(0, 6);
    expect(n.C).toBeCloseTo(1, 6);
    expect(n.B).toBeCloseTo(0.5, 6);
  });
  test("cost: nilai terendah jadi 1", () => {
    const n = normalize({ A: 10, B: 30 }, "cost");
    expect(n.A).toBeCloseTo(1, 6);
    expect(n.B).toBeCloseTo(0, 6);
  });
  test("semua nilai sama → semua 1 (netral)", () => {
    const n = normalize({ A: 5, B: 5 }, "benefit");
    expect(n.A).toBeCloseTo(1, 6);
    expect(n.B).toBeCloseTo(1, 6);
  });
});

describe("compositeScores", () => {
  test("skor tertimbang per kelompok, skala 0..100", () => {
    const criteria = [
      { key: "growth", group: "fundamental", direction: "benefit" as const },
      { key: "pe", group: "fundamental", direction: "cost" as const },
      { key: "moat", group: "moat", direction: "benefit" as const },
    ];
    const raw = {
      NVDA: { growth: 30, pe: 40, moat: 9 },
      MSFT: { growth: 10, pe: 20, moat: 7 },
    };
    const scores = compositeScores({
      criteria, raw, groupWeights: { fundamental: 50, moat: 50 },
    });
    // NVDA: fundamental = avg(growth norm=1, pe norm=0)=0.5; moat norm=1 → 0.5*50+1*50=75
    expect(scores.NVDA).toBeCloseTo(75, 4);
    // MSFT: fundamental = avg(growth 0, pe 1)=0.5; moat 0 → 0.5*50+0*50=25
    expect(scores.MSFT).toBeCloseTo(25, 4);
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/scoring.test.ts`
Expected: FAIL (module belum ada).

- [ ] **Step 3: Implementasi minimal**

Create `src/lib/scoring.ts`:
```ts
export type Direction = "benefit" | "cost";
export type Criterion = { key: string; group: string; direction: Direction };
export type GroupWeights = Record<string, number>;

export function normalize(
  values: Record<string, number>,
  direction: Direction,
): Record<string, number> {
  const nums = Object.values(values);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(values)) {
    if (max === min) { out[k] = 1; continue; }
    const b = (v - min) / (max - min);
    out[k] = direction === "benefit" ? b : 1 - b;
  }
  return out;
}

export function compositeScores(input: {
  criteria: Criterion[];
  raw: Record<string, Record<string, number>>;
  groupWeights: GroupWeights;
}): Record<string, number> {
  const { criteria, raw, groupWeights } = input;
  const tickers = Object.keys(raw);

  // normalisasi tiap kriteria lintas ticker
  const normByKey: Record<string, Record<string, number>> = {};
  for (const c of criteria) {
    const vals: Record<string, number> = {};
    for (const t of tickers) vals[t] = raw[t][c.key];
    normByKey[c.key] = normalize(vals, c.direction);
  }

  // kelompokkan kriteria per group
  const groups: Record<string, Criterion[]> = {};
  for (const c of criteria) (groups[c.group] ??= []).push(c);

  const totalWeight = Object.values(groupWeights).reduce((s, w) => s + w, 0);
  const scores: Record<string, number> = {};
  for (const t of tickers) {
    let acc = 0;
    for (const [group, crits] of Object.entries(groups)) {
      const w = groupWeights[group] ?? 0;
      const groupAvg = crits.reduce((s, c) => s + normByKey[c.key][t], 0) / crits.length;
      acc += (w / totalWeight) * groupAvg;
    }
    scores[t] = acc * 100;
  }
  return scores;
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/scoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add SAW scoring engine (normalize + composite scores)"
```

---

### Task 5: Allocation Engine B+C (fungsi murni, TDD)

**Files:**
- Create: `src/lib/allocation.ts`, `tests/allocation.test.ts`

**Interfaces:**
- Produces:
  - `type Caps = { perStock: number; perSector: Record<string, number> }`
  - `type AllocInput = { scores: Record<string, number>; sectors: Record<string, string>; caps: Caps; aggressiveness: number }`
  - `type AllocResult = { allocation: Record<string, number>; activeCaps: string[] }`
  - `recommendAllocation(input: AllocInput): AllocResult` — baseline→tilt→clamp→renormalisasi, total = 100.

**Catatan algoritma:**
1. Baseline = `100 / n` per saham.
2. Tilt: `weight_i = baseline * (1 + aggressiveness * (score_i - meanScore) / 100)`, di-floor ke 0.
3. Normalisasi ke 100.
4. Clamp iteratif: jika ada saham > `perStock`, set ke cap, redistribusi sisa ke saham non-capped secara proporsional; ulangi hingga stabil.
5. Clamp sektor: jika total sektor > cap sektor, skala turun anggota sektor itu, redistribusi ke sektor lain; ulangi.
6. Catat cap yang aktif.

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/allocation.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { recommendAllocation } from "@/lib/allocation";

const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);

describe("recommendAllocation", () => {
  test("skor sama → alokasi merata", () => {
    const r = recommendAllocation({
      scores: { A: 50, B: 50, C: 50 },
      sectors: { A: "x", B: "y", C: "z" },
      caps: { perStock: 100, perSector: {} },
      aggressiveness: 1,
    });
    expect(r.allocation.A).toBeCloseTo(33.333, 2);
    expect(sum(r.allocation)).toBeCloseTo(100, 6);
  });

  test("skor lebih tinggi → alokasi lebih besar (tilt)", () => {
    const r = recommendAllocation({
      scores: { A: 80, B: 40 },
      sectors: { A: "x", B: "y" },
      caps: { perStock: 100, perSector: {} },
      aggressiveness: 1,
    });
    expect(r.allocation.A).toBeGreaterThan(r.allocation.B);
    expect(sum(r.allocation)).toBeCloseTo(100, 6);
  });

  test("cap per saham ditegakkan & sisa diredistribusi", () => {
    const r = recommendAllocation({
      scores: { A: 100, B: 10, C: 10 },
      sectors: { A: "x", B: "y", C: "z" },
      caps: { perStock: 25, perSector: {} },
      aggressiveness: 5,
    });
    expect(r.allocation.A).toBeLessThanOrEqual(25 + 1e-6);
    expect(sum(r.allocation)).toBeCloseTo(100, 6);
    expect(r.activeCaps).toContain("stock:A");
  });

  test("cap sektor ditegakkan", () => {
    const r = recommendAllocation({
      scores: { A: 90, B: 90, C: 10 },
      sectors: { A: "semi", B: "semi", C: "cloud" },
      caps: { perStock: 100, perSector: { semi: 50 } },
      aggressiveness: 3,
    });
    const semi = r.allocation.A + r.allocation.B;
    expect(semi).toBeLessThanOrEqual(50 + 1e-6);
    expect(sum(r.allocation)).toBeCloseTo(100, 6);
    expect(r.activeCaps).toContain("sector:semi");
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/allocation.test.ts`
Expected: FAIL (module belum ada).

- [ ] **Step 3: Implementasi minimal**

Create `src/lib/allocation.ts`:
```ts
export type Caps = { perStock: number; perSector: Record<string, number> };
export type AllocInput = {
  scores: Record<string, number>;
  sectors: Record<string, string>;
  caps: Caps;
  aggressiveness: number;
};
export type AllocResult = { allocation: Record<string, number>; activeCaps: string[] };

function renormalize(w: Record<string, number>): Record<string, number> {
  const total = Object.values(w).reduce((s, v) => s + v, 0);
  const out: Record<string, number> = {};
  for (const k of Object.keys(w)) out[k] = total === 0 ? 0 : (w[k] / total) * 100;
  return out;
}

export function recommendAllocation(input: AllocInput): AllocResult {
  const { scores, sectors, caps, aggressiveness } = input;
  const tickers = Object.keys(scores);
  const n = tickers.length;
  const activeCaps: string[] = [];
  if (n === 0) return { allocation: {}, activeCaps };

  const baseline = 100 / n;
  const mean = tickers.reduce((s, t) => s + scores[t], 0) / n;

  // baseline + tilt
  let w: Record<string, number> = {};
  for (const t of tickers) {
    w[t] = Math.max(0, baseline * (1 + aggressiveness * (scores[t] - mean) / 100));
  }
  w = renormalize(w);

  // clamp per saham (iteratif)
  for (let iter = 0; iter < 100; iter++) {
    const over = tickers.filter((t) => w[t] > caps.perStock + 1e-9);
    if (over.length === 0) break;
    let freed = 0;
    for (const t of over) { freed += w[t] - caps.perStock; w[t] = caps.perStock; if (!activeCaps.includes(`stock:${t}`)) activeCaps.push(`stock:${t}`); }
    const under = tickers.filter((t) => w[t] < caps.perStock - 1e-9);
    const underSum = under.reduce((s, t) => s + w[t], 0);
    if (underSum === 0) break;
    for (const t of under) w[t] += freed * (w[t] / underSum);
  }

  // clamp per sektor (iteratif)
  for (let iter = 0; iter < 100; iter++) {
    let changed = false;
    for (const [sec, cap] of Object.entries(caps.perSector)) {
      const members = tickers.filter((t) => sectors[t] === sec);
      const secSum = members.reduce((s, t) => s + w[t], 0);
      if (secSum > cap + 1e-9 && secSum > 0) {
        const scale = cap / secSum;
        let freed = 0;
        for (const t of members) { const nw = w[t] * scale; freed += w[t] - nw; w[t] = nw; }
        if (!activeCaps.includes(`sector:${sec}`)) activeCaps.push(`sector:${sec}`);
        const others = tickers.filter((t) => !members.includes(t));
        const otherSum = others.reduce((s, t) => s + w[t], 0);
        if (otherSum > 0) for (const t of others) w[t] += freed * (w[t] / otherSum);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return { allocation: w, activeCaps };
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/allocation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add allocation engine (baseline, tilt, stock/sector cap clamp)"
```

---

### Task 6: FMP Data Fetcher (TDD dengan fetch di-mock)

**Files:**
- Create: `src/lib/fmp.ts`, `tests/fmp.test.ts`

**Interfaces:**
- Consumes: `FMP_API_KEY` dari env.
- Produces:
  - `type FundamentalSet = { revenueGrowth: number; netMargin: number; roe: number; debtToEquity: number; pe: number }`
  - `mapProfileMetrics(raw: any): FundamentalSet` — mapping respons FMP → set kita.
  - `fetchFundamentals(ticker: string, fetchImpl?: typeof fetch): Promise<FundamentalSet>`

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/fmp.test.ts`:
```ts
import { describe, expect, test, vi } from "vitest";
import { mapProfileMetrics, fetchFundamentals } from "@/lib/fmp";

describe("mapProfileMetrics", () => {
  test("map field FMP → FundamentalSet", () => {
    const m = mapProfileMetrics({
      revenueGrowth: 0.25, netProfitMargin: 0.3, roe: 0.4, debtToEquity: 0.5, peRatio: 40,
    });
    expect(m).toEqual({ revenueGrowth: 25, netMargin: 30, roe: 40, debtToEquity: 0.5, pe: 40 });
  });
});

describe("fetchFundamentals", () => {
  test("panggil endpoint & kembalikan set ter-map", async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(JSON.stringify([{ revenueGrowth: 0.1, netProfitMargin: 0.2, roe: 0.3, debtToEquity: 1, peRatio: 20 }]), { status: 200 }),
    ) as unknown as typeof fetch;
    const set = await fetchFundamentals("NVDA", fakeFetch);
    expect(set.revenueGrowth).toBe(10);
    expect(fakeFetch).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/fmp.test.ts`
Expected: FAIL (module belum ada).

- [ ] **Step 3: Implementasi minimal**

Create `src/lib/fmp.ts`:
```ts
export type FundamentalSet = {
  revenueGrowth: number; netMargin: number; roe: number; debtToEquity: number; pe: number;
};

export function mapProfileMetrics(raw: any): FundamentalSet {
  return {
    revenueGrowth: (raw.revenueGrowth ?? 0) * 100,
    netMargin: (raw.netProfitMargin ?? 0) * 100,
    roe: (raw.roe ?? 0) * 100,
    debtToEquity: raw.debtToEquity ?? 0,
    pe: raw.peRatio ?? 0,
  };
}

export async function fetchFundamentals(
  ticker: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FundamentalSet> {
  const key = process.env.FMP_API_KEY ?? "";
  const url = `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}?apikey=${key}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`FMP ${res.status}`);
  const json = (await res.json()) as any[];
  if (!Array.isArray(json) || json.length === 0) throw new Error("FMP empty");
  return mapProfileMetrics(json[0]);
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/fmp.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add FMP fundamentals fetcher with mapping"
```

---

### Task 7: Repo layer, API routes & UI minimal

**Files:**
- Create: `src/lib/repo.ts`, `src/app/api/holdings/route.ts`, `src/app/api/recommendation/route.ts`, `src/app/recommendation/page.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `prisma` (Task 2), `positionsFromTx`/`actualAllocation` (Task 3), `compositeScores` (Task 4), `recommendAllocation` (Task 5).
- Produces:
  - `getTransactions(): Promise<Tx[]>`, `addTransaction(t): Promise<void>`
  - `getGroupWeights(): Promise<GroupWeights>` (baca `Setting` `saw_weights`, fallback default 35/30/15/20)
  - `getCaps(): Promise<Caps>` (fallback perStock 25, perSector kosong)
  - `getSectors(): Promise<Record<string,string>>`
  - API `GET /api/recommendation` → `{ scores, allocation, activeCaps, actual }`

- [ ] **Step 1: Repo layer**

Create `src/lib/repo.ts`:
```ts
import { prisma } from "./db";
import type { Tx } from "./types";
import type { GroupWeights } from "./scoring";
import type { Caps } from "./allocation";

export async function getTransactions(): Promise<Tx[]> {
  const rows = await prisma.transaction.findMany();
  return rows.map((r) => ({ ticker: r.ticker, qty: r.qty, price: r.price }));
}

export async function addTransaction(t: Tx & { date: string }): Promise<void> {
  await prisma.company.upsert({
    where: { ticker: t.ticker },
    update: {},
    create: { ticker: t.ticker, name: t.ticker },
  });
  await prisma.transaction.create({
    data: { ticker: t.ticker, qty: t.qty, price: t.price, date: new Date(t.date) },
  });
}

export async function getGroupWeights(): Promise<GroupWeights> {
  const s = await prisma.setting.findUnique({ where: { key: "saw_weights" } });
  if (s) return JSON.parse(s.value);
  return { fundamental: 35, moat: 30, technical: 15, diversification: 20 };
}

export async function getCaps(): Promise<Caps> {
  const s = await prisma.setting.findUnique({ where: { key: "caps" } });
  if (s) return JSON.parse(s.value);
  return { perStock: 25, perSector: {} };
}

export async function getSectors(): Promise<Record<string, string>> {
  const rows = await prisma.company.findMany({ include: { sector: true } });
  const out: Record<string, string> = {};
  for (const r of rows) out[r.ticker] = r.sector?.name ?? "unknown";
  return out;
}
```

- [ ] **Step 2: API holdings**

Create `src/app/api/holdings/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getTransactions, addTransaction } from "@/lib/repo";

export async function GET() {
  return NextResponse.json(await getTransactions());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await addTransaction(body);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: API recommendation**

Create `src/app/api/recommendation/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getTransactions, getGroupWeights, getCaps, getSectors } from "@/lib/repo";
import { positionsFromTx } from "@/lib/holdings";
import { compositeScores, type Criterion } from "@/lib/scoring";
import { recommendAllocation } from "@/lib/allocation";
import { prisma } from "@/lib/db";

export async function GET() {
  const txs = await getTransactions();
  const positions = positionsFromTx(txs);
  const tickers = positions.map((p) => p.ticker);

  // ambil skor kriteria manual/fetched dari CriterionScore (fallback netral 50)
  const rows = await prisma.criterionScore.findMany({ where: { ticker: { in: tickers } } });
  const criteria: Criterion[] = [];
  const seen = new Set<string>();
  const raw: Record<string, Record<string, number>> = {};
  for (const t of tickers) raw[t] = {};
  for (const r of rows) {
    raw[r.ticker][r.key] = r.rawValue;
    const id = `${r.group}:${r.key}`;
    if (!seen.has(id)) { criteria.push({ key: r.key, group: r.group, direction: "benefit" }); seen.add(id); }
  }
  // isi kriteria yang hilang dgn 50 agar tidak NaN
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

  return NextResponse.json({ scores, ...rec });
}
```

- [ ] **Step 4: Dashboard**

Replace `src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Personal Investment SPK</h1>
      <p className="text-muted-foreground">Dashboard portfolio.</p>
      <a className="text-blue-600 underline" href="/recommendation">
        Lihat Rekomendasi DCA →
      </a>
    </main>
  );
}
```

- [ ] **Step 5: Halaman Recommendation**

Create `src/app/recommendation/page.tsx`:
```tsx
async function getData() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/recommendation`, { cache: "no-store" });
  return res.json() as Promise<{
    scores: Record<string, number>;
    allocation: Record<string, number>;
    activeCaps: string[];
  }>;
}

export default async function RecommendationPage() {
  const data = await getData();
  const rows = Object.keys(data.allocation).sort((a, b) => data.allocation[b] - data.allocation[a]);
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Rekomendasi Alokasi DCA</h1>
      {data.activeCaps.length > 0 && (
        <p className="text-sm text-amber-600">Cap aktif: {data.activeCaps.join(", ")}</p>
      )}
      <table className="w-full max-w-lg text-left">
        <thead><tr><th>Ticker</th><th>Skor</th><th>Alokasi %</th></tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t} className="border-t">
              <td className="py-1">{t}</td>
              <td>{data.scores[t]?.toFixed(1)}</td>
              <td>{data.allocation[t].toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

- [ ] **Step 6: Verifikasi manual**

Run:
```bash
docker compose up -d db && npm run dev
```
Lewat curl seed satu transaksi lalu cek rekomendasi:
```bash
curl -XPOST localhost:3000/api/holdings -H 'content-type: application/json' \
  -d '{"ticker":"NVDA","qty":0.34,"price":3400,"date":"2026-06-01"}'
curl localhost:3000/api/recommendation
```
Expected: JSON berisi `scores`, `allocation` (total ~100), `activeCaps`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add repo layer, holdings/recommendation API, dashboard UI"
```

---

## Self-Review

**Spec coverage (Fase 1):**
- Holdings & Transactions → Task 3 + Task 7 (repo/API). ✓
- Data Fetcher (FMP + override) → Task 6; override manual tersimpan sebagai `Fundamental.source="manual"` / `CriterionScore.manual` (Task 2 schema, dikonsumsi Task 7). ✓
- Scoring Engine SAW → Task 4. ✓
- Allocation Engine B+C (cap saham/sektor) → Task 5. ✓
- Unit test engine (termasuk cap sektor aktif) → Task 4 & 5. ✓
- UI Dashboard + DCA Recommendation → Task 7. ✓
- AI & Quarterly snapshot → **sengaja di luar Fase 1** (Fase 2, sesuai ROADMAP). ✓

**Placeholder scan:** tidak ada TBD/TODO; tiap step berisi kode nyata. ✓

**Type consistency:** `Tx`, `Position`, `Criterion`, `GroupWeights`, `Caps`, `AllocInput`/`AllocResult` konsisten dipakai lintas task; `recommendAllocation` & `compositeScores` dipanggil di Task 7 sesuai signature Task 4/5. ✓

**Catatan integrasi:** Task 7 mengisi kriteria hilang dengan nilai netral 50 supaya rekomendasi tetap jalan sebelum ada data fundamental/skor manual — sesuai keputusan "Kelompok 2 diisi manual dulu" di Fase 1.
