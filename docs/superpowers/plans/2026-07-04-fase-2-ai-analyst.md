# Fase 2 — AI Analyst + Quarterly Review + Stockcard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan lapisan AI Analyst (Moat/Decision/Reason yang memengaruhi skor), pipeline Quarterly Review + snapshot, dan halaman Stockcard/Review.

**Architecture:** AI abstraction provider-agnostic di `src/lib/ai/` (Gemini→Groq→OpenRouter, key-pool rotation, fallback berurutan). Semua logika inti (parse output, prompt, rotasi, fallback, integrasi skor, util quartal, perakitan snapshot) berupa fungsi murni yang diuji tanpa API asli; provider HTTP diuji dengan `fetch` ter-mock. Output AI menulis ke `CriterionScore` (group `moat`), lalu Scoring/Allocation Engine Fase 1 dipakai apa adanya. Hasil dibekukan ke tabel snapshot baru.

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL, Vitest, next-intl.

## Global Constraints

- Urutan provider default: **Gemini → Groq → OpenRouter** (`AI_PROVIDER_ORDER`).
- **ID model AI TIDAK di-hardcode** — baca dari env (`GEMINI_MODEL`/`GROQ_MODEL`/`OPENROUTER_MODEL`). **Sebelum menulis kode provider (Task 5), verifikasi ID model + endpoint terbaru dari dokumentasi resmi (WebSearch/WebFetch).**
- Key per provider = comma-separated di env (`GEMINI_API_KEYS`/`GROQ_API_KEYS`/`OPENROUTER_API_KEYS`), **round-robin**.
- 5 kriteria AI: `moat`, `competitive`, `management`, `industry`, `risk`; skor 0–100; group `moat`; `manual=false`. `conviction` = manual (default 50).
- Output AI = hybrid: `{ label: string; score: number(0..100) }` per kriteria + `decision`/`reason`/`keyRisks`/`confidence`.
- Bahasa AI: `aiLanguageInstruction(resolveAiLanguage(getAiLanguage(), uiLocale))` (sudah ada di Fase 1).
- Quartal format `YYYYQn`; **overwrite** per quartal.
- Fungsi murni di `src/lib/**` tanpa import React/Next/Prisma → wajib unit test.
- Semua teks UI lewat i18n; parity `messages/{id,en}.json` dijaga (test parity sudah ada).
- Frequent commits (Conventional Commits). Referensi spec: `docs/superpowers/specs/2026-07-04-fase-2-ai-analyst-design.md`.

---

## File Structure

```
src/lib/ai/types.ts            # tipe domain AI (AiInput, AiAnalysis, AiProvider, dll)
src/lib/ai/schema.ts           # parseAiAnalysis: validasi + parse JSON output AI (murni)
src/lib/ai/prompt.ts           # buildAnalystPrompt + RUBRIC (murni)
src/lib/ai/keypool.ts          # createKeyPool: rotasi round-robin (murni)
src/lib/ai/orchestrator.ts     # analyzeWithFallback (murni, provider-agnostic)
src/lib/ai/providers/gemini.ts # provider Gemini (fetch)
src/lib/ai/providers/groq.ts   # provider Groq (fetch)
src/lib/ai/providers/openrouter.ts # provider OpenRouter (fetch)
src/lib/ai/index.ts            # rakit providers dari env sesuai urutan
src/lib/quarter.ts             # currentQuarter (murni)
src/lib/snapshot.ts            # criterionScoresFromAnalysis + buildSnapshotEntries (murni)
src/lib/repo.ts                # (modify) fungsi persist snapshot/analysis + query
prisma/schema.prisma           # (modify) QuarterlySnapshot, SnapshotEntry, AiAnalysis
src/app/review/page.tsx        # halaman Quarterly Review + pemilih quartal
src/app/review/actions.ts      # server action runReview
src/app/stock/[ticker]/page.tsx# Stockcard
messages/{id,en}.json          # (modify) kunci i18n baru
tests/ai-schema.test.ts
tests/ai-prompt.test.ts
tests/ai-keypool.test.ts
tests/ai-orchestrator.test.ts
tests/ai-providers.test.ts
tests/quarter.test.ts
tests/snapshot.test.ts
```

---

### Task 1: Tipe AI + parser output (schema guard)

**Files:**
- Create: `src/lib/ai/types.ts`, `src/lib/ai/schema.ts`, `tests/ai-schema.test.ts`

**Interfaces:**
- Consumes: `FundamentalSet` dari `@/lib/fmp`; `ResolvedLanguage` dari `@/lib/language`.
- Produces:
  - `type AiCriterionKey = "moat" | "competitive" | "management" | "industry" | "risk"`
  - `type CriterionRating = { label: string; score: number }`
  - `type Decision = "Accumulate" | "Hold" | "Reduce" | "Avoid"`
  - `type AiAnalysis = { criteria: Record<AiCriterionKey, CriterionRating>; decision: Decision; reason: string; keyRisks: string[]; confidence: number }`
  - `type AiInput = { ticker: string; fundamentals: FundamentalSet; positionPct?: number; language: ResolvedLanguage }`
  - `type AiResult = { analysis: AiAnalysis; model: string }`
  - `interface AiProvider { name: string; analyze(input: AiInput): Promise<AiResult> }`
  - `parseAiAnalysis(data: unknown): AiAnalysis` — throw `Error` bila tak valid.

- [ ] **Step 1: Tulis tipe**

Create `src/lib/ai/types.ts`:
```ts
import type { FundamentalSet } from "@/lib/fmp";
import type { ResolvedLanguage } from "@/lib/language";

export const AI_CRITERIA = ["moat", "competitive", "management", "industry", "risk"] as const;
export type AiCriterionKey = (typeof AI_CRITERIA)[number];

export type CriterionRating = { label: string; score: number };
export type Decision = "Accumulate" | "Hold" | "Reduce" | "Avoid";
export const DECISIONS: Decision[] = ["Accumulate", "Hold", "Reduce", "Avoid"];

export type AiAnalysis = {
  criteria: Record<AiCriterionKey, CriterionRating>;
  decision: Decision;
  reason: string;
  keyRisks: string[];
  confidence: number;
};

export type AiInput = {
  ticker: string;
  fundamentals: FundamentalSet;
  positionPct?: number;
  language: ResolvedLanguage;
};

export type AiResult = { analysis: AiAnalysis; model: string };

export interface AiProvider {
  name: string;
  analyze(input: AiInput): Promise<AiResult>;
}
```

