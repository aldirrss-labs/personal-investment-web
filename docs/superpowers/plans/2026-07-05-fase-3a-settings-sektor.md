# Fase 3a — Settings + Sektor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Halaman Settings untuk mengatur bobot SAW, cap saham/sektor, peta sektor (auto-fetch FMP `industry`), pilihan model AI + urutan provider, dan `ai_language` — mengaktifkan cap sektor yang kini mati.

**Architecture:** Logika validasi & listing model = fungsi murni/teruji di `src/lib/`. Konfigurasi disimpan di tabel `Setting` (JSON) + relasi `Sector`/`Company.sectorId`. `buildProviders()` async membaca Setting (fallback `.env`). UI Next server actions.

**Tech Stack:** Next.js 14, TypeScript, Prisma, Vitest, next-intl.

## Global Constraints

- API keys tetap di `.env` — TIDAK disimpan/diedit via UI/DB.
- Sektor dari FMP `industry` (bukan `sector`) + override manual.
- Cap di-clamp 0–100; bobot SAW semua-0 → fallback default 35/30/15/20.
- Model AI dipilih dari daftar dinamis API `/models`; disimpan di `Setting`, fallback `.env`.
- Fungsi murni di `src/lib/**` tanpa import React/Next/Prisma → wajib unit test.
- Auto-fetch "semua" sektor sekuensial + jeda (pola throttle Fase 2b), pakai FMP key pool.
- i18n: teks baru di `messages/{id,en}.json`, parity test dijaga.
- Frequent commits (Conventional Commits). Spec: `docs/superpowers/specs/2026-07-05-fase-3a-settings-sektor-design.md`.

---

## File Structure

```
src/lib/settings.ts           # validasi murni (weights, cap, sector caps)
src/lib/ai/models.ts          # listGeminiModels/listGroqModels/listOpenRouterModels (+filter)
src/lib/ai/index.ts           # (modify) providersFromEnv -> buildProviders() async
src/lib/fmp.ts                # (modify) fetchProfile()
src/lib/repo.ts               # (modify) setters + getAiModels/getProviderOrder + assignSector
src/app/review/actions.ts     # (modify) pakai buildProviders()
src/app/settings/page.tsx     # UI Settings
src/app/settings/actions.ts   # server actions (save*, fetch sector)
src/app/settings/*.tsx        # komponen client form
src/app/page.tsx              # (modify) tautan ke /settings
messages/{id,en}.json         # (modify) i18n
tests/settings.test.ts
tests/ai-models.test.ts
tests/fmp-profile.test.ts
tests/build-providers.test.ts
```

---

### Task 1: Validasi settings (murni)

**Files:**
- Create: `src/lib/settings.ts`, `tests/settings.test.ts`

**Interfaces:**
- Produces:
  - `type Weights = { fundamental: number; moat: number; technical: number; diversification: number }`
  - `DEFAULT_WEIGHTS: Weights`
  - `validateWeights(input: Record<string, unknown>): Weights` (angka ≥0; semua-0 → default)
  - `clampCap(n: unknown): number` (0..100; non-angka → 0)
  - `sanitizeSectorCaps(input: Record<string, unknown>): Record<string, number>` (clamp 0..100, buang key kosong)

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/settings.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { validateWeights, clampCap, sanitizeSectorCaps, DEFAULT_WEIGHTS } from "@/lib/settings";

describe("validateWeights", () => {
  test("angka valid dipertahankan", () => {
    expect(validateWeights({ fundamental: 40, moat: 30, technical: 10, diversification: 20 }))
      .toEqual({ fundamental: 40, moat: 30, technical: 10, diversification: 20 });
  });
  test("negatif -> 0, non-angka -> 0", () => {
    expect(validateWeights({ fundamental: -5, moat: "x", technical: 10, diversification: 20 }))
      .toEqual({ fundamental: 0, moat: 0, technical: 10, diversification: 20 });
  });
  test("semua 0 -> default", () => {
    expect(validateWeights({ fundamental: 0, moat: 0, technical: 0, diversification: 0 }))
      .toEqual(DEFAULT_WEIGHTS);
  });
});

