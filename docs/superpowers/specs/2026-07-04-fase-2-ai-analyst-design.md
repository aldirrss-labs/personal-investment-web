# Fase 2 — AI Analyst + Quarterly Review + Stockcard (Design Spec)

- **Tanggal:** 2026-07-04
- **Status:** Disetujui (siap masuk implementation plan)
- **Prasyarat:** Fase 1 (SPK inti) selesai; fondasi i18n + `resolveAiLanguage`/`aiLanguageInstruction` sudah ada.
- **Referensi:** `docs/superpowers/specs/2026-07-02-personal-investment-spk-design.md`, `ROADMAP.md`.

## 1. Tujuan

Menambahkan lapisan analisa kualitatif AI (Moat, Decision, Reason) yang **memengaruhi skor**
Kelompok 2, plus kemampuan membekukan hasil tiap quartal sebagai snapshot dan membandingkan
antar-quartal, serta halaman Stockcard per saham.

## 2. Keputusan Kunci (hasil brainstorming)

| Topik | Keputusan |
|-------|-----------|
| Urutan provider | **Gemini → Groq → OpenRouter** (kualitas reasoning diutamakan; review tidak sensitif latency) |
| Multi-key | **Key-pool rotation** (round-robin) per provider + fallback berurutan antar-provider |
| ID model | **Konfigurasi via env, diverifikasi dari dokumentasi resmi saat implementasi** (tidak menebak dari ingatan) |
| Bahasa AI | `aiLanguageInstruction(resolveAiLanguage(getAiLanguage(), uiLocale))` disisipkan ke prompt |
| Bentuk output kriteria | **Hybrid (C)**: label kategoris (display) + angka 0–100 (masuk SAW), dipandu rubrik eksplisit |
| Kriteria diisi AI | 5: `moat`, `competitive`, `management`, `industry`, `risk`; `conviction` = slider manual |
| Override | Semua nilai AI dapat di-override manual (`CriterionScore.manual=true`) |
| Grounding | Hanya fundamental yang di-fetch + posisi portfolio (tanpa web search) |
| Penentuan quartal | Otomatis dari tanggal, dapat di-override (backfill) |
| Re-run quartal | **Overwrite** (satu snapshot per quartal) |
| Isi snapshot | skor + breakdown, alokasi + activeCaps, analisa AI per saham, timestamp |
| Penyimpanan breakdown | **JSON column** (fleksibel, cukup untuk single-user) |
| Conviction default | 50 (netral) bila belum di-set |

## 3. AI Abstraction Layer (`src/lib/ai/`)

- **Interface** `AiProvider { analyze(input: AiInput): Promise<AiAnalysis> }`.
- Implementasi: `gemini.ts`, `groq.ts`, `openrouter.ts` + `index.ts` (orkestrasi fallback + rotasi).
- **Key-pool**: tiap provider baca daftar key dari env (comma-separated), round-robin antar-key.
- **Fallback berurutan**: coba provider sesuai `AI_PROVIDER_ORDER`; provider dianggap gagal bila
  semua key-nya error atau output JSON tak valid; lanjut ke provider berikutnya.
- **Env**:
  - Key: `GEMINI_API_KEYS`, `GROQ_API_KEYS`, `OPENROUTER_API_KEYS` (comma-separated).
  - Model: `GEMINI_MODEL`, `GROQ_MODEL`, `OPENROUTER_MODEL`.
  - Urutan: `AI_PROVIDER_ORDER` (default `gemini,groq,openrouter`).
- **ID model & endpoint diverifikasi dari dokumentasi resmi saat implementasi.**

## 4. Prompt & Output

- **Input ke AI (`AiInput`)**: fundamental ter-fetch (revenueGrowth, netMargin, roe, debtToEquity, pe)
  + ringkasan posisi portfolio + rubrik penilaian 0–100 per kriteria + instruksi bahasa.
- **Output (`AiAnalysis`) JSON tervalidasi (schema guard):**
  - Untuk tiap kriteria `moat|competitive|management|industry|risk`: `{ label: string; score: number(0..100) }`.
  - `decision`: `"Accumulate" | "Hold" | "Reduce" | "Avoid"`.
  - `reason`: string (2–4 kalimat, merujuk angka).
  - `key_risks`: string[].
  - `confidence`: number (0..1).
- Parsing aman: JSON invalid / field hilang / di luar rentang → provider dianggap gagal.

## 5. Integrasi ke Skor

- Skor 0–100 tiap kriteria AI ditulis ke `CriterionScore` (group `moat`, `manual=false`).
- `conviction` = slider manual (group `moat`, `manual=true`), default 50.
- Override manual menimpa nilai AI (`manual=true`); Scoring/Allocation Engine (Fase 1) dipakai
  tanpa perubahan logika.

## 6. Quarterly Review (pipeline + snapshot)

- Tombol **"Jalankan Review Quartal"** memicu: fetch fundamental → AI per saham → tulis
  `CriterionScore` → skor SAW → alokasi (Allocation Engine) → **bekukan snapshot**.
- Quartal otomatis dari tanggal (`YYYYQn`), dapat di-override.
- **Overwrite** snapshot untuk quartal yang sama.
- **Skema DB baru (Prisma):**
  - `QuarterlySnapshot(id, quarter @unique, activeCaps Json, createdAt)`
  - `SnapshotEntry(id, snapshotId, ticker, compositeScore Float, allocationPct Float, breakdown Json)`
  - `AiAnalysis(id, ticker, quarter, criteria Json, decision String, reason String, keyRisks Json, confidence Float, provider String, model String, language String, createdAt, @@unique([ticker, quarter]))`

## 7. UI

- **Stockcard** (`/stock/[ticker]`): skor komposit + breakdown per kriteria; kartu AI (label moat,
  decision, reason, key risks, confidence); kontrol override manual + slider conviction.
- **Quarterly Review** (`/review`): tombol jalankan + progress; daftar hasil; pemilih quartal untuk
  melihat snapshot lama & membandingkan antar-quartal (mis. Q2 vs Q3).
- Semua teks baru lewat i18n (`messages/id.json`, `messages/en.json`, parity test dijaga).

## 8. Error Handling

- Provider gagal → rotasi key → provider berikutnya. **Semua gagal** → pakai skor Kelompok 2
  manual/terakhir, tandai **"AI unavailable"** di UI; review tetap selesai (alokasi tetap keluar).
- JSON AI tak valid → provider dianggap gagal, lanjut fallback.
- Fetch fundamental gagal → cache terakhir + tanda "stale" (pola Fase 1).
- Snapshot: validasi total alokasi = 100 (kecuali cap membuat infeasible, seperti Fase 1).

## 9. Testing (unit, tanpa API asli)

- Rubrik mapping label ↔ angka (guard rentang 0–100).
- Parse/guard JSON AI: valid, rusak, field hilang, angka di luar rentang.
- **Fallback provider** (mock): provider-1 gagal → provider-2 dipakai; semua gagal → jalur "AI unavailable".
- Rotasi key: round-robin memakai key berbeda pada panggilan berurutan.
- Perakitan snapshot: entri per saham, breakdown tersimpan, overwrite quartal sama.
- `resolveAiLanguage` (sudah ada).
- Provider asli diuji manual sekali via review nyata setelah key dipasang.

## 10. Di Luar Scope (Fase 2)

- Versioning multi-run dalam satu quartal (hanya overwrite).
- Web search real-time untuk AI.
- Polish visual menyeluruh (Fase 3), FX USD/IDR, sync Binance.