- [ ] **Step 2: Tulis test yang gagal**

Create `tests/ai-schema.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { parseAiAnalysis } from "@/lib/ai/schema";

const valid = {
  criteria: {
    moat: { label: "Wide", score: 90 },
    competitive: { label: "Strong", score: 80 },
    management: { label: "Good", score: 70 },
    industry: { label: "Tailwind", score: 85 },
    risk: { label: "Moderate", score: 60 },
  },
  decision: "Accumulate",
  reason: "Strong moat and growth.",
  keyRisks: ["valuation"],
  confidence: 0.8,
};

describe("parseAiAnalysis", () => {
  test("terima objek valid", () => {
    expect(parseAiAnalysis(valid)).toEqual(valid);
  });
  test("tolak decision tak dikenal", () => {
    expect(() => parseAiAnalysis({ ...valid, decision: "Yolo" })).toThrow();
  });
  test("tolak kriteria hilang", () => {
    const { moat, ...rest } = valid.criteria;
    expect(() => parseAiAnalysis({ ...valid, criteria: rest })).toThrow();
  });
  test("tolak skor di luar 0..100", () => {
    const bad = { ...valid, criteria: { ...valid.criteria, moat: { label: "X", score: 150 } } };
    expect(() => parseAiAnalysis(bad)).toThrow();
  });
  test("tolak confidence di luar 0..1", () => {
    expect(() => parseAiAnalysis({ ...valid, confidence: 5 })).toThrow();
  });
});
```

- [ ] **Step 3: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/ai-schema.test.ts`
Expected: FAIL (module belum ada).

- [ ] **Step 4: Implementasi**

Create `src/lib/ai/schema.ts`:
```ts
import { AI_CRITERIA, DECISIONS, type AiAnalysis, type Decision } from "./types";

function num(v: unknown, min: number, max: number, label: string): number {
  if (typeof v !== "number" || Number.isNaN(v) || v < min || v > max) {
    throw new Error(`invalid ${label}: ${v}`);
  }
  return v;
}

function str(v: unknown, label: string): string {
  if (typeof v !== "string" || v.length === 0) throw new Error(`invalid ${label}`);
  return v;
}

export function parseAiAnalysis(data: unknown): AiAnalysis {
  if (typeof data !== "object" || data === null) throw new Error("not an object");
  const d = data as Record<string, any>;

  const criteria = {} as AiAnalysis["criteria"];
  if (typeof d.criteria !== "object" || d.criteria === null) throw new Error("criteria missing");
  for (const key of AI_CRITERIA) {
    const c = d.criteria[key];
    if (typeof c !== "object" || c === null) throw new Error(`criterion ${key} missing`);
    criteria[key] = { label: str(c.label, `${key}.label`), score: num(c.score, 0, 100, `${key}.score`) };
  }

  if (!DECISIONS.includes(d.decision)) throw new Error(`invalid decision: ${d.decision}`);

  if (!Array.isArray(d.keyRisks) || d.keyRisks.some((r: unknown) => typeof r !== "string")) {
    throw new Error("invalid keyRisks");
  }

  return {
    criteria,
    decision: d.decision as Decision,
    reason: str(d.reason, "reason"),
    keyRisks: d.keyRisks as string[],
    confidence: num(d.confidence, 0, 1, "confidence"),
  };
}
```

- [ ] **Step 5: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/ai-schema.test.ts`
Expected: PASS (5 test).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add AI types and output schema guard"
```

---

### Task 2: Prompt builder + rubrik

**Files:**
- Create: `src/lib/ai/prompt.ts`, `tests/ai-prompt.test.ts`

**Interfaces:**
- Consumes: `AiInput` (Task 1), `aiLanguageInstruction` (`@/lib/language`).
- Produces: `buildAnalystPrompt(input: AiInput): string`.

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/ai-prompt.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { buildAnalystPrompt } from "@/lib/ai/prompt";

const input = {
  ticker: "NVDA",
  fundamentals: { revenueGrowth: 25, netMargin: 30, roe: 40, debtToEquity: 0.5, pe: 40 },
  positionPct: 22,
  language: "id" as const,
};

describe("buildAnalystPrompt", () => {
  test("memuat ticker, angka fundamental, rubrik, instruksi bahasa, dan format JSON", () => {
    const p = buildAnalystPrompt(input);
    expect(p).toContain("NVDA");
    expect(p).toContain("25"); // revenueGrowth
    expect(p).toMatch(/rubric|rubrik/i);
    expect(p).toMatch(/Indonesia/i); // instruksi bahasa id
    expect(p).toMatch(/JSON/);
    expect(p).toContain("moat");
  });
  test("instruksi bahasa berubah untuk en", () => {
    const p = buildAnalystPrompt({ ...input, language: "en" });
    expect(p).toMatch(/English/i);
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/ai-prompt.test.ts`
Expected: FAIL (module belum ada).

- [ ] **Step 3: Implementasi**

