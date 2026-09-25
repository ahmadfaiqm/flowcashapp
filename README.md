# Buku Akuntansi (React + TypeScript)

Aplikasi akuntansi double-entry dengan login, profil, jurnal umum, buku besar,
neraca saldo, laporan laba rugi, dan neraca.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan (biasanya http://localhost:5173).

## Build produksi

```bash
npm run build
npm run preview
```

## Struktur proyek

- `src/types.ts` — definisi tipe data (akun, jurnal, sesi pengguna, dll.)
- `src/utils/accounting.ts` — logika saldo akun, neraca saldo, laba rugi, neraca
- `src/utils/auth.ts` — hashing kata sandi (SHA-256) dan penyimpanan pengguna di `localStorage`
- `src/components/` — Sidebar, LoginScreen, ToastHost, MonthlyChart
- `src/pages/` — Dashboard, ChartOfAccounts, GeneralJournal, Ledger, TrialBalance,
  IncomeStatement, BalanceSheet, Profile
- `src/App.tsx` — komponen root yang mengelola state dan navigasi

## Catatan keamanan

Login pada aplikasi ini memisahkan profil pembukuan antar pengguna di
penyimpanan lokal browser (`localStorage`). Ini **bukan** sistem autentikasi
tingkat produksi — tidak ada server, enkripsi transport, pembatasan percobaan
login, atau pemulihan kata sandi. Untuk penggunaan nyata dengan banyak
pengguna, sambungkan aplikasi ini ke backend dan basis data yang tepat.
