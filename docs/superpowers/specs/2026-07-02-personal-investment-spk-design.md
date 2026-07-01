# Personal Investment Web — SPK Portfolio (Design Spec)

- **Tanggal:** 2026-07-02
- **Status:** Disetujui (siap masuk tahap implementation plan)
- **Tipe:** Aplikasi web single-user untuk analisa portfolio & sistem pengambilan keputusan (SPK) alokasi DCA.

## 1. Tujuan

Membangun web pribadi (single-user) untuk mencatat, menganalisa, dan mengambil keputusan alokasi
portfolio saham (tokenized US stocks di Binance: NVDA, MSFT, AMZN, GOOG, AMD, MU, SNDK, dst).
Pengguna melakukan DCA bulanan; sistem melakukan review fundamental per-quartal (3 bulan sekali)
dan menghasilkan rekomendasi **"berapa % alokasi DCA bulan ini ke tiap saham"** berdasarkan skor
multi-kriteria (metode SAW) + lapisan constraint diversifikasi, dilengkapi analisa kualitatif AI
(Moat, Decision, Reason) bergaya "stockcard".

## 2. Keputusan Kunci (hasil brainstorming)

| Topik | Keputusan |
|-------|-----------|
| Sumber data fundamental | **Hybrid**: auto-fetch API + override manual per field |
| Holdings & transaksi DCA | **Manual input dulu**, data model disiapkan untuk importer Binance nanti |
| Kriteria penilaian | **4 kelompok**: Fundamental, Moat/Kualitatif, Teknis/Posisi, Diversifikasi/Konsentrasi |
| Metode skor komposit | **SAW (Simple Additive Weighting)** — transparan, bobot dapat diatur |
| Skor → alokasi % | **B+C**: baseline → tilt sesuai skor → clamp (cap saham/sektor) → renormalisasi 100% |
| Cap default | **25% per saham**, **50% per sektor** (dapat diubah di Settings) |
| AI provider | **Groq + Gemini + OpenRouter** via abstraction layer dengan fallback/rotasi |
| Peran AI | Mengisi kriteria kualitatif Kelompok 2 (moat, competitive position) → **memengaruhi skor**, dapat **di-override manual** |
| Grounding AI | **Hanya dari data fundamental yang di-fetch** (tanpa web search real-time) |
| Stack | **Next.js 14 full-stack (TypeScript)**, PostgreSQL + Prisma |
| Host | **VPS pribadi** (Docker); Vercel sebagai alternatif |

## 3. Arsitektur & Stack

- **Next.js 14 (App Router, TypeScript)** — frontend + API routes dalam satu app.
- **PostgreSQL + Prisma ORM** — data historis quartal butuh relational rapi (SQLite untuk dev opsional).
- **UI:** Tailwind CSS + shadcn/ui, gaya "stockcard" (kartu per saham, dashboard interaktif).
- **Deploy:** VPS (Docker Compose: Next app + Postgres).

## 4. Modul Inti

Tiap modul punya satu tanggung jawab, antarmuka jelas, dapat diuji terpisah.

1. **Holdings & Transactions**
   - Catat DCA manual: ticker, qty, harga, tanggal.
   - Hitung avg cost, alokasi aktual (%), PnL per posisi & total.
   - Data model netral broker; disiapkan untuk importer Binance di masa depan.

2. **Data Fetcher**
   - Ambil fundamental per ticker dari API (**default: Financial Modeling Prep**, alternatif Finnhub).
   - Cache per quartal; setiap field dapat di-override manual (hybrid).
   - Peta ticker→sektor diambil dari API (untuk cap sektor).

3. **Scoring Engine (SAW)**
   - Normalisasi tiap kriteria ke 0–1 (arah benefit/cost diperhatikan).
   - `skor_komposit = Σ (bobot_kriteria × nilai_ternormalisasi)`.
   - 4 kelompok kriteria (lihat §6). Simpan **breakdown per kriteria** untuk transparansi.
   - **Bobot kelompok default:** Fundamental 35%, Moat/Kualitatif 30%, Teknis/Posisi 15%, Diversifikasi 20%.

4. **AI Analyst**
   - Abstraction layer multi-provider (Groq / Gemini / OpenRouter) dengan fallback berurutan.
   - Input: fundamental yang di-fetch + posisi portfolio + skor.
   - Output JSON terstruktur: `moat_rating` (Wide/Narrow/None) + penjelasan, `decision`
     (Accumulate/Hold/Reduce/Avoid), `reason` (2–4 kalimat merujuk angka), `key_risks` (list),
     `confidence` (0–1).
   - `moat_rating` & competitive position mengisi kriteria Kelompok 2 → memengaruhi skor.
   - Semua nilai AI dapat **di-override manual** oleh pengguna.