Create `src/lib/ai/prompt.ts`:
```ts
import { aiLanguageInstruction } from "@/lib/language";
import type { AiInput } from "./types";

const RUBRIC = `Scoring rubric (0-100) for each criterion:
- 90-100: exceptional / very wide & durable
- 70-89: strong
- 50-69: average
- 30-49: weak
- 0-29: poor / none
Criteria to score:
- moat: durability & width of economic moat
- competitive: competitive/market position
- management: management quality & capital allocation
- industry: industry prospect / secular tailwind
- risk: risk profile (higher score = lower risk)`;

export function buildAnalystPrompt(input: AiInput): string {
  const f = input.fundamentals;
  return [
    aiLanguageInstruction(input.language),
    `You are an equity analyst. Analyze the company ${input.ticker}.`,
    `Fundamentals (already fetched, do not invent numbers):`,
    `- revenue growth (%): ${f.revenueGrowth}`,
    `- net margin (%): ${f.netMargin}`,
    `- ROE (%): ${f.roe}`,
    `- debt/equity: ${f.debtToEquity}`,
    `- P/E: ${f.pe}`,
    input.positionPct !== undefined
      ? `Current portfolio weight of this holding: ${input.positionPct}%`
      : ``,
    RUBRIC,
    `Return ONLY valid JSON with this exact shape (no markdown fences):`,
    `{"criteria":{"moat":{"label":"...","score":0},"competitive":{"label":"...","score":0},"management":{"label":"...","score":0},"industry":{"label":"...","score":0},"risk":{"label":"...","score":0}},"decision":"Accumulate|Hold|Reduce|Avoid","reason":"2-4 sentences referencing the numbers","keyRisks":["..."],"confidence":0.0}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/ai-prompt.test.ts`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add AI analyst prompt builder with rubric"
```

---

### Task 3: Key-pool rotation

**Files:**
- Create: `src/lib/ai/keypool.ts`, `tests/ai-keypool.test.ts`

**Interfaces:**
- Produces: `createKeyPool(keys: string[]): { size: number; next(): string }` (round-robin; throw bila kosong).

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/ai-keypool.test.ts`:
```ts
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
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/ai-keypool.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

Create `src/lib/ai/keypool.ts`:
```ts
export function createKeyPool(keys: string[]): { size: number; next(): string } {
  const clean = keys.map((k) => k.trim()).filter(Boolean);
  if (clean.length === 0) throw new Error("empty key pool");
  let i = 0;
  return {
    size: clean.length,
    next() {
      const k = clean[i % clean.length];
      i++;
      return k;
    },
  };
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/ai-keypool.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add round-robin key pool"
```

---

### Task 4: Orchestrator fallback (provider-agnostic)

**Files:**
- Create: `src/lib/ai/orchestrator.ts`, `tests/ai-orchestrator.test.ts`

**Interfaces:**
- Consumes: `AiProvider`, `AiInput`, `AiResult` (Task 1).
- Produces: `analyzeWithFallback(input: AiInput, providers: AiProvider[]): Promise<{ analysis: AiAnalysis; provider: string; model: string } | null>` (null bila semua gagal).

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/ai-orchestrator.test.ts`:
```ts
import { describe, expect, test, vi } from "vitest";
import { analyzeWithFallback } from "@/lib/ai/orchestrator";
import type { AiProvider, AiInput } from "@/lib/ai/types";

const input: AiInput = {
  ticker: "NVDA",
  fundamentals: { revenueGrowth: 25, netMargin: 30, roe: 40, debtToEquity: 0.5, pe: 40 },
  language: "id",
};

const analysis = {
  criteria: {
    moat: { label: "Wide", score: 90 },
    competitive: { label: "Strong", score: 80 },
    management: { label: "Good", score: 70 },
    industry: { label: "Tailwind", score: 85 },
    risk: { label: "Moderate", score: 60 },
  },
  decision: "Accumulate" as const,
  reason: "x",
  keyRisks: [],
  confidence: 0.8,
};

function provider(name: string, impl: () => Promise<any>): AiProvider {
  return { name, analyze: vi.fn(impl) };
}

