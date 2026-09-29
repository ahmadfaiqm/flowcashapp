# Design: 1 Proyek Vercel Monorepo + Supabase Postgres + Cloudinary Logo

Tanggal: 2026-09-29. Status: disetujui per bagian oleh pemilik repo, siap jadi implementation plan.

## 1. Latar & keputusan

Repo `aplikasi-akuntansi` adalah monorepo `be/` (Express + Prisma + Postgres, 23 modul, 18 tabel)
+ `fe/` (React Vite). Target yang disetujui: satu proyek Vercel (FE statis + `/api/*` serverless),
database pindah ke Supabase Postgres (project dibuat dari nol), storage Cloudinary hanya untuk
logo company. File Railway/Docker (`be/Dockerfile`, `be/railway.toml`, `be/render.yaml`)
dipertahankan selama transisi dan dihapus setelah backend Vercel terbukti jalan.
Pendekatan yang dipilih: Adapter Express (opsi B fungsi per-route dan opsi C campur ditolak).

## 2. Arsitektur Vercel monorepo (services mode — amendemen 2026-09-29)

Keputusan awal adapter Express (`api/index.js`) diganti Vercel services mode atas
konfirmasi pemilik repo. Root `vercel.json` mendefinisikan dua service: `be`
(root `be`, framework `express`, build `npx prisma generate`) dan `fe` (root `fe`,
framework `vite`). Rewrite: `/api/(.*)` → service `be`, `/(.*)` → service `fe`.
- Tidak ada bindings: FE adalah static build (binding hanya resolve di runtime function,
  tidak saat Vite build). FE memakai `VITE_API_URL=/api/v1` same-origin lewat rewrite publik.
- `be/src/server.js` tetap dipakai (Vercel meng-inject `PORT`); `trust proxy` dan CORS di
  `be/src/app.js:15-23` sudah benar, tinggal set `CORS_ORIGIN` ke domain Vercel.
- `be/src/config/database.js` singleton `globalThis` tetap dipakai (aman untuk reuse koneksi).
- Batasan platform: tanpa WebSocket/koneksi persisten. Query dashboard/reports harus tetap cepat.
- Fase 1: file Railway/Docker tidak dihapus (fallback). Fase 2 setelah kriteria sukses
  Bagian 6 terpenuhi: hapus ketiga file + `fe/vercel.json` yang lama, update `README-DEPLOY.md`.

## 3. Database Supabase Postgres

- Buat project Supabase baru via dashboard (di luar repo). Ambil dua string koneksi:
  `DATABASE_URL` pooler port 6543 dengan `?pgbouncer=true&connection_limit=1` untuk runtime
  Vercel, dan `DIRECT_URL` port 5432 untuk `prisma migrate deploy`.
- `be/prisma/schema.prisma`: tambah `directUrl = env("DIRECT_URL")`, `url` tetap
  `env("DATABASE_URL")`. Tidak ada perubahan model di bagian ini.
- Migrasi lama `20260911030049_init_multischema` memakai schema `"accounting".*` yang tidak
  ada di Supabase default (`public`) dan akan gagal di DB fresh. Strategi: baseline —
  deploy migrasi ke Supabase fresh apa adanya; jika gagal, squash migrasi lama menjadi satu
  migrasi baseline dari `schema.prisma` saat ini. Data lokal/dev tidak dibawa (fresh start;
  belum ada data produksi).
- `be/src/config/env.js`: tambah validasi Zod `DIRECT_URL` (wajib di production, default
  lokal Postgres agar `npm run dev` tidak rusak). Env Vercel: `DATABASE_URL`, `DIRECT_URL`,
  `JWT_SECRET` baru min 32 char, `JWT_EXPIRES_IN=1d`, `CORS_ORIGIN=https://<project>.vercel.app`,
  `NODE_ENV=production`.

## 4. Storage Cloudinary (logo company saja)

- Schema: satu kolom baru `BusinessProfile.logoUrl String? @map("logo_url")` + satu migrasi.
  Tidak ada tabel Attachment generik (ditolak secara sadar, YAGNI).
- Dependensi BE baru: `multer` (memory storage, limit 2 MB, filter jpeg/png/webp) dan
  `cloudinary` (v2 SDK). File baru `be/src/common/cloudinary.js` berisi konfigurasi dari env.
- Endpoint baru di modul `businesses` yang sudah ada (22 modul lain tidak disentuh):
  `POST /api/v1/businesses/:id/logo` (auth + cek owner/member, upload buffer via
  `upload_stream` ke folder `akuntansi/logos`, simpan `secure_url` ke `logoUrl`) dan
  `DELETE /api/v1/businesses/:id/logo` (hapus asset di Cloudinary + null-kan kolom).
- FE: tambah input file + preview `logoUrl` di halaman bisnis. Request upload memakai
  `multipart/form-data` dan meng-override header default `application/json` dari
  `fe/src/lib/api.ts:8` hanya untuk request ini.
- Env baru: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  (Vercel + lokal), divalidasi di `env.js`.
- Error handling: file melebihi 2 MB atau tipe salah mengembalikan 400 via envelope error
  yang sudah ada; kegagalan upload Cloudinary mengembalikan 502 + log winston dan
  `logoUrl` lama dipertahankan (tidak di-null-kan).

## 5. Berkas yang disentuh

- Baru: `api/index.js`, `vercel.json` (root), `be/src/common/cloudinary.js`,
  `docs/superpowers/specs/2026-09-29-vercel-monorepo-supabase-cloudinary-design.md`,
  1 migrasi Prisma (kolom logo, digabung/sesudah baseline Bagian 3).
- Ubah: `be/prisma/schema.prisma` (`directUrl` + `logoUrl`), `be/src/config/env.js`,
  `be/src/config/database.js` (singleton), `be/src/modules/businesses/*` (2 endpoint),
  `fe/src` halaman bisnis + pemanggilan API logo, `package.json` root (build script),
  `README-DEPLOY.md`, `.gitignore` root (rapikan entri `dist` ganda).
- Hapus (Fase 2 saja): `be/Dockerfile`, `be/railway.toml`, `be/render.yaml`.

## 6. Testing & kriteria sukses

- Lokal tetap hijau: `npm run dev` (concurrently), `npm --prefix be test` (jest+supertest)
  plus 3-4 test baru (upload sukses, tolak file besar, tolak tipe salah, hapus logo),
  `npm --prefix fe run build` hijau (sudah hijau per audit 2026-09-29).
- Definisi "terbukti jalan" di URL Vercel sebelum hapus Railway: `GET /api/v1/health` 200,
  login, pilih/buat bisnis, upload + hapus logo, CRUD satu modul (products), logo tampil di FE.
- Rollback Fase 1: Railway masih deployable; jika Vercel gagal, kembalikan `VITE_API_URL`
  FE ke URL Railway tanpa perubahan kode.
