# Investigasi: DELETE jurnal 500 + reversal misterius (production)

Tanggal: 2026-09-30. Status: ROOT CAUSE TERBUKTI 2026-10-04 — fix diimplementasi, menunggu verifikasi production.
URL: https://simply-fawn.vercel.app

## Gejala (laporan user)
- Tambah transaksi jurnal umum: OK.
- Hapus transaksi: toast "Internal Server Error", baris asli tetap ada, muncul baris "Reversal JU-MANUAL-...".
- Ditemukan 3 baris Reversal di list.

## Fakta kode (terverifikasi)
- Hapus = void + reversal, BUKAN hard delete. `be/src/modules/journals/journals.service.js:28-59`.
- Teks "Internal Server Error" persis hanya dari `be/src/common/middlewares/errorHandler.js` (500 tak terduga saat production).
- Controller aman: `journals.controller.js:19-22` (`success(res, null)` tidak bisa crash).
- `Journal @@unique([businessId, journalNo])` — `be/prisma/schema.prisma:184`.
- `remove()` TANPA guard status: hapus jurnal yang sudah void → bikin reversal lagi (bug sekunder, belum difix).
- `remove()` TANPA handling P2002 (beda dengan `createJournalTx` yang map P2002 → 409).

## Bukti log Vercel (dari user)
- `DELETE /api/v1/journals/2` → 200 (satu-satunya sukses).
- `DELETE /3, /4, /5` → 500 konsisten, retry berkali-kali tetap 500.
- 3 baris Reversal ada di list.

## Hipotesis 1 (GUGUR): double-submit → tabrakan unique Date.now()
- Alasan gugur: retry selang detik-menit tetap 500; tabrakan butuh same-millisecond.
- 3 reversal kemungkinan dari delete sukses sebelumnya (mis. /2), bukan dari request 500.

## Hipotesis 2 (GUGUR): data-dependent, gagal di dalam transaksi → rollback total
- Kandidat: jurnal tanpa lines → `createMany({data: []})` ditolak Prisma → 500 + rollback.
- Alasan gugur: bukti prod id 3 `linesCount: 2`, bukan 0.
- Cocok dengan: 500 konsisten per ID, baris asli utuh, reversal tidak bertambah dari request 500.
- Belum terbukti — butuh stack trace.

## Hipotesis 3 (TERBUKTI 2026-10-04): reversal level-2 melebihi VarChar(50)
- Skema: `journalNo VarChar(50)` (`schema.prisma:169`).
- Format: `VOID-<orig>-<Date.now()>` (`journals.service.js:39`).
- Hitungan terverifikasi (node): original ~25 char → reversal L1 ~44 char (lolos)
  → reversal L2 (void sebuah Reversal) ~63 char (> 50 → error DB → 500 + rollback).
- Cocok dengan: 500 konsisten per ID; baris asli utuh; 3 baris Reversal di list
  (jika /3,/4,/5 yang diklik adalah baris Reversal, selalu 500).
- Berkaitan dengan bug sekunder tanpa guard status (void-jurnal-void).
- Konfirmasi butuh: tipe baris /3,/4,/5 (Original vs Reversal).

## Instrumentasi (2026-10-02, tanpa ubah perilaku)
- `journals.service.js: remove()` tambah log `journal.remove.pre` (journalNo,
  status, linesCount, reversalNo + panjangnya) + log `journal.remove.fail`
  (code + message) lalu rethrow. Perilaku API sama; redeploy agar log muncul
  di Vercel Logs pada 500 berikutnya.
- Cara baca hasil: jika `reversalNoLen > 50` → Hipotesis 3 terbukti.
  Jika `linesCount === 0` → Hipotesis 2 terbukti.

## Bukti prod (2026-10-04, dari Vercel Logs — TERBUKTI)
- `DELETE /api/v1/journals/3` → 500 konsisten setelah login sukses.
- `ctx journal.remove.fail`: `code P2000`, `Invalid prisma.journal.create() ... too long for the column's type`,
  `journalNo: VOID-JU-MANUAL-1790779548712-1-1790779890159`, `reversalNoLen: 63`, `linesCount: 2`, `status: posted`.
- Artinya: yang dihapus adalah baris Reversal L1 (status posted), format lama
  `VOID-<orig>-<ts>` menghasilkan 63 char > VarChar(50) → P2000 → rollback total.

## Fix (2026-10-04, TDD)
- Test: `be/tests/journals-remove.test.js` (repro 63 char + guard void) — RED lalu GREEN.
- `be/src/modules/journals/journals.service.js: remove()`:
  1. format `VOID-<Date.now()>-<businessId>` (~20 char, selalu <= 50, referensi orig tetap di `description`/`memo`);
  2. guard `status === 'void'` → 400;
  3. map P2002 → 409.
- `be/tests/journals-adjustment.test.js` diupdate ke format baru (assert `<=50` + `description` berisi orig).
- Full suite: 10/11 suites pass; `sak-schema` gagal pre-existing karena `DATABASE_URL` tidak ada (butuh DB asli, tidak terkait).

## Fix lanjutan (2026-10-04): NSD dangling setelah hapus
- Gejala: transaksi dihapus → NS 0/kosong tapi NSD masih ada nominal.
- Root cause: void = original → `void` (excluded dari laporan) + reversal
  `VOID-*` → `posted` (ikut di laporan sendirian). NS=0 karena FE menjumlah
  void+reversal (saling hapus); NSD nominal karena BE hanya hitung `posted`.
- Fix: kecualikan `journalNo NOT startsWith VOID-` di semua agregasi
  `be/src/modules/reports/reports.repository.js` (worksheet, balance sheet,
  revenue/expense, cashflow) + `periods.service.js` (year/month close) agar
  hapus = hilang total dari NS dan NSD. Tanpa migrasi; data reversal lama
  otomatis excluded.
- Test: `be/tests/reports-reversal-excluded.test.js` (RED→GREEN). Full suite
  11/11 pass (sak-schema di-skip, butuh DATABASE_URL asli).
- Expand salah satu baris DELETE 500 di Vercel Logs (badge "2" = 2 log events) → copy stack trace `logger.error`.
- Konfirmasi: baris asli berstatus apa (posted/void)? Reversal ada 1 per delete sukses?

## Checklist Task 8 Step 2 (status)
1. Health `{success:true}` — ✅ (verified, tapi tidak menyentuh DB)
2. Login — ✅ user konfirmasi (sempat network error → root cause VITE_API_URL, fixed via redeploy)
3. Business list/create — ❓ belum laporan
4. Logo upload + tampil — ❓ terhalang gap UX (tombol Logo hanya di layar "Pilih Bisnis", unreachable dengan 1 bisnis)
5. Logo persist — ❓ nunggu no.4
6. Product CRUD — ❓ belum laporan
7. Journal delete — 🔴 BUG ini

## Langkah besok
1. Dapat stack trace → identifikasi baris meledak (Fase 2-3).
2. Fix root cause + guard void + cegah double-click FE (satu perubahan per hipotesis).
3. Lanjut checklist no.3-6.