describe("analyzeWithFallback", () => {
  test("pakai provider pertama yang sukses", async () => {
    const p1 = provider("gemini", async () => { throw new Error("rate limit"); });
    const p2 = provider("groq", async () => ({ analysis, model: "m2" }));
    const res = await analyzeWithFallback(input, [p1, p2]);
    expect(res).toEqual({ analysis, provider: "groq", model: "m2" });
    expect(p2.analyze).toHaveBeenCalledOnce();
  });

  test("null bila semua provider gagal", async () => {
    const p1 = provider("gemini", async () => { throw new Error("x"); });
    const p2 = provider("groq", async () => { throw new Error("y"); });
    expect(await analyzeWithFallback(input, [p1, p2])).toBeNull();
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/ai-orchestrator.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

Create `src/lib/ai/orchestrator.ts`:
```ts
import type { AiAnalysis, AiInput, AiProvider } from "./types";

export async function analyzeWithFallback(
  input: AiInput,
  providers: AiProvider[],
): Promise<{ analysis: AiAnalysis; provider: string; model: string } | null> {
  for (const p of providers) {
    try {
      const { analysis, model } = await p.analyze(input);
      return { analysis, provider: p.name, model };
    } catch {
      continue;
    }
  }
  return null;
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/ai-orchestrator.test.ts`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add AI provider fallback orchestrator"
```

---

### Task 5: Provider implementations (Gemini, Groq, OpenRouter) + factory

**Files:**
- Create: `src/lib/ai/providers/gemini.ts`, `src/lib/ai/providers/groq.ts`, `src/lib/ai/providers/openrouter.ts`, `src/lib/ai/index.ts`, `tests/ai-providers.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `buildAnalystPrompt` (Task 2), `parseAiAnalysis` (Task 1), `createKeyPool` (Task 3).
- Produces:
  - `makeGeminiProvider(keys: string[], model: string, fetchImpl?): AiProvider`
  - `makeGroqProvider(keys: string[], model: string, fetchImpl?): AiProvider`
  - `makeOpenRouterProvider(keys: string[], model: string, fetchImpl?): AiProvider`
  - `providersFromEnv(): AiProvider[]` (rakit sesuai `AI_PROVIDER_ORDER`, lewati yang tanpa key)
  - Helper diekspor untuk test: `extractGeminiText(json)`, `extractOpenAIText(json)`.

**PENTING sebelum Step 3:** verifikasi ID model + URL endpoint terbaru dari dokumentasi resmi
(Gemini `generativelanguage.googleapis.com`, Groq `api.groq.com/openai/v1`, OpenRouter
`openrouter.ai/api/v1`) via WebSearch/WebFetch. Kode di bawah membaca **model dari argumen/env**,
jadi tidak menebak nama model; yang perlu dipastikan hanyalah bentuk endpoint/response tetap sama.

- [ ] **Step 1: Tulis test yang gagal (ekstraksi teks + pemakaian key)**

Create `tests/ai-providers.test.ts`:
```ts
import { describe, expect, test, vi } from "vitest";
import { extractGeminiText, extractOpenAIText, makeGroqProvider } from "@/lib/ai/index";
import type { AiInput } from "@/lib/ai/types";

const analysisJson = JSON.stringify({
  criteria: {
    moat: { label: "Wide", score: 90 },
    competitive: { label: "Strong", score: 80 },
    management: { label: "Good", score: 70 },
    industry: { label: "Tailwind", score: 85 },
    risk: { label: "Moderate", score: 60 },
  },
  decision: "Accumulate",
  reason: "x",
  keyRisks: [],
  confidence: 0.8,
});

const input: AiInput = {
  ticker: "NVDA",
  fundamentals: { revenueGrowth: 25, netMargin: 30, roe: 40, debtToEquity: 0.5, pe: 40 },
  language: "id",
};

describe("extractors", () => {
  test("extractGeminiText mengambil teks kandidat", () => {
    const t = extractGeminiText({ candidates: [{ content: { parts: [{ text: "hello" }] } }] });
    expect(t).toBe("hello");
  });
  test("extractOpenAIText mengambil message content", () => {
    const t = extractOpenAIText({ choices: [{ message: { content: "world" } }] });
    expect(t).toBe("world");
  });
});

describe("makeGroqProvider", () => {
  test("memakai key dari pool (Authorization Bearer) dan mengembalikan analysis ter-parse", async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: analysisJson } }] }), { status: 200 }),
    ) as unknown as typeof fetch;
    const p = makeGroqProvider(["KEY1"], "some-model", fakeFetch);
    const res = await p.analyze(input);
    expect(res.model).toBe("some-model");
    expect(res.analysis.criteria.moat.score).toBe(90);
    const call = (fakeFetch as any).mock.calls[0];
    expect(call[1].headers.Authorization).toBe("Bearer KEY1");
  });

  test("melempar bila HTTP gagal (agar orchestrator fallback)", async () => {
    const fakeFetch = vi.fn(async () => new Response("nope", { status: 429 })) as unknown as typeof fetch;
    const p = makeGroqProvider(["KEY1"], "some-model", fakeFetch);
    await expect(p.analyze(input)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/ai-providers.test.ts`
Expected: FAIL (module belum ada).

- [ ] **Step 3: Implementasi provider OpenAI-compatible (Groq & OpenRouter)**

Create `src/lib/ai/providers/groq.ts`:
```ts
import { buildAnalystPrompt } from "../prompt";
import { parseAiAnalysis } from "../schema";
import { createKeyPool } from "../keypool";
import type { AiInput, AiProvider, AiResult } from "../types";

export function extractOpenAIText(json: any): string {
  const t = json?.choices?.[0]?.message?.content;
  if (typeof t !== "string") throw new Error("no content");
  return t;
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

export function makeOpenAICompatProvider(opts: {
  name: string;
  baseUrl: string;
  keys: string[];
  model: string;
  fetchImpl?: typeof fetch;
}): AiProvider {
  const pool = createKeyPool(opts.keys);
  const fetchImpl = opts.fetchImpl ?? fetch;
  return {
    name: opts.name,
    async analyze(input: AiInput): Promise<AiResult> {
      const key = pool.next();
      const res = await fetchImpl(`${opts.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: opts.model,
          messages: [{ role: "user", content: buildAnalystPrompt(input) }],
          temperature: 0.2,
        }),
      });
      if (!res.ok) throw new Error(`${opts.name} ${res.status}`);
      const text = stripFences(extractOpenAIText(await res.json()));
      return { analysis: parseAiAnalysis(JSON.parse(text)), model: opts.model };
    },
  };
}

export function makeGroqProvider(keys: string[], model: string, fetchImpl?: typeof fetch): AiProvider {
  return makeOpenAICompatProvider({
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    keys,
    model,
    fetchImpl,
  });
}
```

Create `src/lib/ai/providers/openrouter.ts`:
```ts
import { makeOpenAICompatProvider } from "./groq";
import type { AiProvider } from "../types";

export function makeOpenRouterProvider(keys: string[], model: string, fetchImpl?: typeof fetch): AiProvider {
  return makeOpenAICompatProvider({
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keys,
    model,
    fetchImpl,
  });
}
```

- [ ] **Step 4: Implementasi provider Gemini**

Create `src/lib/ai/providers/gemini.ts`:
```ts
import { buildAnalystPrompt } from "../prompt";
import { parseAiAnalysis } from "../schema";
import { createKeyPool } from "../keypool";
import type { AiInput, AiProvider, AiResult } from "../types";

export function extractGeminiText(json: any): string {
  const t = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof t !== "string") throw new Error("no content");
  return t;
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

export function makeGeminiProvider(keys: string[], model: string, fetchImpl?: typeof fetch): AiProvider {
  const pool = createKeyPool(keys);
  const doFetch = fetchImpl ?? fetch;
  return {
    name: "gemini",
    async analyze(input: AiInput): Promise<AiResult> {
      const key = pool.next();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await doFetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildAnalystPrompt(input) }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) throw new Error(`gemini ${res.status}`);
      const text = stripFences(extractGeminiText(await res.json()));
      return { analysis: parseAiAnalysis(JSON.parse(text)), model };
    },
  };
}
```

- [ ] **Step 5: Factory dari env**

Create `src/lib/ai/index.ts`:
```ts
import { makeGeminiProvider, extractGeminiText } from "./providers/gemini";
import { makeGroqProvider, extractOpenAIText } from "./providers/groq";
import { makeOpenRouterProvider } from "./providers/openrouter";
import type { AiProvider } from "./types";

export { extractGeminiText, extractOpenAIText, makeGeminiProvider, makeGroqProvider, makeOpenRouterProvider };

function keys(name: string): string[] {
  return (process.env[name] ?? "").split(",").map((k) => k.trim()).filter(Boolean);
}

