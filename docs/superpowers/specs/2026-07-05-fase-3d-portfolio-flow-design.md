# Fase 3d — Alur Portfolio & Navigasi (Design Spec)

- **Tanggal:** 2026-07-05
- **Status:** Disetujui (siap masuk implementation plan)
- **Prasyarat:** Fase 1/2/3a/3b/3c selesai di `main`. App shell + shadcn/ui + Recharts sudah ada.

## 1. Latar Belakang & Tujuan

Setelah dipakai langsung, alur aplikasi terasa membingungkan: **tidak ada UI untuk input
transaksi DCA** (hanya bisa lewat `curl` manual), dan pemisahan halaman Recommendation/Review/
Compare tidak jelas tujuannya bagi pengguna. Tujuan Fase 3d: menutup gap ini — form input DCA
yang menyambungkan rekomendasi SPK ke pencatatan transaksi nyata, dan navigasi yang menjelaskan
diri sendiri.

## 2. Keputusan Kunci

| Topik | Keputusan |
|-------|-----------|
| Restrukturisasi nav | Ya — sidebar: Dashboard, **Portfolio (baru)**, **Alokasi & Keputusan** (grup collapsible menaungi 3 route lama), Settings |
| Route lama | **Tidak dipindah** — `/recommendation`, `/review`, `/compare` tetap; tambah `DecisionTabs` di atas tiap halaman |
| Tabel posisi | Dipindah dari Dashboard → Portfolio (Dashboard fokus stat cards + donut) |
| Form input DCA | **Budget-driven**: isi Total Budget (USD) → auto-split sesuai alokasi rekomendasi → auto-convert ke qty pakai harga cache → preview editable → konfirmasi simpan |
| Kurs USD/IDR | **Tidak diperlukan** — budget diinput langsung dalam USD |
| Waktu transaksi | **Tanggal + jam, eksplisit WIB (UTC+7, tanpa DST)** — bukan hanya tanggal; disimpan & ditampilkan konsisten WIB apa pun timezone server |
| Edit transaksi | Tidak ada edit in-place — cukup **hapus** (redo dengan input baru bila salah) |
| Berita/news | Tetap di luar scope (sudah diputuskan sejak Fase 2) |

## 3. Navigasi

- **Dashboard** — tetap: stat cards + donut alokasi (tabel posisi **dihapus** dari sini).
- **Portfolio** *(baru)* — tabel holdings (dipindah dari Dashboard) + tabel riwayat transaksi +
  form Log DCA.
- **Alokasi & Keputusan** *(grup sidebar baru, collapsible)* — berisi 3 sub-link ke route yang
  sudah ada: **Rekomendasi Live** (`/recommendation`), **Jalankan Review** (`/review`),
  **Riwayat** (`/compare`). Tidak ada pemindahan file/route — risiko rendah.
- **`DecisionTabs`** — komponen client kecil (pakai `usePathname`) dipasang di atas ketiga
  halaman itu, menjelaskan beda tiap tab + link ke 2 lainnya.
- **Settings** — tetap.

## 4. Halaman Portfolio

### 4.1 Tabel Holdings
Ticker, qty, avg cost, harga (dari `PriceCache`), nilai pasar, PnL — persis konten yang saat
ini ada di Dashboard, dipindah ke sini.

### 4.2 Tabel Riwayat Transaksi
Semua baris `Transaction` (ticker, qty, harga, **tanggal+jam WIB**), urut terbaru dulu. Tiap
baris punya tombol **Hapus** (dengan konfirmasi) untuk memperbaiki kesalahan input.

### 4.3 Form "Log DCA" (budget-driven)
1. Input: **Total Budget (USD)** + **Tanggal & Jam Pembelian (WIB)** (`datetime-local`,
   default = waktu sekarang, dapat diedit mundur untuk backdating).
2. Sistem ambil alokasi % terbaru (pakai engine yang sama dengan `/api/recommendation`) dan
   harga ter-cache (`getCachedPrices`).
3. Tampilkan **tabel preview** per ticker: alokasi %, USD sugesti (`budget × alokasi%`), qty
   sugesti (`usdSugesti / harga`) — kolom **qty & harga per baris dapat diedit manual**
   (realita eksekusi di Binance jarang pas ke sen).
4. Tombol **Konfirmasi & Simpan** → tiap baris dengan qty > 0 disimpan sebagai satu
   `Transaction` (ticker, qty, harga, tanggal WIB→UTC).

## 5. Komponen Teknis

- **`src/lib/dca.ts`** (murni, teruji):
  - `type DcaSuggestion = { ticker: string; allocationPct: number; suggestedUsd: number; suggestedQty: number; price: number }`
  - `suggestDcaAmounts(budgetUsd: number, allocation: Record<string, number>, prices: Record<string, number>): DcaSuggestion[]`
    — ticker tanpa harga (price 0/hilang) → `suggestedQty = 0` (bukan `Infinity`/`NaN`).
- **`src/lib/wib.ts`** (murni, teruji):
  - `parseWibDatetimeLocal(value: string): Date` — terima string `datetime-local`
    (`"YYYY-MM-DDTHH:mm"`), tempel eksplisit `+07:00`, hasilkan `Date` (UTC-internal) yang benar
    apa pun timezone proses Node yang menjalankannya.
  - `formatWib(date: Date): string` — format kembali ke tampilan WIB (`Intl.DateTimeFormat`
    dengan `timeZone: "Asia/Jakarta"`) untuk tabel riwayat.
- **Repo** (`src/lib/repo.ts`):
  - `getAllTransactions(): Promise<Array<{ id: string; ticker: string; qty: number; price: number; date: Date }>>`
  - `deleteTransaction(id: string): Promise<void>`
  - `addTransactions(rows: Array<{ ticker: string; qty: number; price: number; date: Date }>): Promise<void>`
    (batch, dipakai form Log DCA; upsert `Company` per ticker seperti `addTransaction` lama).
- **`src/components/shell/Sidebar.tsx`** — ubah grup jadi collapsible (state buka/tutup),
  tambah entri Portfolio + grup "Alokasi & Keputusan".
- **`src/components/DecisionTabs.tsx`** — strip tab di atas `/recommendation`, `/review`,
  `/compare`.

## 6. Error Handling

- Harga tidak tersedia untuk suatu ticker saat suggest → `suggestedQty = 0`, tampilkan baris
  tetap ada dengan tanda "harga tidak tersedia" agar user bisa isi manual.
- Hapus transaksi → konfirmasi dulu (dialog), tidak ada undo (YAGNI — riwayat git DB backup
  cukup untuk kasus langka).
- Budget ≤ 0 atau non-angka → validasi, tolak submit dengan pesan jelas.

## 7. Testing

- `suggestDcaAmounts`: split proporsional benar, ticker tanpa harga → qty 0, budget 0 → semua
  suggested 0.
- `parseWibDatetimeLocal` / `formatWib`: round-trip benar (nilai yang diinput sebagai WIB
  tersimpan & tertampil kembali sebagai WIB yang sama, terlepas dari timezone proses test).
- Repo: `addTransactions` batch, `deleteTransaction`, `getAllTransactions` (manual/dev
  verification, pola sama seperti repo lain di proyek ini).

## 8. Di Luar Scope

- Kurs USD/IDR (budget USD langsung, sudah diputuskan).
- Berita/news feed AI (di luar scope sejak Fase 2).
- Edit transaksi in-place (cukup hapus + tambah ulang).
- Route lama dipindah/direname (cukup ditambah `DecisionTabs` + sidebar collapsible).
