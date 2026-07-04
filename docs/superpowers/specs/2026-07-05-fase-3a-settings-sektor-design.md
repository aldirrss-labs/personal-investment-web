# Fase 3a — Settings + Sektor (Design Spec)

- **Tanggal:** 2026-07-05
- **Status:** Disetujui (siap masuk implementation plan)
- **Prasyarat:** Fase 1 & 2 selesai di `main`. Engine SAW/Allocation, AI multi-provider, i18n, FMP `/stable` sudah ada.

## 1. Tujuan

Halaman **Settings** untuk mengonfigurasi SPK dari UI, dan **peta sektor** tiap saham agar
**cap sektor (Kelompok 4) aktif** (saat ini mati karena semua `Company.sectorId` null).

## 2. Keputusan Kunci

| Topik | Keputusan |
|-------|-----------|
| Sumber sektor | **Auto-fetch FMP `industry`** (granular, mis. "Semiconductors") + override manual |
| API keys | **Tetap di `.env`** — tidak diedit/ disimpan via UI/DB |
| Pilih model AI | **Termasuk sekarang**: dropdown per provider, diisi dinamis dari API `/models` |
| Auto-fetch sektor | Sediakan **per-saham** dan **"Fetch semua"** (throttle antar-saham) |
| Penyimpanan config | Tabel `Setting` (JSON) untuk skalar; `Sector`+`Company.sectorId` untuk sektor |

## 3. Cakupan Settings (UI `/settings`)

- **Bobot SAW**: fundamental / moat / technical / diversification (default 35/30/15/20).
- **Cap per saham**: number % (default 25).
- **Cap per sektor**: daftar `namaSektor → cap%` (mis. Semiconductors → 50).
- **Peta sektor**: sektor tiap saham; tombol auto-fetch (`industry`) per-saham + "Fetch semua"; override manual.
- **AI**: model per provider (dropdown dinamis), urutan provider, `ai_language` (follow_ui/en/id).
- API keys **tidak** di UI.

## 4. Model Data (minim perubahan skema)

- **`Setting`** (key/value JSON) — tambah fungsi tulis untuk key yang sudah dibaca repo:
  - `saw_weights`: `{fundamental,moat,technical,diversification}`
  - `caps`: `{perStock:number, perSector:{[namaSektor]:number}}`
  - `ai_language`: `"follow_ui"|"en"|"id"`
  - `ai_models`: `{gemini?:string, groq?:string, openrouter?:string}` (kosong → pakai `.env`)
  - `ai_provider_order`: `string[]` (kosong → pakai `.env` `AI_PROVIDER_ORDER`)
- **`Sector`** (name unik) + **`Company.sectorId`** — diisi saat assign; `getSectors()` (ada) baca `Company.sector.name`.
- Cap sektor: sumber kebenaran = `Setting.caps.perSector` (dipakai Allocation Engine yang ada).

## 5. Komponen

- **`src/lib/settings.ts`** (murni, teruji): validasi & normalisasi input
  - `validateWeights(w)`, `validateCap(n)`, `sanitizeSectorCaps(map)` — cap di-clamp 0–100; bobot semua-0 → fallback default.
- **`src/lib/ai/models.ts`** (fetch, teruji dgn mock): `listGeminiModels(key,fetchImpl?)`,
  `listGroqModels(key,fetchImpl?)`, `listOpenRouterModels(fetchImpl?)` → `string[]`.
  - Gemini: `/v1beta/models` filter `supportedGenerationMethods` memuat `generateContent`.
  - Groq: `/openai/v1/models`, filter chat (buang whisper/tts/guard/embed/image).
  - OpenRouter: `/api/v1/models`.
- **`src/lib/ai/index.ts`**: ganti `providersFromEnv()` → async **`buildProviders()`** yang baca
  `ai_models`/`ai_provider_order` dari `Setting` (fallback `.env`); key tetap dari `.env`.
  (Update pemanggil di `runReview`.)
- **`src/lib/fmp.ts`**: `fetchProfile(ticker, fetchImpl?, apiKey?)` → `{sector, industry}` dari `/stable/profile`.
- **`repo.ts`**: `saveGroupWeights`, `saveCaps`, `saveAiLanguage`, `saveAiModels`, `saveProviderOrder`,
  `assignSector(ticker, name)`, `getCompaniesWithSector()`.
- **UI**: `src/app/settings/page.tsx` + `src/app/settings/actions.ts` (server actions), komponen client
  untuk form. Tautan dari dashboard. i18n keys baru (`messages/{id,en}.json`, parity dijaga).

## 6. Alur

- Assign sektor (auto/manual) → `Company.sectorId`. "Fetch semua" iterasi saham **berurutan + jeda**
  (pola throttle FMP dari Fase 2b), pakai FMP key pool.
- Simpan cap sektor → `Setting.caps.perSector`. Saat review berikutnya, Allocation Engine menegakkan cap.
- Pilih model/urutan → `Setting`. `buildProviders()` memakainya di review berikutnya.

## 7. Error Handling

- Auto-fetch profil FMP gagal untuk suatu saham → tandai gagal, lanjut yang lain; bisa diisi manual.
- Refresh daftar model gagal (provider/ key) → tampilkan pesan, dropdown pakai daftar terakhir/ nilai `.env`.
- Validasi: cap di-clamp 0–100; bobot semua-0 → default; input non-numerik ditolak.

## 8. Testing (unit, tanpa API asli)

- `settings.ts`: clamp cap, fallback bobot, sanitasi sector caps.
- `models.ts`: parse+filter tiap provider (mock fetch) — termasuk buang model non-chat Groq.
- `fmp.fetchProfile`: mapping `{sector,industry}` (mock fetch).
- `buildProviders()`: Setting menang atas `.env`; fallback ke `.env` saat Setting kosong (mock/env).
- Penegakan cap sektor setelah assign: skenario Allocation Engine (sudah ada) dgn sektor terisi.

## 9. Di Luar Scope (sub-proyek lain)

- Polish visual menyeluruh (shadcn/ui) — sub-proyek Polish.
- Perbandingan antar-quartal, deploy VPS.
- Enkripsi/rotasi key via UI (keys tetap `.env`).