export function providersFromEnv(): AiProvider[] {
  const order = (process.env.AI_PROVIDER_ORDER ?? "gemini,groq,openrouter")
    .split(",").map((s) => s.trim());
  const out: AiProvider[] = [];
  for (const name of order) {
    if (name === "gemini") {
      const k = keys("GEMINI_API_KEYS");
      if (k.length) out.push(makeGeminiProvider(k, process.env.GEMINI_MODEL ?? "", undefined));
    } else if (name === "groq") {
      const k = keys("GROQ_API_KEYS");
      if (k.length) out.push(makeGroqProvider(k, process.env.GROQ_MODEL ?? "", undefined));
    } else if (name === "openrouter") {
      const k = keys("OPENROUTER_API_KEYS");
      if (k.length) out.push(makeOpenRouterProvider(k, process.env.OPENROUTER_MODEL ?? "", undefined));
    }
  }
  return out;
}
```

- [ ] **Step 6: Tambah env contoh**

Append ke `.env.example`:
```
GEMINI_API_KEYS=""
GROQ_API_KEYS=""
OPENROUTER_API_KEYS=""
GEMINI_MODEL=""
GROQ_MODEL=""
OPENROUTER_MODEL=""
AI_PROVIDER_ORDER="gemini,groq,openrouter"
```

- [ ] **Step 7: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/ai-providers.test.ts`
Expected: PASS (4 test).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add Gemini/Groq/OpenRouter providers and env factory"
```

---

### Task 6: Skema DB snapshot + migrasi

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: model `QuarterlySnapshot`, `SnapshotEntry`, `AiAnalysis`.

- [ ] **Step 1: Tambah model**

Append ke `prisma/schema.prisma`:
```prisma
model QuarterlySnapshot {
  id         String          @id @default(cuid())
  quarter    String          @unique
  activeCaps Json
  createdAt  DateTime        @default(now())
  entries    SnapshotEntry[]
}

model SnapshotEntry {
  id             String            @id @default(cuid())
  snapshot       QuarterlySnapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  snapshotId     String
  ticker         String
  compositeScore Float
  allocationPct  Float
  breakdown      Json
}

model AiAnalysis {
  id         String   @id @default(cuid())
  ticker     String
  quarter    String
  criteria   Json
  decision   String
  reason     String
  keyRisks   Json
  confidence Float
  provider   String
  model      String
  language   String
  createdAt  DateTime @default(now())

  @@unique([ticker, quarter])
}
```

- [ ] **Step 2: Migrasi**

Run:
```bash
npx prisma migrate dev --name fase2_snapshots
```
Expected: migrasi sukses, 3 tabel baru terbuat, Prisma Client ter-generate.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add snapshot and AI analysis tables"
```

---

### Task 7: Util quartal + integrasi skor & snapshot (murni)

**Files:**
- Create: `src/lib/quarter.ts`, `src/lib/snapshot.ts`, `tests/quarter.test.ts`, `tests/snapshot.test.ts`

**Interfaces:**
- Consumes: `AiAnalysis`, `AI_CRITERIA` (Task 1).
- Produces:
  - `currentQuarter(d: { year: number; month: number }): string` → `"YYYYQn"`.
  - `criterionScoresFromAnalysis(ticker: string, quarter: string, a: AiAnalysis): Array<{ ticker: string; quarter: string; group: "moat"; key: string; rawValue: number; manual: false }>`
  - `buildSnapshotEntries(scores: Record<string, number>, allocation: Record<string, number>, breakdowns: Record<string, unknown>): Array<{ ticker: string; compositeScore: number; allocationPct: number; breakdown: unknown }>`

- [ ] **Step 1: Tulis test quartal (gagal)**

Create `tests/quarter.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { currentQuarter } from "@/lib/quarter";

describe("currentQuarter", () => {
  test.each([
    [1, "Q1"], [3, "Q1"], [4, "Q2"], [6, "Q2"], [7, "Q3"], [9, "Q3"], [10, "Q4"], [12, "Q4"],
  ])("bulan %i -> %s", (month, q) => {
    expect(currentQuarter({ year: 2026, month })).toBe(`2026${q}`);
  });
});
```

- [ ] **Step 2: Tulis test snapshot/integrasi (gagal)**

Create `tests/snapshot.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { criterionScoresFromAnalysis, buildSnapshotEntries } from "@/lib/snapshot";

const analysis = {
  criteria: {
    moat: { label: "Wide", score: 90 },
    competitive: { label: "Strong", score: 80 },
    management: { label: "Good", score: 70 },
    industry: { label: "Tailwind", score: 85 },
    risk: { label: "Moderate", score: 60 },
  },
  decision: "Accumulate" as const,
  reason: "x",
  keyRisks: [],
  confidence: 0.8,
};

describe("criterionScoresFromAnalysis", () => {
  test("hasilkan 5 baris group moat, manual=false, rawValue dari skor AI", () => {
    const rows = criterionScoresFromAnalysis("NVDA", "2026Q3", analysis);
    expect(rows).toHaveLength(5);
    const moat = rows.find((r) => r.key === "moat");
    expect(moat).toEqual({ ticker: "NVDA", quarter: "2026Q3", group: "moat", key: "moat", rawValue: 90, manual: false });
    expect(rows.every((r) => r.manual === false && r.group === "moat")).toBe(true);
  });
});

describe("buildSnapshotEntries", () => {
  test("gabungkan skor, alokasi, breakdown per ticker", () => {
    const entries = buildSnapshotEntries(
      { NVDA: 82, MSFT: 70 },
      { NVDA: 55, MSFT: 45 },
      { NVDA: { moat: 90 }, MSFT: { moat: 70 } },
    );
    expect(entries).toContainEqual({ ticker: "NVDA", compositeScore: 82, allocationPct: 55, breakdown: { moat: 90 } });
    expect(entries).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/quarter.test.ts tests/snapshot.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implementasi quarter**

Create `src/lib/quarter.ts`:
```ts
export function currentQuarter(d: { year: number; month: number }): string {
  const q = Math.floor((d.month - 1) / 3) + 1;
  return `${d.year}Q${q}`;
}
```

- [ ] **Step 5: Implementasi snapshot**

Create `src/lib/snapshot.ts`:
```ts
import { AI_CRITERIA, type AiAnalysis } from "./ai/types";

