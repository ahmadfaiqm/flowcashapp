# SAK Full Cycle — Modal Awal/Akhir, Jurnal Penyesuaian, Neraca Lajur 10 Kolom & Perubahan Modal

**Tanggal:** 2026-09-22
**Status:** Approved (user pilih Pendekatan 2 — SAK Engine)
**Repo backend:** `C:/Users/User/projectBLN1` (Express 4 + Prisma 5 + PostgreSQL)
**Repo frontend:** `C:/Users/User/aplikasi-akuntansi` (Vite 5 + React 18 + TS 5 + TanStack Query 5 + axios)
**Desain induk sebelumnya:** `2026-09-16-full-api-consumption-design.md` (14 modul terkoneksi, sudah live)

---

## 1. Ringkasan

Menyempurnakan pembukuan simpel menjadi **Siklus Akuntansi Lengkap SAK ETAP** audit-ready:

**Input:** Modal awal (seed jurnal) → Transaksi harian (Jurnal Umum) → Stock/Sales/Purchase (auto-jurnal) → Penyusutan

**Proses:** Jurnal Penyesuaian a–e (isAdjustment) → AccountingPeriod (open/closed, manual) → Closing tahunan

**Output 6 laporan konsisten single source `JournalLine`:**
1. Neraca Saldo (NS)
2. Jurnal Penyesuaian (daftar)
3. Neraca Saldo Disesuaikan (NSD)
4. Laporan Laba Rugi (period filtered)
5. Laporan Posisi Keuangan / Neraca (period filtered)
6. **Neraca Lajur 10 Kolom** (NS | Penyesuaian | NSD | L/R | Neraca)
7. **Laporan Perubahan Modal** (Modal Awal + Setoran − Prive + Laba = Modal Akhir)

Pilihan user **A (filter period, closing manual tombol)** + **all a–e + 10 kolom SAK + perubahan modal terpisah**.

---

## 2. Konteks & Temuan Audit

### 2.1 Gap yang diperbaiki dari audit 2026-09-22
- `1520 Akumulasi Penyusutan` salah `Asset normal debit` → harus contra-asset kredit (`utils/accounting.ts:13`, `businesses.repository.js:15`)
- Seed FE 19 akun vs BE 10 akun mismatch, kode hardcode `1100/4010/1500/2010` (`sales.service.js:95`, `purchase.service.js:90`) → 28 akun SAK baku
- `DELETE journal` permanen (`journals.repository.js:76`) → ganti void+reversal
- L/R `purchaseTotal` dianggap beban (`reports.service.js:38`) → harus HPP saat terjual
- Neraca BE `assets = cash+stock+AR+bookValue` (`reports.repository.js:224`) tautologi `equity=assets-liabilities` (`repository.js:226`) → ganti agregasi murni `JournalLine`
- Tidak ada modal awal jurnal, tidak ada penyesuaian c/d/e, tidak ada worksheet, tidak ada closing

### 2.2 Existing yang dipertahankan
- Double-entry 2 lapis FE `App.tsx:100` + BE `journals.validation.js:19` + transaksi `prisma.$transaction` (`journals.service.js:41`)
- 21 routers `app.js:32-52`, middleware `auth`+`requireBusiness`, envelope `ApiResponse`
- 10 akun seed masih dipakai untuk backfill, migrasi tidak hapus data

---

## 3. Keputusan Desain — Pendekatan 2 (SAK Engine) Terpilih

**Pendekatan 1 Incremental** (tambah kolom saja) ditolak: modal tidak terlacak, worksheet hilang saat refresh.
**Pendekatan 3 Hybrid** (komputasi FE saja) ditolak: penyesuaian tidak persist, dobel sumber.
**Pendekatan 2** dipilih: tabel baru minimal + single source `JournalLine` + closing manual. YAGNI: cukup `status open/closed`, tanpa lock otomatis bulanan.

---

## 4. Arsitektur & Aliran Data

```
FE Pages: GeneralJournal (checkbox Penyesuaian) → useJournals(isAdjustment)
         Worksheet (10 kolom) → useWorksheet(businessId, from, to)
         CapitalChange → useCapitalChange
         Periods → usePeriods (Tutup Periode)
                ↓
api.ts (Bearer + X-Business-Id) → /api/v1/journals?isAdjustment, /reports/worksheet, /reports/capital-change, /periods/close
                ↓
Express: auth → requireBusiness → validate(zod) → controller → service → repository → Prisma
                ↓
PostgreSQL: Journal (+isAdjustment, adjustmentType, periodYear/Month) + JournalLine + ChartOfAccount(isContra) + AccountingPeriod + CapitalMovement
```

