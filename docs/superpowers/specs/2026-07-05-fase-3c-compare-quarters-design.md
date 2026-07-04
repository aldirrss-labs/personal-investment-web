# Fase 3c — Perbandingan Antar-Quartal (Design Spec)

- **Tanggal:** 2026-07-05
- **Status:** Disetujui (siap masuk implementation plan)
- **Prasyarat:** Fase 1/2/3a/3b selesai di `main`. App shell + shadcn/ui + Recharts sudah ada (Fase 3b).

## 1. Tujuan

Halaman `/compare` untuk melihat evolusi skor komposit, alokasi, keputusan AI, dan moat rating
tiap saham lintas quartal — memakai data `QuarterlySnapshot`/`SnapshotEntry`/`AiAnalysis` yang
sudah ada (tanpa skema baru).

## 2. Keputusan Kunci

| Topik | Keputusan |
|-------|-----------|
| Bentuk tampilan | **Tabel** (dari 2 quartal) **+ line chart** (dari 3 quartal) |
| Metrik | Skor komposit + alokasi % + decision AI + moat rating per quartal |
| Navigasi | Halaman baru `/compare`, masuk sidebar grup "Saham" |
| Skema DB | Tidak ada tabel baru — pakai `QuarterlySnapshot`/`SnapshotEntry`/`AiAnalysis` |
| Chart | Recharts `LineChart`, top 7 ticker (by alokasi quartal terbaru), palet kategorikal tervalidasi (skill dataviz, sama dgn Fase 3b) |
| < 2 quartal | Pesan "perlu minimal 2 quartal" |

## 3. Sumber Data & Fungsi Murni

- **`src/lib/compare.ts`** (murni, teruji):
  - `type ComparisonCell = { quarter: string; compositeScore: number; allocationPct: number; decision?: string; moatLabel?: string }`
  - `buildComparisonRows(snapshots: Array<{ quarter: string; entries: Array<{ ticker: string; compositeScore: number; allocationPct: number }> }>, analyses: Array<{ ticker: string; quarter: string; decision: string; criteria: unknown }>): Record<string, ComparisonCell[]>`
    — kunci = ticker, value = array cell terurut quartal menaik. Ticker yang tidak ada di suatu
    quartal → tidak menghasilkan cell untuk quartal itu (UI render "—").
  - `topTickersByLatestAllocation(rows: Record<string, ComparisonCell[]>, n: number): string[]`
    — urutkan ticker by `allocationPct` pada cell quartal terakhir, ambil top-n.
  - `chartSeries(rows: Record<string, ComparisonCell[]>, tickers: string[]): Array<Record<string, number | string>>`
    — bentuk `{ quarter, [ticker]: compositeScore, ... }[]` untuk Recharts `LineChart`, quartal urut menaik.

## 4. Repo

- `getAllSnapshotsWithEntries(): Promise<Array<{ quarter: string; entries: {...}[] }>>` — semua
  snapshot + entries, urut quartal menaik.
- `getAllAiAnalyses(): Promise<Array<{ ticker: string; quarter: string; decision: string; criteria: unknown }>>`
  — semua baris `AiAnalysis`.

## 5. Halaman `/compare`

- Server component: ambil data via repo, olah lewat `buildComparisonRows`.
- `< 2` quartal unik → pesan info.
- `>= 2` → **Card + Table**: baris ticker, kolom quartal (skor/alokasi/decision/moat per sel).
- `>= 3` → tambahan **Card + LineChart** (top 7 ticker by alokasi terbaru), warna dari palet
  kategorikal Fase 3b (`AllocationDonut`), light/dark sesuai tema aktif.
- i18n: `messages/{id,en}.json` (parity dijaga), tautan sidebar (`nav.compare`).

## 6. Error Handling

- Ticker tanpa cell di suatu quartal → tampil "—", bukan error.
- Tidak ada snapshot sama sekali → pesan info (sama seperti Review saat belum ada snapshot).
- Chart kosong (0 data setelah filter) → tidak dirender (pola sama dengan `AllocationDonut`).

## 7. Testing

- `buildComparisonRows`: gabung snapshot+analysis dgn benar, ticker hilang di satu quartal
  menghasilkan array cell lebih pendek (bukan cell kosong/error), urutan quartal menaik.
- `topTickersByLatestAllocation`: urutan benar, potong ke n.
- `chartSeries`: bentuk objek per quartal benar untuk Recharts.

## 8. Verifikasi

Karena baru ada 1 quartal asli (`2026Q3`), buat 1 quartal uji via `runReview(quarterOverride)`
(fitur backfill Fase 2, tanpa UI baru) untuk menguji jalur ≥2 dan ≥3 quartal end-to-end.

## 9. Di Luar Scope

- UI untuk backfill/override quartal (tetap API-only).
- Histori harga/PnL antar-quartal (butuh skema baru, ditunda).
- Pemilihan rentang quartal / filter (tampilkan semua quartal yang ada).