export function criterionScoresFromAnalysis(
  ticker: string,
  quarter: string,
  a: AiAnalysis,
): Array<{ ticker: string; quarter: string; group: "moat"; key: string; rawValue: number; manual: false }> {
  return AI_CRITERIA.map((key) => ({
    ticker,
    quarter,
    group: "moat" as const,
    key,
    rawValue: a.criteria[key].score,
    manual: false as const,
  }));
}

export function buildSnapshotEntries(
  scores: Record<string, number>,
  allocation: Record<string, number>,
  breakdowns: Record<string, unknown>,
): Array<{ ticker: string; compositeScore: number; allocationPct: number; breakdown: unknown }> {
  return Object.keys(allocation).map((ticker) => ({
    ticker,
    compositeScore: scores[ticker] ?? 0,
    allocationPct: allocation[ticker],
    breakdown: breakdowns[ticker] ?? {},
  }));
}
```

- [ ] **Step 6: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/quarter.test.ts tests/snapshot.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add quarter util and score/snapshot integration helpers"
```

---

### Task 8: Repo persist + Review pipeline (server action)

**Files:**
- Modify: `src/lib/repo.ts`
- Create: `src/app/review/actions.ts`

**Interfaces:**
- Consumes: `providersFromEnv` (Task 5), `analyzeWithFallback` (Task 4), `criterionScoresFromAnalysis`/`buildSnapshotEntries` (Task 7), `currentQuarter` (Task 7), `fetchFundamentals` (Fase 1), `positionsFromTx`/`actualAllocation` (Fase 1), `compositeScores` (Fase 1), `recommendAllocation` (Fase 1), `resolveAiLanguage`/`getAiLanguage`/`getUserLocale`.
- Produces (repo):
  - `saveCriterionScores(rows): Promise<void>` (upsert per unique [ticker,quarter,group,key], hanya bila belum manual)
  - `saveAiAnalysis(a): Promise<void>` (upsert unique [ticker,quarter])
  - `saveSnapshot(quarter, activeCaps, entries): Promise<void>` (overwrite)
  - `getSnapshot(quarter): Promise<...>`, `listQuarters(): Promise<string[]>`
  - `getCriterionRaw(tickers, quarter): Promise<{criteria, raw}>`
- Produces (action): `runReview(quarterOverride?: string): Promise<{ quarter: string; aiUnavailable: boolean }>`

- [ ] **Step 1: Repo — persist & query**

Append ke `src/lib/repo.ts`:
```ts
import type { AiAnalysis } from "./ai/types";

export async function saveCriterionScores(
  rows: Array<{ ticker: string; quarter: string; group: string; key: string; rawValue: number; manual: boolean }>,
): Promise<void> {
  for (const r of rows) {
    const existing = await prisma.criterionScore.findUnique({
      where: { ticker_quarter_group_key: { ticker: r.ticker, quarter: r.quarter, group: r.group, key: r.key } },
    });
    if (existing?.manual) continue; // jangan timpa override manual
    await prisma.criterionScore.upsert({
      where: { ticker_quarter_group_key: { ticker: r.ticker, quarter: r.quarter, group: r.group, key: r.key } },
      update: { rawValue: r.rawValue, manual: r.manual },
      create: r,
    });
  }
}

export async function saveAiAnalysis(a: {
  ticker: string; quarter: string; analysis: AiAnalysis; provider: string; model: string; language: string;
}): Promise<void> {
  const data = {
    ticker: a.ticker, quarter: a.quarter,
    criteria: a.analysis.criteria as any, decision: a.analysis.decision,
    reason: a.analysis.reason, keyRisks: a.analysis.keyRisks as any,
    confidence: a.analysis.confidence, provider: a.provider, model: a.model, language: a.language,
  };
  await prisma.aiAnalysis.upsert({
    where: { ticker_quarter: { ticker: a.ticker, quarter: a.quarter } },
    update: data, create: data,
  });
}

export async function saveSnapshot(
  quarter: string,
  activeCaps: string[],
  entries: Array<{ ticker: string; compositeScore: number; allocationPct: number; breakdown: unknown }>,
): Promise<void> {
  await prisma.quarterlySnapshot.deleteMany({ where: { quarter } }); // overwrite
  await prisma.quarterlySnapshot.create({
    data: {
      quarter, activeCaps: activeCaps as any,
      entries: { create: entries.map((e) => ({ ...e, breakdown: e.breakdown as any })) },
    },
  });
}

export async function getSnapshot(quarter: string) {
  return prisma.quarterlySnapshot.findUnique({ where: { quarter }, include: { entries: true } });
}

export async function listQuarters(): Promise<string[]> {
  const rows = await prisma.quarterlySnapshot.findMany({ orderBy: { quarter: "desc" }, select: { quarter: true } });
  return rows.map((r) => r.quarter);
}

export async function getAiAnalysis(ticker: string, quarter: string) {
  return prisma.aiAnalysis.findUnique({ where: { ticker_quarter: { ticker, quarter } } });
}
```

- [ ] **Step 2: Server action runReview**

