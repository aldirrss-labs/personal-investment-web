# Roadmap — Personal Investment Web (SPK Portfolio)

Pengembangan bertahap. Tiap fase menghasilkan sesuatu yang **jalan & berguna** sebelum lanjut.
Referensi desain: [docs/superpowers/specs/2026-07-02-personal-investment-spk-design.md](docs/superpowers/specs/2026-07-02-personal-investment-spk-design.md).

---

## Fase 0 — Fondasi
**Tujuan:** kerangka proyek siap dikembangkan.

- Setup Next.js 14 (App Router, TypeScript) + Tailwind + shadcn/ui.
- Setup PostgreSQL + Prisma; skema awal `Holding`, `Transaction`, `Fundamental`, `Sector`.
- Konfigurasi env (API keys), Docker Compose (app + db) untuk dev.
- Struktur folder modular (satu modul = satu tanggung jawab).

**Selesai bila:** app boot, DB migrasi jalan, halaman kosong tampil.

---

## Fase 1 — SPK Inti (tanpa AI) ⭐ prioritas
**Tujuan:** siklus keputusan alokasi sudah bisa jalan end-to-end dengan input manual.

- **Holdings & Transactions** — input DCA manual, hitung avg cost, alokasi aktual, PnL.
- **Data Fetcher** — ambil fundamental dari Financial Modeling Prep + cache + override manual.
- **Scoring Engine (SAW)** — normalisasi kriteria, bobot kelompok (35/30/15/20), skor komposit
  + breakdown transparan. Kelompok 2 diisi manual dulu (AI menyusul di Fase 2).
- **Allocation Engine (B+C)** — baseline → tilt → clamp (cap 25%/saham, 50%/sektor) → renormalisasi.
- **Unit test wajib** — Scoring & Allocation Engine (termasuk kasus cap sektor aktif).
- UI minimal: Dashboard + halaman DCA Recommendation.

**Selesai bila:** input DCA → dapat rekomendasi alokasi % bulan ini, dengan skor & alasan cap.

---

## Fase 2 — Layer AI & Riwayat Quartal
**Tujuan:** analisa kualitatif otomatis + kemampuan bandingkan antar-waktu.

- **AI Analyst** — abstraction layer Groq/Gemini/OpenRouter + fallback; output JSON
  (Moat, Decision, Reason, Key risks, Confidence).
- Integrasi AI → mengisi kriteria Kelompok 2 (moat, competitive position), **override manual** tetap ada.
- Schema guard + test parsing JSON + jalur fallback provider.
- **Quarterly Review** — snapshot beku tiap quartal (skor, alokasi, analisa AI).
- **Stockcard** per saham: skor + breakdown + kartu AI + tombol override.

**Selesai bila:** jalankan review quartal → tiap saham punya kartu AI, tersimpan sebagai snapshot.

---

## Fase 3 — Polish, Settings & Deploy
**Tujuan:** produk rapi, dapat dikonfigurasi, live di VPS.

- **Settings** — atur bobot SAW, cap saham/sektor, API keys, pilihan model AI per-task.
- **Perbandingan antar-quartal** — evolusi skor & keputusan (grafik/tabel).
- Error handling matang: cache stale, "AI unavailable", validasi total 100%.
- Polish UI stockcard/dashboard, responsif.
- Deploy ke VPS (Docker), backup DB.

**Selesai bila:** aplikasi live, dikonfigurasi lewat UI, siap dipakai rutin tiap quartal/bulan.

---

## Cross-cutting — Internationalization (i18n)
**Sudah dikerjakan setelah Fase 1** (mumpung UI masih kecil).

- **Bahasa UI**: `next-intl` (cookie-based, tanpa routing per-locale), kamus `messages/id.json` &
  `messages/en.json`, default **Bahasa Indonesia**, `LocaleSwitcher` EN/ID.
- **Bahasa reasoning AI**: setting terpisah `ai_language = follow_ui | en | id` (default `follow_ui`),
  disimpan di tabel `Setting`. Fungsi murni `resolveAiLanguage()` + `aiLanguageInstruction()` di
  `src/lib/language.ts` (dipakai saat membangun prompt AI di Fase 2).
- Test: parity kamus (key en/id identik) + unit test resolver bahasa AI.

---

## Di Luar Scope (untuk sekarang — YAGNI)
- Sync otomatis Binance API (tokenized stocks belum tentu ada di endpoint publik).
- FX USD/IDR sebagai faktor timing alokasi.
- Web search real-time untuk AI.
- Multi-user / auth kompleks.
