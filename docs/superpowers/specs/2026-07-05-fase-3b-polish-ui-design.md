# Fase 3b — Polish UI + Live Dashboard (Design Spec)

- **Tanggal:** 2026-07-05
- **Status:** Disetujui (siap masuk implementation plan)
- **Prasyarat:** Fase 1/2/3a selesai di `main`. 5 halaman fungsional (Dashboard, Recommendation, Review, Stockcard, Settings), Tailwind polos.

## 1. Tujuan

Menjadikan aplikasi terasa seperti dashboard tracking portfolio yang rapi & profesional: app shell dengan sidebar (siap ekspansi ke crypto), komponen shadcn/ui, dark mode, harga live, dan visual (donut alokasi).

## 2. Keputusan Kunci

| Topik | Keputusan |
|-------|-----------|
| Komponen | **shadcn/ui + Tailwind** (Radix) |
| Navigasi | **Sidebar kiri** bergrup, extensible (Saham / Pengaturan → nanti Crypto/Portfolio) |
| Tema | **light/dark/system** via `next-themes`, toggle di topbar |
| Chart | **Recharts** — donut alokasi (by market value) |
| Harga | **Live via FMP `/stable/quote`** + cache `PriceCache` + fallback stale |

## 3. Dependensi Baru

- `shadcn/ui` (init + komponen: card, table, badge, button, select, input, label, separator).
- `next-themes`.
- `recharts`.

## 4. App Shell

- **Sidebar** (`src/components/shell/Sidebar.tsx`): grup nav literal `{ label, items: [{href,label}] }`.
  Grup awal: **Saham** (Dashboard `/`, Rekomendasi `/recommendation`, Review `/review`),
  **Pengaturan** (Settings `/settings`). Struktur array → mudah tambah grup "Crypto" nanti.
- **Topbar** (`src/components/shell/Topbar.tsx`): judul + `LocaleSwitcher` (dipindah ke sini) + `ThemeToggle`.
- **Root layout** (`src/app/layout.tsx`): `ThemeProvider` (next-themes, `attribute="class"`) membungkus shell.
  Responsif: sidebar collapse jadi drawer/hamburger di layar kecil.

## 5. Harga Live & Ringkasan Portfolio

- **`src/lib/fmp.ts`**: `fetchQuotes(tickers: string[], fetchImpl?, apiKey?): Promise<Record<string, number>>`
  via `/stable/quote?symbol=TICKER` (per ticker; batch bila didukung), map `price`.
- **`src/lib/portfolio.ts`** (murni, teruji): `portfolioSummary(positions, prices)` →
  `{ totalValue, totalCost, pnlAbs, pnlPct, rows: Array<{ ticker, qty, avgCost, price, value, pnlAbs, pnlPct }> }`.
- **Cache**: tabel `PriceCache(ticker @id, price Float, updatedAt DateTime)`; repo `savePrices`, `getCachedPrices`.
  Alur: coba `fetchQuotes` → simpan cache; gagal → pakai cache (+ tanda "stale"); tak ada cache → sembunyikan nilai.

## 6. Skema DB

```prisma
model PriceCache {
  ticker    String   @id
  price     Float
  updatedAt DateTime @updatedAt
}
```

## 7. Halaman (refactor ke shadcn)

- **Dashboard `/`**: stat cards (Total Nilai, PnL abs & %, jumlah posisi), **donut alokasi** by market value,
  **tabel posisi** (ticker, qty, avg cost, harga, nilai, PnL badge hijau/merah). Tombol "Refresh harga".
- **Recommendation `/recommendation`**: Card + Table + Badge; donut alokasi rekomendasi.
- **Review `/review`**: Card + Table + Badge; tombol Run & pemilih quartal pakai komponen shadcn.
- **Stockcard `/stock/[ticker]`**: Card AI dgn Badge Moat/Decision, bar confidence, list kriteria.
- **Settings `/settings`**: form ditata ulang (Card sections, Select, Input, Label).

## 8. Error Handling

- Harga FMP gagal/limit → cache terakhir + label "stale"; tanpa cache → nilai/PnL disembunyikan (bukan crash).
- Chart tanpa data → empty state.
- Semua teks lewat i18n (parity `messages/{id,en}.json` dijaga).

## 9. Testing

- Unit: `portfolioSummary` (totalValue, pnlAbs/Pct, rows), transform data donut (ticker→value),
  `fetchQuotes` (mock fetch, map price), fallback cache (repo, ringan).
- Verifikasi manual: dashboard tampil nilai/PnL live, dark mode kontras, sidebar nav, responsif.

## 10. Di Luar Scope

- Tren PnL antar-quartal (sub-proyek perbandingan), modul crypto, deploy VPS.
- Branding/logo kustom (pakai default netral; bisa diganti nanti).