Create `src/app/review/actions.ts`:
```ts
"use server";

import { prisma } from "@/lib/db";
import { getTransactions, getGroupWeights, getCaps, getSectors, getAiLanguage, saveCriterionScores, saveAiAnalysis, saveSnapshot } from "@/lib/repo";
import { positionsFromTx, actualAllocation } from "@/lib/holdings";
import { compositeScores, type Criterion } from "@/lib/scoring";
import { recommendAllocation } from "@/lib/allocation";
import { fetchFundamentals } from "@/lib/fmp";
import { providersFromEnv } from "@/lib/ai";
import { analyzeWithFallback } from "@/lib/ai/orchestrator";
import { criterionScoresFromAnalysis, buildSnapshotEntries } from "@/lib/snapshot";
import { currentQuarter } from "@/lib/quarter";
import { resolveAiLanguage } from "@/lib/language";
import { getUserLocale } from "@/i18n/locale-actions";
import { AI_CRITERIA } from "@/lib/ai/types";
import { revalidatePath } from "next/cache";

export async function runReview(quarterOverride?: string): Promise<{ quarter: string; aiUnavailable: boolean }> {
  const now = new Date();
  const quarter = quarterOverride ?? currentQuarter({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const txs = await getTransactions();
  const positions = positionsFromTx(txs);
  const tickers = positions.map((p) => p.ticker);

  const providers = providersFromEnv();
  const language = resolveAiLanguage(await getAiLanguage(), await getUserLocale());
  let aiUnavailable = providers.length === 0;

  // AI per saham (grounding: fundamental fetched, fallback provider)
  for (const t of tickers) {
    let fundamentals;
    try { fundamentals = await fetchFundamentals(t); }
    catch { continue; } // tanpa fundamental, lewati AI untuk saham ini
    if (providers.length === 0) continue;
    const res = await analyzeWithFallback({ ticker: t, fundamentals, language }, providers);
    if (!res) { aiUnavailable = true; continue; }
    await saveCriterionScores(criterionScoresFromAnalysis(t, quarter, res.analysis));
    await saveAiAnalysis({ ticker: t, quarter, analysis: res.analysis, provider: res.provider, model: res.model, language });
  }

  // skor SAW dari CriterionScore (fallback netral 50)
  const rows = await prisma.criterionScore.findMany({ where: { ticker: { in: tickers }, quarter } });
  const criteria: Criterion[] = [];
  const seen = new Set<string>();
  const raw: Record<string, Record<string, number>> = {};
  for (const t of tickers) raw[t] = {};
  for (const r of rows) {
    raw[r.ticker][r.key] = r.rawValue;
    const id = `${r.group}:${r.key}`;
    if (!seen.has(id)) { criteria.push({ key: r.key, group: r.group, direction: "benefit" }); seen.add(id); }
  }
  for (const t of tickers) for (const c of criteria) raw[t][c.key] ??= 50;

  const scores = criteria.length
    ? compositeScores({ criteria, raw, groupWeights: await getGroupWeights() })
    : Object.fromEntries(tickers.map((t) => [t, 50]));

  const rec = recommendAllocation({ scores, sectors: await getSectors(), caps: await getCaps(), aggressiveness: 1 });
  const entries = buildSnapshotEntries(scores, rec.allocation, raw);
  await saveSnapshot(quarter, rec.activeCaps, entries);

  revalidatePath("/review");
  return { quarter, aiUnavailable };
}
```

- [ ] **Step 3: Verifikasi typecheck**

Run: `npx tsc --noEmit`
Expected: TYPECHECK OK (perhatikan nama relasi Prisma `ticker_quarter_group_key` & `ticker_quarter` sesuai `@@unique`).

- [ ] **Step 4: Verifikasi manual pipeline (tanpa key AI → jalur aiUnavailable)**

Run:
```bash
npm run dev  # pastikan DB jalan
```
Panggil action lewat halaman Review (Task 10) atau sementara via node REPL tidak diperlukan; verifikasi akhir dilakukan di Task 10. Untuk sekarang cukup pastikan `npx tsc --noEmit` lulus.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add review pipeline (repo persist + runReview server action)"
```

---

### Task 9: Stockcard page

**Files:**
- Create: `src/app/stock/[ticker]/page.tsx`
- Modify: `messages/id.json`, `messages/en.json`

**Interfaces:**
- Consumes: `getAiAnalysis`, `getSnapshot`, `listQuarters` (Task 8); i18n.

- [ ] **Step 1: Tambah kunci i18n**

Add ke `messages/id.json` (dan padanan EN di `messages/en.json`):
```json
"stock": {
  "title": "Kartu Saham",
  "compositeScore": "Skor Komposit",
  "decision": "Keputusan",
  "reason": "Alasan",
  "risks": "Risiko Utama",
  "confidence": "Keyakinan",
  "moat": "Moat",
  "aiUnavailable": "Analisa AI belum tersedia untuk quartal ini",
  "criteria": "Kriteria"
}
```
`messages/en.json`:
```json
"stock": {
  "title": "Stock Card",
  "compositeScore": "Composite Score",
  "decision": "Decision",
  "reason": "Reason",
  "risks": "Key Risks",
  "confidence": "Confidence",
  "moat": "Moat",
  "aiUnavailable": "No AI analysis available for this quarter yet",
  "criteria": "Criteria"
}
```

- [ ] **Step 2: Halaman Stockcard**

Create `src/app/stock/[ticker]/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { getAiAnalysis, listQuarters } from "@/lib/repo";
import { AI_CRITERIA } from "@/lib/ai/types";