Semua laporan `status=posted` only, `journalDate BETWEEN from AND to`. Frontend tidak lagi pakai `computeTotals` dobel.

---

## 5. Data Model & Migrasi

### 5.1 Prisma delta
```prisma
enum AdjustmentType { supplies depreciation prepaidExpense unearnedRevenue accruedExpense accruedRevenue other }

model Journal {
  id Int @id @default(autoincrement())
  businessId Int @map("business_id")
  journalNo String @map("journal_no") @db.VarChar(50)
  journalDate DateTime @map("journal_date") @db.Date
  description String? @db.Text
  status JournalStatus @default(posted)
  isAdjustment Boolean @default(false) @map("is_adjustment")
  adjustmentType AdjustmentType? @map("adjustment_type")
  periodYear Int? @map("period_year")
  periodMonth Int? @map("period_month")
  createdAt DateTime @default(now()) @map("created_at")
  business BusinessProfile @relation(fields:[businessId], references:[id], onDelete:Cascade)
  lines JournalLine[]
  @@unique([businessId, journalNo])
  @@map("journals")
}

model AccountingPeriod {
  id Int @id @default(autoincrement())
  businessId Int @map("business_id")
  year Int
  month Int // 1-12, 0 = tahunan closing
  status String @default("open")
  closedAt DateTime? @map("closed_at")
  business BusinessProfile @relation(fields:[businessId], references:[id], onDelete:Cascade)
  @@unique([businessId, year, month])
  @@map("accounting_periods")
}

model CapitalMovement {
  id Int @id @default(autoincrement())
  businessId Int @map("business_id")
  date DateTime @db.Date
  type String // initial | additional | prive
  amount Decimal @db.Decimal(18,2)
  description String? @db.Text
  journalId Int? @map("journal_id")
  business BusinessProfile @relation(fields:[businessId], references:[id], onDelete:Cascade)
  @@map("capital_movements")
}

model ChartOfAccount {
  // ... existing + 
  normalBalance String? @map("normal_balance")
  isContra Boolean @default(false) @map("is_contra")
  @@map("chart_of_accounts")
}
```

### 5.2 Seed 28 akun SAK (ganti `businesses.repository.js:10`)
`1010 Kas, 1020 Bank, 1100 Piutang, 1110 Perlengkapan, 1120 Sewa Dibayar Dimuka, 1130 Asuransi Dimuka, 1500 Persediaan, 1510 Peralatan, 1520 Akum.Penyusutan (isContra, credit), 2010 Hutang Usaha, 2110 Pendapatan Diterima Dimuka, 2120 Beban YMH Dibayar, 2210 Hutang Pajak, 3110 Modal, 3111 Prive (isContra, debit), 3120 Laba Ditahan, 3130 Ikhtisar L/R, 4010 Penjualan, 4020 Pendapatan Jasa, 5010 HPP, 5110 Beban Gaji, 5120 Beban Sewa, 5130 Beban Listrik, 5140 Beban Perlengkapan, 5150 Beban Penyusutan, 5160 Beban Lain, 5210 Beban Bunga` — semua dengan `normalBalance` explicit.

**Jurnal Modal Awal:** `businesses.service.js:6` saat create business jika `body.initialCapital >0` buat `JU-MODAL-{businessId}` `Kas 1010 (D) → Modal 3110 (K)` + `CapitalMovement type=initial`. Jika 0, user bisa tambah via `POST /capital-movements`.

**Migrasi:** `prisma migrate dev --name sak_full_cycle` — backfill `periodYear/Month = EXTRACT(YEAR/MONTH FROM journalDate)`, set `isContra=true` untuk `code IN ('1520','3111')`, buat `AccountingPeriod` open untuk periode existing.

---

## 6. Backend — Logika & API

