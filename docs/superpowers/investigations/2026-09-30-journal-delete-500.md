# Investigasi: DELETE jurnal 500 + reversal misterius (production)

Tanggal: 2026-09-30. Status: TERBUKA — menunggu stack trace dari Vercel Logs.
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

## Hipotesis 2 (AKTIF): data-dependent, gagal di dalam transaksi → rollback total
- Kandidat: jurnal tanpa lines → `createMany({data: []})` ditolak Prisma → 500 + rollback.
- Cocok dengan: 500 konsisten per ID, baris asli utuh, reversal tidak bertambah dari request 500.
- Belum terbukti — butuh stack trace.

## Hipotesis 3 (BARU, KUAT): reversal level-2 melebihi VarChar(50)
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

## Bukti yang diminta (belum diterima)
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