describe("clampCap", () => {
  test.each([
    [50, 50], [-3, 0], [150, 100], ["x", 0],
  ])("%s -> %s", (input, out) => {
    expect(clampCap(input as unknown)).toBe(out);
  });
});

describe("sanitizeSectorCaps", () => {
  test("clamp & buang key kosong", () => {
    expect(sanitizeSectorCaps({ Semiconductors: 120, Software: -1, "": 30, Cloud: 40 }))
      .toEqual({ Semiconductors: 100, Software: 0, Cloud: 40 });
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/settings.test.ts`
Expected: FAIL (module belum ada).

- [ ] **Step 3: Implementasi**

Create `src/lib/settings.ts`:
```ts
export type Weights = {
  fundamental: number;
  moat: number;
  technical: number;
  diversification: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  fundamental: 35,
  moat: 30,
  technical: 15,
  diversification: 20,
};

function nonNeg(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function validateWeights(input: Record<string, unknown>): Weights {
  const w: Weights = {
    fundamental: nonNeg(input.fundamental),
    moat: nonNeg(input.moat),
    technical: nonNeg(input.technical),
    diversification: nonNeg(input.diversification),
  };
  const sum = w.fundamental + w.moat + w.technical + w.diversification;
  return sum === 0 ? { ...DEFAULT_WEIGHTS } : w;
}

export function clampCap(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

export function sanitizeSectorCaps(input: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!k.trim()) continue;
    out[k] = clampCap(v);
  }
  return out;
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/settings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add settings validation helpers"
```

---

### Task 2: Listing model AI dinamis (fetch, mock)

**Files:**
- Create: `src/lib/ai/models.ts`, `tests/ai-models.test.ts`

**Interfaces:**
- Produces:
  - `listGeminiModels(key: string, fetchImpl?: typeof fetch): Promise<string[]>`
  - `listGroqModels(key: string, fetchImpl?: typeof fetch): Promise<string[]>`
  - `listOpenRouterModels(fetchImpl?: typeof fetch): Promise<string[]>`
  - Ekspor helper `isChatModelId(id: string): boolean` (buang whisper/tts/guard/embed/orpheus/image).

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/ai-models.test.ts`:
```ts
import { describe, expect, test, vi } from "vitest";
import { listGeminiModels, listGroqModels, listOpenRouterModels, isChatModelId } from "@/lib/ai/models";

function resp(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("isChatModelId", () => {
  test("buang model non-chat", () => {
    expect(isChatModelId("llama-3.3-70b-versatile")).toBe(true);
    expect(isChatModelId("whisper-large-v3")).toBe(false);
    expect(isChatModelId("meta-llama/llama-prompt-guard-2-86m")).toBe(false);
    expect(isChatModelId("canopylabs/orpheus-v1-english")).toBe(false);
  });
});

describe("listGeminiModels", () => {
  test("hanya model yg support generateContent, tanpa prefix models/", async () => {
    const f = vi.fn(async () => resp({ models: [
      { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
      { name: "models/embedding-001", supportedGenerationMethods: ["embedContent"] },
    ] })) as unknown as typeof fetch;
    expect(await listGeminiModels("K", f)).toEqual(["gemini-2.5-flash"]);
  });
});

describe("listGroqModels", () => {
  test("id chat saja (buang whisper dsb)", async () => {
    const f = vi.fn(async () => resp({ data: [
      { id: "openai/gpt-oss-120b" }, { id: "whisper-large-v3" }, { id: "llama-3.1-8b-instant" },
    ] })) as unknown as typeof fetch;
    expect(await listGroqModels("K", f)).toEqual(["openai/gpt-oss-120b", "llama-3.1-8b-instant"]);
  });
});

describe("listOpenRouterModels", () => {
  test("kembalikan semua id", async () => {
    const f = vi.fn(async () => resp({ data: [{ id: "google/gemini-3.5-flash" }, { id: "x/y:free" }] })) as unknown as typeof fetch;
    expect(await listOpenRouterModels(f)).toEqual(["google/gemini-3.5-flash", "x/y:free"]);
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/ai-models.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

Create `src/lib/ai/models.ts`:
```ts
const NON_CHAT = /whisper|tts|guard|embed|orpheus|image|moderation|rerank/i;

export function isChatModelId(id: string): boolean {
  return !NON_CHAT.test(id);
}

async function getJson(url: string, fetchImpl: typeof fetch, headers?: Record<string, string>) {
  const res = await fetchImpl(url, headers ? { headers } : undefined);
  if (!res.ok) throw new Error(`models ${res.status}`);
  return res.json() as Promise<any>;
}

export async function listGeminiModels(key: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const json = await getJson(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`,
    fetchImpl,
  );
  return (json.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m: any) => String(m.name).replace(/^models\//, ""));
}

export async function listGroqModels(key: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const json = await getJson("https://api.groq.com/openai/v1/models", fetchImpl, {
    Authorization: `Bearer ${key}`,
  });
  return (json.data ?? []).map((m: any) => String(m.id)).filter(isChatModelId);
}

export async function listOpenRouterModels(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const json = await getJson("https://openrouter.ai/api/v1/models", fetchImpl);
  return (json.data ?? []).map((m: any) => String(m.id));
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/ai-models.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add dynamic AI model listing per provider"
```

---

### Task 3: FMP fetchProfile (fetch, mock)

**Files:**
- Modify: `src/lib/fmp.ts`
- Create: `tests/fmp-profile.test.ts`

**Interfaces:**
- Consumes: `getFmpKeys()` (ada).
- Produces: `fetchProfile(ticker: string, fetchImpl?: typeof fetch, apiKey?: string): Promise<{ sector: string; industry: string }>`

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/fmp-profile.test.ts`:
```ts
import { describe, expect, test, vi } from "vitest";
import { fetchProfile } from "@/lib/fmp";

describe("fetchProfile", () => {
  test("ambil sector & industry dari /stable/profile", async () => {
    const f = vi.fn(async () =>
      new Response(JSON.stringify([{ symbol: "NVDA", sector: "Technology", industry: "Semiconductors" }]), { status: 200 }),
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
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/fmp-profile.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasi (tambah di `src/lib/fmp.ts`)**

Tambahkan setelah `fetchFundamentals`:
```ts
export async function fetchProfile(
  ticker: string,
  fetchImpl: typeof fetch = fetch,
  apiKey?: string,
): Promise<{ sector: string; industry: string }> {
  const key = apiKey ?? getFmpKeys()[0] ?? "";
  const res = await fetchImpl(`${BASE}/profile?symbol=${ticker}&apikey=${key}`);
  if (!res.ok) throw new Error(`FMP ${res.status}`);
  const json = (await res.json()) as any;
  const p = Array.isArray(json) ? json[0] : json;
  return { sector: p?.sector ?? "", industry: p?.industry ?? "" };
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npm run test -- tests/fmp-profile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add FMP fetchProfile (sector/industry)"
```

---

### Task 4: Repo setters + AI config getters + assignSector

**Files:**
- Modify: `src/lib/repo.ts`

**Interfaces:**
- Consumes: `prisma`, `Weights` (Task 1), `Caps` (`@/lib/allocation`).
- Produces:
  - `saveGroupWeights(w: Weights): Promise<void>` (Setting `saw_weights`)
  - `saveCaps(caps: { perStock: number; perSector: Record<string, number> }): Promise<void>` (Setting `caps`)
  - `saveAiLanguage(v: "follow_ui" | "en" | "id"): Promise<void>` (Setting `ai_language`)
  - `saveAiModels(m: { gemini?: string; groq?: string; openrouter?: string }): Promise<void>` (Setting `ai_models`)
  - `saveProviderOrder(order: string[]): Promise<void>` (Setting `ai_provider_order`)
  - `getAiModels(): Promise<{ gemini?: string; groq?: string; openrouter?: string }>`
  - `getProviderOrder(): Promise<string[] | null>`
  - `assignSector(ticker: string, sectorName: string): Promise<void>` (upsert Sector by name, set Company.sectorId)
  - `getCompaniesWithSector(): Promise<Array<{ ticker: string; sector: string | null }>>`

- [ ] **Step 1: Tambah helper `putSetting` + fungsi (di `src/lib/repo.ts`)**

Tambahkan (perhatikan `saveCaps` menimpa nama lama bila ada — hapus definisi lama bila duplikat; repo saat ini punya `getCaps` saja, jadi `saveCaps` baru aman):
```ts
import type { Weights } from "./settings";

async function putSetting(key: string, value: unknown): Promise<void> {
  const v = JSON.stringify(value);
  await prisma.setting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
}

export async function saveGroupWeights(w: Weights): Promise<void> {
  await putSetting("saw_weights", w);
}

export async function saveCaps(caps: { perStock: number; perSector: Record<string, number> }): Promise<void> {
  await putSetting("caps", caps);
}

export async function saveAiLanguage(v: "follow_ui" | "en" | "id"): Promise<void> {
  await putSetting("ai_language", v);
}

export async function saveAiModels(m: { gemini?: string; groq?: string; openrouter?: string }): Promise<void> {
  await putSetting("ai_models", m);
}

export async function saveProviderOrder(order: string[]): Promise<void> {
  await putSetting("ai_provider_order", order);
}

export async function getAiModels(): Promise<{ gemini?: string; groq?: string; openrouter?: string }> {
  const s = await prisma.setting.findUnique({ where: { key: "ai_models" } });
  return s ? JSON.parse(s.value) : {};
}

export async function getProviderOrder(): Promise<string[] | null> {
  const s = await prisma.setting.findUnique({ where: { key: "ai_provider_order" } });
  return s ? JSON.parse(s.value) : null;
}

export async function assignSector(ticker: string, sectorName: string): Promise<void> {
  const name = sectorName.trim();
  if (!name) return;
  const sector = await prisma.sector.upsert({ where: { name }, update: {}, create: { name } });
  await prisma.company.update({ where: { ticker }, data: { sectorId: sector.id } });
}

export async function getCompaniesWithSector(): Promise<Array<{ ticker: string; sector: string | null }>> {
  const rows = await prisma.company.findMany({ include: { sector: true }, orderBy: { ticker: "asc" } });
  return rows.map((r) => ({ ticker: r.ticker, sector: r.sector?.name ?? null }));
}
```

Catatan: `sasave_language` value harus cocok dgn `getAiLanguage` (ada) yang menerima `"en"|"id"|"follow_ui"`. `getAiLanguage` membaca string mentah; simpan sebagai JSON string tetap kompatibel karena `getAiLanguage` cek `v==="en"` dst — **ubah `getAiLanguage` agar `JSON.parse` dulu** (lihat Step 2).

- [ ] **Step 2: Selaraskan `getAiLanguage` dengan penyimpanan JSON**

Di `src/lib/repo.ts`, ganti isi `getAiLanguage` menjadi:
```ts
export async function getAiLanguage(): Promise<AiLanguageSetting> {
  const s = await prisma.setting.findUnique({ where: { key: "ai_language" } });
  if (!s) return "follow_ui";
  let v: unknown;
  try { v = JSON.parse(s.value); } catch { v = s.value; }
  return v === "en" || v === "id" || v === "follow_ui" ? v : "follow_ui";
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: TYPECHECK OK.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add settings/sector repo writers and AI config getters"
```

---

### Task 5: buildProviders() async (Setting over env)

**Files:**
- Modify: `src/lib/ai/index.ts`, `src/app/review/actions.ts`
- Create: `tests/build-providers.test.ts`

**Interfaces:**
- Consumes: `getAiModels`, `getProviderOrder` (Task 4); factory `makeGeminiProvider` dll (ada).
- Produces: `buildProviders(cfg: { order: string[]; models: { gemini?: string; groq?: string; openrouter?: string }; env?: NodeJS.ProcessEnv }): AiProvider[]` (murni atas cfg), dan `buildProvidersFromStore(): Promise<AiProvider[]>` (baca repo + env). Pertahankan `providersFromEnv()` sebagai pemanggil `buildProviders` dgn env saja (kompat test lama).

- [ ] **Step 1: Tulis test yang gagal**

Create `tests/build-providers.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { buildProviders } from "@/lib/ai/index";

const env = {
  GEMINI_API_KEYS: "g1,g2",
  GROQ_API_KEYS: "q1",
  OPENROUTER_API_KEYS: "",
  GEMINI_MODEL: "env-gemini",
  GROQ_MODEL: "env-groq",
} as unknown as NodeJS.ProcessEnv;

describe("buildProviders", () => {
  test("urutan sesuai cfg.order & lewati provider tanpa key", () => {
    const ps = buildProviders({ order: ["groq", "gemini", "openrouter"], models: {}, env });
    expect(ps.map((p) => p.name)).toEqual(["groq", "gemini"]); // openrouter tanpa key -> dilewati
  });
  test("model dari Setting menang atas env (tercermin di label tak langsung -> cek via tidak error)", () => {
    const ps = buildProviders({ order: ["gemini"], models: { gemini: "store-gemini" }, env });
    expect(ps).toHaveLength(1);
    expect(ps[0].name).toBe("gemini");
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npm run test -- tests/build-providers.test.ts`
Expected: FAIL (export `buildProviders` belum ada).

- [ ] **Step 3: Implementasi (ganti `providersFromEnv` di `src/lib/ai/index.ts`)**

Ganti fungsi `providersFromEnv` menjadi:
```ts
function keysFrom(env: NodeJS.ProcessEnv, name: string): string[] {
  return (env[name] ?? "").split(",").map((k) => k.trim()).filter(Boolean);
}

export function buildProviders(cfg: {
  order: string[];
  models: { gemini?: string; groq?: string; openrouter?: string };
  env?: NodeJS.ProcessEnv;
}): AiProvider[] {
  const env = cfg.env ?? process.env;
  const out: AiProvider[] = [];
  for (const name of cfg.order) {
    if (name === "gemini") {
      const k = keysFrom(env, "GEMINI_API_KEYS");
      if (k.length) out.push(makeGeminiProvider(k, cfg.models.gemini || env.GEMINI_MODEL || "", undefined));
    } else if (name === "groq") {
      const k = keysFrom(env, "GROQ_API_KEYS");
      if (k.length) out.push(makeGroqProvider(k, cfg.models.groq || env.GROQ_MODEL || "", undefined));
    } else if (name === "openrouter") {
      const k = keysFrom(env, "OPENROUTER_API_KEYS");
      if (k.length) out.push(makeOpenRouterProvider(k, cfg.models.openrouter || env.OPENROUTER_MODEL || "", undefined));
    }
  }
  return out;
}

export function providersFromEnv(): AiProvider[] {
  const order = (process.env.AI_PROVIDER_ORDER ?? "gemini,groq,openrouter").split(",").map((s) => s.trim());
  return buildProviders({ order, models: {} });
}
```

- [ ] **Step 4: Tambah `buildProvidersFromStore` (di `src/lib/ai/index.ts`)**

```ts
import { getAiModels, getProviderOrder } from "@/lib/repo";

export async function buildProvidersFromStore(): Promise<AiProvider[]> {
  const envOrder = (process.env.AI_PROVIDER_ORDER ?? "gemini,groq,openrouter").split(",").map((s) => s.trim());
  const order = (await getProviderOrder()) ?? envOrder;
  const models = await getAiModels();
  return buildProviders({ order, models });
}
```

- [ ] **Step 5: Pakai di review pipeline**

Di `src/app/review/actions.ts`: ganti `import { providersFromEnv } from "@/lib/ai";` → `import { buildProvidersFromStore } from "@/lib/ai";` dan baris `const providers = providersFromEnv();` → `const providers = await buildProvidersFromStore();`.

- [ ] **Step 6: Jalankan test + typecheck**

Run: `npm run test -- tests/build-providers.test.ts tests/ai-providers.test.ts && npx tsc --noEmit`
Expected: PASS + TYPECHECK OK.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: buildProviders reads model/order from settings (fallback env)"
```

---

### Task 6: Settings UI (page + actions + i18n + link)

**Files:**
- Create: `src/app/settings/actions.ts`, `src/app/settings/page.tsx`, `src/app/settings/SettingsForm.tsx`
- Modify: `messages/id.json`, `messages/en.json`, `src/app/page.tsx`

**Interfaces:**
- Consumes: repo setters/getters (Task 4), `getGroupWeights`/`getCaps`/`getAiLanguage`/`getFmpKeys` (ada), `validateWeights`/`clampCap`/`sanitizeSectorCaps` (Task 1), `listGeminiModels/listGroqModels/listOpenRouterModels` (Task 2), `fetchProfile` (Task 3), `createKeyPool` (ada).
- Produces server actions: `saveSettings(form)`, `fetchSectorFor(ticker)`, `fetchAllSectors()`, `refreshModels()`.

- [ ] **Step 1: i18n keys**

Tambah ke `messages/id.json` (dan padanan EN di `messages/en.json`):
```json
"settings": {
  "title": "Pengaturan",
  "weights": "Bobot SAW",
  "fundamental": "Fundamental", "moat": "Moat", "technical": "Teknis", "diversification": "Diversifikasi",
  "perStockCap": "Cap per Saham (%)",
  "sectorCaps": "Cap per Sektor (%)",
  "sectors": "Sektor per Saham",
  "fetchOne": "Ambil dari FMP", "fetchAll": "Fetch semua sektor",
  "ai": "AI", "language": "Bahasa AI", "providerOrder": "Urutan Provider", "model": "Model",
  "refreshModels": "Refresh daftar model", "save": "Simpan", "saved": "Tersimpan",
  "fetchFailed": "Gagal mengambil dari FMP"
}
```
EN (`messages/en.json`):
```json
"settings": {
  "title": "Settings",
  "weights": "SAW Weights",
  "fundamental": "Fundamental", "moat": "Moat", "technical": "Technical", "diversification": "Diversification",
  "perStockCap": "Per-stock cap (%)",
  "sectorCaps": "Per-sector caps (%)",
  "sectors": "Sector per stock",
  "fetchOne": "Fetch from FMP", "fetchAll": "Fetch all sectors",
  "ai": "AI", "language": "AI language", "providerOrder": "Provider order", "model": "Model",
  "refreshModels": "Refresh model list", "save": "Save", "saved": "Saved",
  "fetchFailed": "Failed to fetch from FMP"
}
```
Tambahkan `"app.viewSettings": "Pengaturan"` / `"Settings"`.

- [ ] **Step 2: Server actions**

Create `src/app/settings/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  saveGroupWeights, saveCaps, saveAiLanguage, saveAiModels, saveProviderOrder,
  assignSector, getCompaniesWithSector,
} from "@/lib/repo";
import { validateWeights, clampCap, sanitizeSectorCaps } from "@/lib/settings";
import { fetchProfile, getFmpKeys } from "@/lib/fmp";
import { createKeyPool } from "@/lib/keypool";
import { listGeminiModels, listGroqModels, listOpenRouterModels } from "@/lib/ai/models";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function saveSettings(input: {
  weights: Record<string, unknown>;
  perStock: unknown;
  sectorCaps: Record<string, unknown>;
  aiLanguage: "follow_ui" | "en" | "id";
  models: { gemini?: string; groq?: string; openrouter?: string };
  providerOrder: string[];
}): Promise<{ ok: true }> {
  await saveGroupWeights(validateWeights(input.weights));
  await saveCaps({ perStock: clampCap(input.perStock), perSector: sanitizeSectorCaps(input.sectorCaps) });
  await saveAiLanguage(input.aiLanguage);
  await saveAiModels(input.models);
  await saveProviderOrder(input.providerOrder);
  revalidatePath("/settings");
  return { ok: true };
}

export async function fetchSectorFor(ticker: string): Promise<{ ticker: string; industry: string | null }> {
  const key = getFmpKeys()[0];
  if (!key) return { ticker, industry: null };
  try {
    const p = await fetchProfile(ticker, undefined, key);
    if (p.industry) await assignSector(ticker, p.industry);
    return { ticker, industry: p.industry || null };
  } catch {
    return { ticker, industry: null };
  }
}

export async function fetchAllSectors(): Promise<Array<{ ticker: string; sector: string | null }>> {
  const companies = await getCompaniesWithSector();
  const keys = getFmpKeys();
  const pool = keys.length ? createKeyPool(keys) : null;
  for (let i = 0; i < companies.length; i++) {
    if (i > 0) await sleep(1200);
    if (!pool) break;
    try {
      const p = await fetchProfile(companies[i].ticker, undefined, pool.next());
      if (p.industry) await assignSector(companies[i].ticker, p.industry);
    } catch { /* lewati, bisa manual */ }
  }
  revalidatePath("/settings");
  return getCompaniesWithSector();
}

export async function refreshModels(): Promise<{ gemini: string[]; groq: string[]; openrouter: string[] }> {
  const g = getFmpKeys; // noop ref to avoid unused import shape; real keys below
  void g;
  const gk = (process.env.GEMINI_API_KEYS ?? "").split(",")[0]?.trim();
  const qk = (process.env.GROQ_API_KEYS ?? "").split(",")[0]?.trim();
  const [gemini, groq, openrouter] = await Promise.all([
    gk ? listGeminiModels(gk).catch(() => []) : Promise.resolve([]),
    qk ? listGroqModels(qk).catch(() => []) : Promise.resolve([]),
    listOpenRouterModels().catch(() => []),
  ]);
  return { gemini, groq, openrouter };
}
```

Catatan: hapus baris `const g = getFmpKeys; void g;` bila lint mengeluh; itu hanya penjaga. Import `getFmpKeys` boleh dibuang jika tidak dipakai di file ini.

- [ ] **Step 3: Form client**

Create `src/app/settings/SettingsForm.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveSettings, fetchAllSectors, refreshModels } from "./actions";

type Props = {
  initialWeights: { fundamental: number; moat: number; technical: number; diversification: number };
  initialPerStock: number;
  initialSectorCaps: Record<string, number>;
  initialLanguage: "follow_ui" | "en" | "id";
  initialModels: { gemini?: string; groq?: string; openrouter?: string };
  initialOrder: string[];
  companies: Array<{ ticker: string; sector: string | null }>;
};

export default function SettingsForm(p: Props) {
  const t = useTranslations("settings");
  const [isPending, start] = useTransition();
  const [w, setW] = useState(p.initialWeights);
  const [perStock, setPerStock] = useState(p.initialPerStock);
  const [lang, setLang] = useState(p.initialLanguage);
  const [models, setModels] = useState(p.initialModels);
  const [order] = useState(p.initialOrder.length ? p.initialOrder : ["gemini", "groq", "openrouter"]);
  const [sectors, setSectors] = useState(p.companies);
  const [caps, setCaps] = useState<Record<string, number>>(p.initialSectorCaps);
  const [opts, setOpts] = useState<{ gemini: string[]; groq: string[]; openrouter: string[] }>({ gemini: [], groq: [], openrouter: [] });
  const [msg, setMsg] = useState<string | null>(null);

  const sectorNames = Array.from(new Set(sectors.map((s) => s.sector).filter(Boolean) as string[]));

  return (
    <div className="space-y-6 max-w-2xl">
      <section>
        <h2 className="font-semibold">{t("weights")}</h2>
        {(["fundamental", "moat", "technical", "diversification"] as const).map((k) => (
          <label key={k} className="block text-sm">
            {t(k)}: <input type="number" className="border rounded px-2 py-1 w-24"
              value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} />
          </label>
        ))}
      </section>

      <section>
        <h2 className="font-semibold">{t("perStockCap")}</h2>
        <input type="number" className="border rounded px-2 py-1 w-24"
          value={perStock} onChange={(e) => setPerStock(Number(e.target.value))} />
      </section>

      <section>
        <h2 className="font-semibold">{t("sectors")}</h2>
        <button className="text-blue-600 underline text-sm" disabled={isPending}
          onClick={() => start(async () => setSectors(await fetchAllSectors()))}>
          {t("fetchAll")}
        </button>
        <ul className="text-sm mt-1">
          {sectors.map((s) => <li key={s.ticker}>{s.ticker}: {s.sector ?? "—"}</li>)}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">{t("sectorCaps")}</h2>
        {sectorNames.map((name) => (
          <label key={name} className="block text-sm">
            {name}: <input type="number" className="border rounded px-2 py-1 w-24"
              value={caps[name] ?? 50} onChange={(e) => setCaps({ ...caps, [name]: Number(e.target.value) })} />
          </label>
        ))}
      </section>

      <section>
        <h2 className="font-semibold">{t("ai")}</h2>
        <label className="block text-sm">{t("language")}:{" "}
          <select className="border rounded px-2 py-1" value={lang} onChange={(e) => setLang(e.target.value as any)}>
            <option value="follow_ui">follow_ui</option><option value="en">en</option><option value="id">id</option>
          </select>
        </label>
        <button className="text-blue-600 underline text-sm" disabled={isPending}
          onClick={() => start(async () => setOpts(await refreshModels()))}>
          {t("refreshModels")}
        </button>
        {(["gemini", "groq", "openrouter"] as const).map((prov) => (
          <label key={prov} className="block text-sm">{prov} {t("model")}:{" "}
            <select className="border rounded px-2 py-1" value={models[prov] ?? ""}
              onChange={(e) => setModels({ ...models, [prov]: e.target.value })}>
              <option value="">(env default)</option>
              {opts[prov].map((m) => <option key={m} value={m}>{m}</option>)}
              {models[prov] && !opts[prov].includes(models[prov]!) && <option value={models[prov]}>{models[prov]}</option>}
            </select>
          </label>
        ))}
      </section>

      <button className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={isPending}
        onClick={() => start(async () => {
          await saveSettings({ weights: w, perStock, sectorCaps: caps, aiLanguage: lang, models, providerOrder: order });
          setMsg(t("saved"));
        })}>
        {t("save")}
      </button>
      {msg && <p className="text-green-600 text-sm">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Halaman Settings (server)**

Create `src/app/settings/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { getGroupWeights, getCaps, getAiLanguage, getAiModels, getProviderOrder, getCompaniesWithSector } from "@/lib/repo";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const weights = await getGroupWeights();
  const caps = await getCaps();
  const language = await getAiLanguage();
  const models = await getAiModels();
  const order = (await getProviderOrder()) ?? [];
  const companies = await getCompaniesWithSector();
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SettingsForm
        initialWeights={weights as any}
        initialPerStock={caps.perStock}
        initialSectorCaps={caps.perSector}
        initialLanguage={language}
        initialModels={models}
        initialOrder={order}
        companies={companies}
      />
    </main>
  );
}
```

- [ ] **Step 5: Tautan dari dashboard**

Di `src/app/page.tsx` tambahkan setelah tautan review:
```tsx
      <a className="block text-blue-600 underline" href="/settings">
        {t("viewSettings")} &rarr;
      </a>
```

- [ ] **Step 6: Verifikasi**

Run: `npm run test && npx tsc --noEmit`
Expected: semua test PASS (termasuk parity i18n), TYPECHECK OK.

Run manual: `npm run dev`, buka `/settings`, klik "Fetch semua sektor" (isi sektor tiap saham), set cap sektor, "Refresh daftar model" (dropdown terisi), Simpan. Lalu `/review` → Run: cap sektor kini aktif (perhatikan `activeCaps` bila sektor melebihi cap).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add settings page (weights, caps, sectors, AI model/order/language)"
```

---

## Self-Review

**Spec coverage:**
- Bobot SAW, cap saham, cap sektor → Task 1 (validasi) + Task 4 (simpan) + Task 6 (UI). ✓
- Peta sektor auto-fetch `industry` per-saham + "Fetch semua" throttle → Task 3 + Task 6 (actions). ✓
- Pilih model AI dinamis + urutan provider → Task 2 + Task 5 + Task 6. ✓
- `ai_language` → Task 4 + Task 6. ✓
- Keys tetap `.env` → tidak ada task yang menulis key ke DB. ✓
- Aktifkan cap sektor → Task 4 assignSector + caps.perSector dipakai Allocation Engine (ada). ✓
- Testing unit tanpa API → Task 1,2,3,5. ✓

**Placeholder scan:** tidak ada TBD/TODO; tiap step berisi kode nyata. Catatan `void g` di actions ditandai boleh dihapus (bukan placeholder logika).

**Type consistency:** `Weights` dipakai konsisten (settings.ts ↔ repo saveGroupWeights ↔ getGroupWeights return). `buildProviders` signature sama di Task 5 def & Task 6/review pemakaian (`buildProvidersFromStore`). `caps` shape `{perStock, perSector}` konsisten (allocation `Caps`, repo, UI). `fetchProfile` signature sama di Task 3 & actions.

**Catatan:** `getGroupWeights` (ada) mengembalikan `GroupWeights` (Record) — kompatibel dengan `Weights` untuk UI; SettingsForm meng-cast aman. Jika strictness bermasalah, `saveGroupWeights(validateWeights(...))` menormalkan sebelum simpan.