### 6.1 Jurnal Penyesuaian
- `POST /api/v1/journals` extend `createManualJournalSchema` (`journals.validation.js:3`) tambah `isAdjustment?: boolean, adjustmentType?: enum`. Jika `isAdjustment` true, validasi `adjustmentType` required.
- `journals.service.js:34` `createManual` set `periodYear/Month`, validasi `businessId` CoA, balance check tetap.
- `DELETE /journals/:id` → soft-void: `update status='void'` + buat jurnal reversal (swap debit/credit) dengan `journalNo = VOID-{orig}`; cek `AccountingPeriod` closed → 403. Hapus `prisma.journal.delete`.
- Helper `adjustments` (service internal, tidak perlu endpoint terpisah; FE pakai template): FE dropdown "Buat Penyesuaian Otomatis" kirim jurnal manual dengan `isAdjustment=true` sesuai tipe:
  - a supplies: `5140 D → 1110 K`
  - b depreciation: reuse `fixed-assets.service.js:144` tambah flag `isAdjustment`
  - c prepaid: `5120 D → 1120 K` (atau `1130`)
  - d unearned: `2110 D → 4010 K`
  - e accrued: `5110 D → 2120 K` & `1100 D → 4010 K`

### 6.2 Periode & Closing
- `POST /api/v1/periods` `GET /periods` `POST /periods/close` — baru `modules/periods/*`
  - `close {year, month}`: jika `month 1-12` cek NS seimbang untuk periode itu, set `status=closed`; jika `month=0` (tahunan) lakukan closing: agregat `Revenue (4010,4020)` & `Expense (5010,51xx)` periode tahun, buat 2 jurnal tutup: `Revenue → 3130` & `3130 → Expense`, lalu `3130 (saldo) → 3120 Laba Ditahan`. Semua dalam `prisma.$transaction`.
- Guard: `journals.service.js` `createManual` & `remove` cek `AccountingPeriod` matching `periodYear/Month` jika `status=closed` → throw 403.

### 6.3 Laporan
- `GET /reports/worksheet?from&to` (`reports.service.js:4` baru): return `{period, rows: [{code,name,accountType,isContra,trial:{d,c,balance}, adjustment:{d,c}, adjusted:{d,c}, income:{d,c}, balanceSheet:{d,c}}], totals: {trialD/C, adjD/C, adjustedD/C, incomeD/C, balanceD/C, netIncome}}`. Hitung: `trial` dari `JournalLine where isAdjustment=false`, `adjustment` dari `isAdjustment=true`, `adjusted = trial ± adjustment` (per `isContra`), pisah `income` (Revenue/Expense) vs `balanceSheet` (Asset/Liab/Equity).
- `GET /reports/adjusted-trial-balance?from&to` → subset `adjusted`.
- `GET /reports/capital-change?from&to` → `{modalAwal, setoran, prive, labaBersih, modalAkhir, movements[]}`. `modalAwal` = saldo `3110+3120` sebelum `from`; `labaBersih` dari worksheet `income`.
- `GET /reports/profit-loss` & `/balance-sheet` refactor: hapus `balanceSheetAggregate` `cash+stock+AR` (`reports.repository.js:191`), ganti agregasi murni `JournalLine` grouped by `accountType`. `dashboard.service.js` juga sync.

### 6.4 Validasi & Keamanan
- Zod schemas baru untuk `periods`, `capital-movements`; `validate` middleware; `requireBusiness` tetap; role sama (owner/akuntan untuk laporan & periods).

---

## 7. Frontend — Flow & Halaman

### 7.1 Navigasi
- `types.ts:39` `PageKey` tambah `worksheet | capitalChange | periods`
- `Sidebar.tsx:4` group baru `Laporan SAK: [{key:worksheet,label:"Neraca Lajur 10 Kolom"}, {key:capitalChange,label:"Perubahan Modal"}, {key:periods,label:"Periode"}]`

### 7.2 Hooks & Lib
- `useJournals.ts` tambah `isAdjustment, adjustmentType` di `create` payload; invalidate `["worksheet", businessId]`
- Baru: `useWorksheet(businessId, from, to)` → `api.get("/reports/worksheet", {params:{from,to}})`, `useCapitalChange`, `usePeriods`, `useCapitalMovements`
- `utils/accounting.ts` perbaiki `CATEGORY_INFO` → handle `isContra` di `computeAccountBalances`, tambah `computeWorksheetPreview` untuk fallback offline (tidak wajib).

