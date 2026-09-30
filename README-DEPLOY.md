# Deploy — Single Vercel Project (services `be` + `fe`)

Topologi: satu project Vercel dari repo root. Root `vercel.json` (services mode)
mengatur routing: `/api/(.*)` → service `be` (Express), `/(.*)` → service `fe`
(Vite). Tidak ada project FE terpisah, tidak ada Railway/Docker.

## 1. Buat project Vercel

1. Vercel → Add New Project → pilih repo ini.
2. Jangan override Root Directory — biarkan root `vercel.json` yang mengatur.
3. Framework terdeteksi per-service via `vercel.json` (`be` = express, `fe` = vite).
4. Deploy.

## 2. Environment variables (Production)

Set di Project → Settings → Environment Variables:

| Var | Contoh / catatan |
|-----|------------------|
| `DATABASE_URL` | Supabase pooler port 6543 + `?pgbouncer=true&connection_limit=1` (runtime) |
| `DIRECT_URL` | Supabase direct port 5432 (migrasi) |
| `JWT_SECRET` | Random min 32 char, fresh untuk production |
| `JWT_EXPIRES_IN` | `1d` |
| `CORS_ORIGIN` | `https://<project>.vercel.app` |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |
| `CLOUDINARY_CLOUD_NAME` | Dari dashboard Cloudinary |
| `CLOUDINARY_API_KEY` | Dari dashboard Cloudinary |
| `CLOUDINARY_API_SECRET` | Dari dashboard Cloudinary |
| `VITE_API_URL` | `/api/v1` (same-origin, FE memanggil API yang sekolokasi) |

## 3. Supabase — migrasi & pooler

- Migrasi dijalankan dengan `DIRECT_URL` (port 5432):
  `npx --prefix be prisma migrate deploy`.
- Runtime memakai `DATABASE_URL` (port 6543 pooler + flag pgbouncer).
- Jangan commit connection string — simpan hanya di env Vercel.
- Verifikasi: query `business_profiles` mengembalikan `0` baris (tabel kosong, tanpa error).

## 4. Cloudinary — setup logo bisnis

- Buat akun di Cloudinary, catat cloud name / API key / secret.
- Isi ketiga `CLOUDINARY_*` di Vercel. Jika kosong, upload logo menjawab `503`
  (logo upload is not configured) — perilaku yang disengaja.
- Konstrain: max 2 MB, mime jpeg/png/webp, folder `akuntansi/logos`.
- Endpoint: `POST /api/v1/businesses/:id/logo` dan
  `DELETE /api/v1/businesses/:id/logo` (hanya role `owner`).

## 5. Verifikasi live (deletion gate — sudah lolos)

- `GET https://<project>.vercel.app/api/v1/health` → `{ success: true }`
- Login, list/create business, satu round-trip CRUD product.
- Logo upload + remove bekerja, logo tampil di FE, dan bertahan setelah login ulang
  (persistensi via Supabase + URL Cloudinary).

## 6. Lokal (monorepo)

```bash
npm --prefix be install
npm --prefix fe install

copy be\.env.example be\.env
copy fe\.env.example fe\.env
# sesuaikan DATABASE_URL, DIRECT_URL, JWT_SECRET, CORS_ORIGIN=http://localhost:5173, VITE_API_URL=http://localhost:3000/api/v1

npx --prefix be prisma migrate dev
npm --prefix be run dev      # :3000
npm --prefix fe run dev      # :5173
```

## Rollback note

- `VITE_API_URL` adalah same-origin (`/api/v1`); tidak ada project FE terpisah
  yang perlu di-rollback.
- Railway/Docker artifacts (`be/Dockerfile`, `be/railway.toml`, `be/render.yaml`)
  dan `fe/vercel.json` lama sudah dihapus setelah verifikasi live lolos.
- Untuk kembali ke split-deploy, restore file-file tersebut dari git history.

## Struktur

```text
aplikasi-akuntansi/
  be/  Express + Prisma + Supabase Postgres (service `be`)
  fe/  React Vite (service `fe`)
  vercel.json  services + rewrites (satu project)
```