export default async function StockCard({ params }: { params: { ticker: string } }) {
  const t = await getTranslations("stock");
  const ticker = params.ticker.toUpperCase();
  const quarters = await listQuarters();
  const quarter = quarters[0];
  const ai = quarter ? await getAiAnalysis(ticker, quarter) : null;

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">{ticker} — {t("title")}</h1>
      {!ai && <p className="text-amber-600">{t("aiUnavailable")}</p>}
      {ai && (
        <div className="space-y-3 max-w-2xl">
          <p><b>{t("decision")}:</b> {ai.decision} · <b>{t("confidence")}:</b> {(ai.confidence * 100).toFixed(0)}%</p>
          <p><b>{t("reason")}:</b> {ai.reason}</p>
          <div>
            <b>{t("criteria")}:</b>
            <ul className="list-disc ml-6">
              {AI_CRITERIA.map((k) => {
                const c = (ai.criteria as any)[k];
                return <li key={k}>{k}: {c?.label} ({c?.score})</li>;
              })}
            </ul>
          </div>
          <div>
            <b>{t("risks")}:</b>
            <ul className="list-disc ml-6">
              {(ai.keyRisks as string[]).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
          <p className="text-xs text-gray-400">{ai.provider} · {ai.model} · {quarter}</p>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verifikasi parity + typecheck**

Run: `npm run test -- tests/i18n-parity.test.ts && npx tsc --noEmit`
Expected: parity PASS, TYPECHECK OK.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add stockcard page with AI analysis"
```

---

### Task 10: Review page (run + pemilih quartal) & verifikasi end-to-end

**Files:**
- Create: `src/app/review/page.tsx`, `src/components/RunReviewButton.tsx`
- Modify: `messages/id.json`, `messages/en.json`, `src/app/page.tsx` (tautan)

**Interfaces:**
- Consumes: `runReview` (Task 8), `getSnapshot`/`listQuarters` (Task 8), i18n.

- [ ] **Step 1: Tambah kunci i18n**

Add ke `messages/id.json`:
```json
"review": {
  "title": "Review Quartal",
  "run": "Jalankan Review Quartal",
  "running": "Menjalankan...",
  "quarter": "Quartal",
  "ticker": "Ticker",
  "score": "Skor",
  "allocation": "Alokasi %",
  "aiUnavailable": "Sebagian/semua analisa AI tidak tersedia (skor pakai nilai manual/netral)",
  "noSnapshot": "Belum ada snapshot. Jalankan review."
}
```
`messages/en.json`:
```json
"review": {
  "title": "Quarterly Review",
  "run": "Run Quarterly Review",
  "running": "Running...",
  "quarter": "Quarter",
  "ticker": "Ticker",
  "score": "Score",
  "allocation": "Allocation %",
  "aiUnavailable": "Some/all AI analysis unavailable (scores use manual/neutral values)",
  "noSnapshot": "No snapshot yet. Run a review."
}
```

- [ ] **Step 2: Tombol run (client)**

Create `src/components/RunReviewButton.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { runReview } from "@/app/review/actions";

export default function RunReviewButton() {
  const t = useTranslations("review");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await runReview();
            setMsg(r.aiUnavailable ? t("aiUnavailable") : `${t("quarter")}: ${r.quarter}`);
          })
        }
      >
        {isPending ? t("running") : t("run")}
      </button>
      {msg && <p className="text-sm text-amber-600">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Halaman Review**

Create `src/app/review/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { getSnapshot, listQuarters } from "@/lib/repo";
import RunReviewButton from "@/components/RunReviewButton";

export default async function ReviewPage({ searchParams }: { searchParams: { q?: string } }) {
  const t = await getTranslations("review");
  const quarters = await listQuarters();
  const quarter = searchParams.q ?? quarters[0];
  const snap = quarter ? await getSnapshot(quarter) : null;
  const entries = (snap?.entries ?? []).slice().sort((a, b) => b.allocationPct - a.allocationPct);

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <RunReviewButton />
      {quarters.length > 0 && (
        <form className="text-sm">
          <label>{t("quarter")}: </label>
          <select name="q" defaultValue={quarter} className="border rounded px-2 py-1">
            {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <button className="ml-2 underline" type="submit">↻</button>
        </form>
      )}
      {!snap && <p className="text-gray-500">{t("noSnapshot")}</p>}
      {snap && (
        <table className="w-full max-w-lg text-left">
          <thead><tr><th>{t("ticker")}</th><th>{t("score")}</th><th>{t("allocation")}</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.ticker} className="border-t">
                <td className="py-1"><a className="text-blue-600 underline" href={`/stock/${e.ticker}`}>{e.ticker}</a></td>
                <td>{e.compositeScore.toFixed(1)}</td>
                <td>{e.allocationPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Tautan dari dashboard**

Modify `src/app/page.tsx` — tambah tautan setelah tautan recommendation:
```tsx
      <a className="block text-blue-600 underline" href="/review">
        {t("viewRecommendation")}
      </a>
```
(Gunakan kunci baru `app.viewReview` — tambahkan `"viewReview": "Review Quartal"` / `"Quarterly Review"` ke messages, lalu pakai `{t("viewReview")}`.)

- [ ] **Step 5: Verifikasi parity + typecheck + test penuh**

Run: `npm run test && npx tsc --noEmit`
Expected: semua test PASS (termasuk parity), TYPECHECK OK.

- [ ] **Step 6: Verifikasi end-to-end (dev)**

Run:
```bash
npm run dev
# buka http://localhost:3000/review, klik "Jalankan Review Quartal"
```
Expected (tanpa key AI): review selesai, muncul pesan aiUnavailable, snapshot tersimpan, tabel alokasi total ~100% (dengan cukup saham), tiap ticker tertaut ke stockcard.
Dengan key AI di `.env` (model diverifikasi dari docs): stockcard menampilkan moat/decision/reason.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add quarterly review page with run action and quarter selector"
```

---

## Self-Review

**Spec coverage (Fase 2):**
- AI abstraction (Gemini→Groq→OpenRouter, key-pool, fallback) → Task 3,4,5. ✓
- ID model dari env + verifikasi docs → Global Constraints + Task 5 catatan. ✓
- Bahasa AI (resolveAiLanguage) → Task 8 (dipakai di pipeline). ✓
- Output hybrid (label+score) + schema guard → Task 1,2. ✓
- Integrasi ke CriterionScore group moat, tidak menimpa manual → Task 7 + Task 8 saveCriterionScores. ✓
- Quarterly pipeline + snapshot overwrite + auto quarter → Task 6,7,8. ✓
- Stockcard → Task 9. ✓
- Review page + pemilih/compare quartal → Task 10. ✓
- Error handling (fallback, AI unavailable, fetch stale) → Task 8 (jalur null/continue). ✓
- Testing unit tanpa API → Task 1–7 (parser, prompt, keypool, orchestrator, providers mocked fetch, quarter, snapshot). ✓

**Placeholder scan:** tidak ada TBD/TODO; setiap step berisi kode nyata. Model ID sengaja kosong di env (diverifikasi saat implementasi) — ini keputusan desain, bukan placeholder kode.

**Type consistency:** `AiAnalysis`, `AiInput`, `AiResult`, `AiProvider`, `AiCriterionKey`, `Decision` dipakai konsisten; `analyzeWithFallback` mengembalikan `{analysis, provider, model}` sesuai dipakai Task 8; nama unique Prisma `ticker_quarter_group_key` & `ticker_quarter` konsisten antara schema (Task 2/6) dan repo (Task 8).

**Catatan:** Verifikasi end-to-end penuh dengan AI asli bergantung pada key + ID model yang benar; plan sengaja memastikan pipeline tetap jalan (jalur aiUnavailable) tanpa key sehingga bisa diverifikasi lebih dulu.