### 7.3 Halaman
- `Worksheet.tsx` (baru, 10 kolom): filter `from/to` (month picker), table `Akun | NS D/C | Penyesuaian D/C | NSD D/C | L/R D/C | Neraca D/C`, footer `Laba Bersih = Total L/R selisih` cross-check ke `CapitalChange`, tombol Export CSV.
- `CapitalChange.tsx` (baru): `Modal Awal + Setoran - Prive + Laba = Modal Akhir`, tabel `CapitalMovement`, form `Tambah Prive/Setoran` → `POST /capital-movements` (buat jurnal `Prive D 3111 → Kas K` jika prive).
- `Periods.tsx` (baru): list periode, tombol `Tutup Periode` (month) & `Tutup Tahun` (year), badge open/closed.
- Modifikasi: `GeneralJournal.tsx` tambah checkbox `Jurnal Penyesuaian` + select `adjustmentType` (a-e); `TrialBalance.tsx` tabs `NS | NSD`; `BalanceSheet.tsx` rincian `3110 Modal, 3111 Prive (negatif), 3120 Laba Ditahan, Laba Berjalan`; `Profile.tsx` atau `Periods` untuk input modal tambahan.

### 7.4 Tidak diubah
- `lib/api.ts` interceptor tetap, `queryClient.ts` stale 30s, `useBusiness` invalidate semua key saat ganti bisnis.

---

## 8. Validasi & Testing

### 8.1 Unit/Integration (Jest `package.json:10` `tests/`)
- `journals.adjustment.test.js`: `isAdjustment` flag persist, tipe a–e balance, void reversal, period closed 403
- `worksheet.test.js`: NS(50jt) + Penyesuaian(perlengkapan 500rb + penyusutan 200rb) → NSD 49.5jt vs 700rb, `laba Worksheet == capitalChange.laba`
- `capital-change.test.js`: `50jt + 4.45jt -1jt =53.45jt`
- `periods.test.js`: closing tahunan `Revenue/Expense → 3130 → 3120`, saldo `3130` nol

### 8.2 Manual E2E Checklist (wajib sebelum done)
1. Buat bisnis `initialCapital 50jt` → `JU-MODAL` ada, `Neraca Awal` seimbang
2. Input 7 jurnal contoh (`accounting.ts:47`) → NS seimbang
3. Penyesuaian a+b → Worksheet NSD benar, Akum Penyusutan (K) di Neraca neto
4. L/R `13jt - 8.55jt =4.45jt` sesuai, CapitalChange `50+4.45-1=53.45`
5. Neraca `Aset 53.45 = Kewajiban 0 + Ekuitas 53.45` (Modal+ Laba Ditahan + Laba)
6. Tutup periode `2026-08` → edit jurnal Agustus 403
7. Seed 28 akun tidak rusak, kontra tampil negatif di laporan

---

## 9. Non-Goals
- Tidak arus kas direct/indirect full, tidak konsolidasi, tidak PPN otomatis, tidak lock otomatis bulanan (hanya manual close).

---

## 10. Risiko & Mitigasi
- Migrasi 28 akun vs data lama → backfill & `createMany skipDuplicates`
- Journal void reversal duplikat nomor → `VOID-{orig}-{timestamp}`
- Worksheet 10 kolom berat → BE paginasi rows, FE virtual scroll jika >100 akun

---

## 11. Urutan Implementasi
1. Prisma schema + migrasi + seed 28 akun + modal awal
2. Journals isAdjustment + void reversal + period guard
3. Periods + CapitalMovement modules
4. Reports: worksheet + adjusted-trial + capital-change (+ refactor profit-loss/balance-sheet)
5. FE: PageKey/Sidebar + useWorksheet/useCapitalChange/usePeriods
6. FE: Worksheet 10 kolom + CapitalChange + Periods + GeneralJournal penyesuaian
7. FE: TrialBalance NSD tab + BalanceSheet rincian modal + isContra fix
8. Tests + E2E + build verify

---

## 12. Self-Review
- [x] Tidak ada TBD/TODO
- [x] Konsisten dengan `app.js` mount, `schema.prisma` existing, envelope `ApiResponse`
- [x] Scope satu spec SAK full cycle (modal+penyesuaian+worksheet+closing) — tidak melebar
- [x] Tidak bertentangan antar bagian (single source JournalLine)
- [x] Path absolut terverifikasi via `read`/`glob`

---

**Menunggu invoke `writing-plans` setelah user approve spec tertulis ini.**
