# Deploy — FE Vercel + BE Railway (monorepo `be/` + `fe/`)

## 1. Backend → Railway (Root Directory = `be`)

1. Railway → New Project → Deploy from GitHub → pilih repo ini.
2. Add Postgres: `+ New → Database → PostgreSQL`. Copy `DATABASE_URL` (atau pakai `${{Postgres.DATABASE_URL}}` di Variables).
3. Service BE → Settings:
   - **Root Directory = `be`**
   - Build: Dockerfile (`be/Dockerfile` otomatis via `be/railway.toml`)
   - Healthcheck Path: `/api/v1/health`
4. Variables (Service BE → Variables):
   - `DATABASE_URL` = dari Postgres
   - `JWT_SECRET` = random min 32 char
   - `JWT_EXPIRES_IN` = `1d`
   - `CORS_ORIGIN` = `https://<nama-fe>.vercel.app` (setelah FE deploy, update lagi)
   - `NODE_ENV` = `production` (Dockerfile sudah set, tapi eksplisit lebih aman)
   - `LOG_LEVEL` = `info`
   - Railway meng-inject `PORT` otomatis — `src/server.js` sudah pakai `env.PORT`.
5. Deploy. Start command otomatis: `npx prisma migrate deploy && node src/server.js`.
6. Test: `GET https://<nama-be>.up.railway.app/api/v1/health` → `{ success: true }`.

Catatan: `be/src/app.js` sudah `trust proxy` + fix CORS (`*` → credentials false, list domain → credentials true).

## 2. Frontend → Vercel (Root Directory = `fe`)

1. Vercel → Add New Project → pilih repo ini.
2. **Root Directory = `fe`** (Framework: Vite, Build: `npm run build`, Output: `dist` — dari `fe/vercel.json`).
3. Environment Variables (Project → Settings → Environment Variables):
   - `VITE_API_URL` = `https://<nama-be>.up.railway.app/api/v1`
4. Deploy. Test: buka URL Vercel → login → data dari Railway.

## 3. Lokal (monorepo)

```bash
# install sekali
npm --prefix be install
npm --prefix fe install

# env
copy be\.env.example be\.env
copy fe\.env.example fe\.env
# sesuaikan DATABASE_URL, JWT_SECRET, CORS_ORIGIN=http://localhost:5173, VITE_API_URL=http://localhost:3000/api/v1

# migrasi + jalan
npx --prefix be prisma migrate dev
npm --prefix be run dev      # :3000
npm --prefix fe run dev      # :5173
```

## Struktur

```text
aplikasi-akuntansi/
  be/  Express + Prisma + Postgres (Railway, Root Directory=be)
  fe/  React Vite (Vercel, Root Directory=fe)
```