5. **Allocation Engine (B+C)**
   - Baseline alokasi merata → tilt naik/turun sesuai skor relatif (parameter agresivitas).
   - Clamp: cap maksimum per saham (default 25%) & per sektor (default 50%).
   - Renormalisasi agar total = 100%. Catat cap mana yang aktif untuk ditampilkan sebagai alasan.

6. **Quarterly Review**
   - Snapshot beku tiap quartal: skor + breakdown, alokasi rekomendasi, analisa AI.
   - Memungkinkan perbandingan antar-quartal (evolusi skor & keputusan).

## 5. Alur Data (satu siklus quartal)

```
Input DCA (manual) ─┐
                    ├─> Data Fetcher ──> Fundamental (cache/override)
                    │        │
                    │        ├─> AI Analyst ──> Moat/Decision/Reason + isi Kelompok 2
                    │        │
                    │        └─> Scoring Engine (SAW) ──> skor komposit per saham
                    │                     │
                    └─> Holdings/PnL ─────┤
                                          v
                              Allocation Engine (B+C)
                                          v
                    Rekomendasi "% DCA bulan ini" + kartu analisa
                                          v
                              Simpan sebagai Quarterly Snapshot
```

## 6. Kriteria Penilaian (4 Kelompok)

**Kelompok 1 — Fundamental / Kuantitatif** (auto-fetch)
- Revenue growth (YoY), profit/net margin, ROE/ROIC, debt-to-equity, free cash flow,
  valuasi (P/E, P/S, PEG), forward guidance / earnings revision.

**Kelompok 2 — Moat / Kualitatif** (AI + override manual)
- Economic moat, kualitas manajemen, posisi kompetitif/market share, prospek industri,
  risiko (regulasi, konsentrasi customer), conviction pribadi (slider manual).

**Kelompok 3 — Teknis / Posisi Portfolio** (data harga + holdings)
- Momentum/trend harga, status under/over-alokasi vs target, PnL posisi saat ini.

**Kelompok 4 — Diversifikasi / Konsentrasi** (level-portfolio, sebagai constraint)
- Konsentrasi per sektor, korelasi antar-holding, batas maksimum bobot per saham.
- Berperan sebagai **lapisan constraint** di Allocation Engine (bukan sekadar skor per-saham),
  mencegah alokasi ekstrem ke satu tema (mis. semiconductor).

## 7. Halaman UI

- **Dashboard** — ringkasan portfolio, alokasi aktual vs rekomendasi, PnL total.
- **Stockcard (per saham)** — skor + breakdown kriteria, kartu AI (Moat/Decision/Reason/Risks/
  Confidence), tombol override manual.
- **DCA Recommendation** — tabel alokasi % bulan ini + penjelasan cap sektor yang aktif.
- **Quarterly Review** — jalankan review, lihat & bandingkan snapshot antar-quartal.
- **Settings** — bobot kriteria SAW, cap saham/sektor, API keys, pilihan model AI per-task.

## 8. Error Handling

- **Data Fetcher:** API gagal → pakai cache terakhir + tandai "stale", tidak crash.
- **AI Analyst:** provider gagal → fallback provider berikutnya; semua gagal → kriteria Kelompok 2
  pakai nilai manual terakhir / netral, UI tandai "AI unavailable".
- **Allocation Engine:** selalu validasi total = 100% setelah renormalisasi; tangani kasus semua
  skor sama / hanya satu saham.

## 9. Testing

- **Unit test wajib** untuk Scoring Engine (SAW) & Allocation Engine (B+C) — ini logika uang.
  - Kasus: normalisasi benefit vs cost, bobot berubah, semua skor sama, cap saham aktif,
    cap sektor aktif, renormalisasi ke 100%.
- Test parsing/validasi output JSON AI (schema guard) + jalur fallback provider.
- Test perhitungan avg cost & PnL di modul Holdings.

## 10. Di Luar Scope (YAGNI, untuk sekarang)

- Sync otomatis Binance API (tokenized stocks belum tentu tersedia di endpoint publik).
- FX USD/IDR sebagai faktor timing alokasi.
- Web search real-time untuk AI.
- Multi-user / auth kompleks (single-user).

## 11. Keputusan Default yang Dapat Diubah di Settings

1. API fundamental: **Financial Modeling Prep** (alternatif Finnhub).
2. Bobot kelompok SAW: **35 / 30 / 15 / 20**.
3. Peta sektor: di-fetch dari API.
4. Cap: **25% per saham**, **50% per sektor**.
