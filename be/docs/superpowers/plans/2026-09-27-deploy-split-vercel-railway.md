# Opsi 2 Split Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy frontend aplikasi-akuntansi ke Vercel dan backend projectBLN1 ke Railway/Render dengan DB Postgres eksternal.

**Architecture:** Frontend static Vite served via Vercel CDN, memanggil backend Express persistent via `VITE_API_URL`. Backend jalan sebagai Node long-lived (Docker atau `npm start`), menjalankan `prisma migrate deploy` saat start, health check di `/api/v1/health`.

**Tech Stack:** Vite 5 + React 18, Express 4 + Prisma 5 + PostgreSQL, Vercel, Railway/Render, Neon/Supabase Postgres.

**Spec:** Keputusan chat 2026-09-27 — opsi 2 (split, bukan full-Vercel serverless karena `src/server.js:1` long-lived + `express-rate-limit` in-memory + Prisma pool tidak cocok serverless).

## Global Constraints

- Backend Node: Express 4.x, `src/app.js:1` export app, `src/server.js:1` listen `PORT`.
- Backend env wajib: `DATABASE_URL`, `JWT_SECRET` (min 32 char), `CORS_ORIGIN` = URL Vercel frontend, `NODE_ENV=production`.
- Frontend env: `VITE_API_URL=https://<backend>/api/v1` saat build Vercel.
- Tidak ada placeholder/TODO di config baru.
- Setiap task diakhiri verifikasi + commit terpisah.

---

### Task 1: Backend deploy-ready (Dockerfile + start prod + CORS check)

**Files:**
- Create: `C:\Users\User\projectBLN1\Dockerfile`
- Create: `C:\Users\User\projectBLN1\.dockerignore`
- Modify: `C:\Users\User\projectBLN1\package.json:5-14` (tambah script `start:prod`)
- Test: `tests/health.test.js` (existing, tidak diubah)

**Interfaces:**
- Consumes: `src/app.js` export `app`, `src/server.js` listen, `prisma/schema.prisma:1-8` datasource postgres.
- Produces: `Dockerfile` buildable image yang menjalankan `prisma migrate deploy` lalu `node src/server.js`; `npm run start:prod` untuk platform non-Docker.

- [ ] **Step 1: Tambah script start:prod di package.json**

Run edit di `C:\Users\User\projectBLN1\package.json`, ubah block scripts:

```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "start:prod": "prisma migrate deploy && node src/server.js",
  "lint": "eslint src tests --ext .js",
  "format": "prettier --write \"src/**/*.js\" \"tests/**/*.js\"",
  "test": "cross-env NODE_ENV=test jest --runInBand",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:studio": "prisma studio"
}
```

Hanya tambah 1 baris `start:prod`, jangan ubah lainnya.

- [ ] **Step 2: Buat Dockerfile**

Buat `C:\Users\User\projectBLN1\Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY public ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
```

- [ ] **Step 3: Buat .dockerignore**

Buat `C:\Users\User\projectBLN1\.dockerignore`:

```
node_modules
npm-debug.log
.env
.git
.gitignore
tests
docs
coverage
```

- [ ] **Step 4: Verifikasi lint + test tetap hijau**

Run: `& "C:\Program Files\nodejs\npm.cmd" run lint` di `C:\Users\User\projectBLN1`
Expected: exit 0, no output.

Run: `& "C:\Program Files\nodejs\npm.cmd" test` di `C:\Users\User\projectBLN1`
Expected: `Test Suites: 8 passed, Tests: 34 passed`.

- [ ] **Step 5: Commit**

```bash
git add package.json Dockerfile .dockerignore
git commit -m "chore(deploy): Dockerfile + start:prod with migrate deploy"
```

### Task 2: Backend platform config (render.yaml + railway.toml)

**Files:**
- Create: `C:\Users\User\projectBLN1\render.yaml`
- Create: `C:\Users\User\projectBLN1\railway.toml`
- Test: validasi YAML manual via `cat` / read-back.

**Interfaces:**
- Consumes: Task 1 `Dockerfile` + `start:prod`; health endpoint `GET /api/v1/health` dari `src/modules/health/health.routes`.
- Produces: 1-klik deploy config untuk Render dan Railway, keduanya pakai `DATABASE_URL` eksternal (Neon/Supabase).

- [ ] **Step 1: Buat render.yaml**

Buat `C:\Users\User\projectBLN1\render.yaml`:

```yaml
services:
  - type: web
    name: flowcash-api
    env: node
    buildCommand: npm ci && npx prisma generate
    startCommand: npm run start:prod
    healthCheckPath: /api/v1/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
        generateValue: true
      - key: CORS_ORIGIN
        sync: false
      - key: JWT_EXPIRES_IN
        value: 1d
```

- [ ] **Step 2: Buat railway.toml**

Buat `C:\Users\User\projectBLN1\railway.toml`:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "npx prisma migrate deploy && node src/server.js"
healthcheckPath = "/api/v1/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
```

- [ ] **Step 3: Verifikasi file terbaca + tidak rusak repo**

Run: `& "C:\Program Files\nodejs\npm.cmd" run lint` di `C:\Users\User\projectBLN1`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add render.yaml railway.toml
git commit -m "chore(deploy): render.yaml + railway.toml with healthcheck"
```

### Task 3: Frontend Vercel-ready (vercel.json + env docs)

**Files:**
- Create: `C:\Users\User\aplikasi-akuntansi\vercel.json`
- Modify: `C:\Users\User\aplikasi-akuntansi\.env.example:1` (tambah komentar produksi, jangan ubah nilai default)
- Test: `npm run build` lokal.

**Interfaces:**
- Consumes: `src/lib/api.ts:4` membaca `VITE_API_URL` fallback `http://localhost:3000/api/v1`; `vite.config.ts:1` build output `dist`.
- Produces: Vercel build `npm run build` → `dist`, SPA rewrite ke `index.html`, env `VITE_API_URL` di-set di dashboard Vercel.

- [ ] **Step 1: Buat vercel.json SPA rewrite**

Buat `C:\Users\User\aplikasi-akuntansi\vercel.json`:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/((?!api).*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Dokumentasikan env produksi di .env.example**

Ubah `C:\Users\User\aplikasi-akuntansi\.env.example` menjadi:

```
VITE_API_URL=http://localhost:3000/api/v1
# Produksi (set di Vercel Dashboard → Settings → Environment Variables):
# VITE_API_URL=https://<backend-railway-atau-render>/api/v1
```

- [ ] **Step 3: Verifikasi build tetap hijau**

Run: `& "C:\Program Files\nodejs\npm.cmd" run build` di `C:\Users\User\aplikasi-akuntansi`
Expected: `tsc -b && vite build`, `✓ built in`, exit 0, `dist/index.html` ada.

- [ ] **Step 4: Commit**

```bash
git add vercel.json .env.example
git commit -m "chore(deploy): vercel.json SPA rewrite + prod env docs"
```

### Task 4: Push + panduan deploy manual (tidak otomatis tanpa token)

**Files:**
- Modify: none (hanya git push + verifikasi remote).
- Test: `git status -sb` harus `## main...origin/main` bersih setelah push.

**Interfaces:**
- Consumes: commit Task 1-2 (backend), Task 3 (frontend).
- Produces: kedua `main` ter-push; URL deploy diisi manual setelah user klik dashboard.

- [ ] **Step 1: Push backend**

```bash
git push origin main
```

Expected: `Everything up-to-date` atau `main -> main`. Jika rejected (remote moved), stop dan investigasi, jangan `--force`.

- [ ] **Step 2: Push frontend (dari repo frontend)**

```bash
git push origin main
```

Sama seperti di atas.

- [ ] **Step 3: Serahkan checklist dashboard ke user (tanpa klaim deploy sukses)**

Tampilkan ke user:
1. Buat Postgres di Neon/Supabase → copy `DATABASE_URL`.
2. Railway/Render → New Project → import `flowcash.git` → set `DATABASE_URL, JWT_SECRET (32+ char), CORS_ORIGIN=https://<vercel-app>.vercel.app, NODE_ENV=production` → Deploy → catat `https://<backend>`, cek `GET /api/v1/health` 200.
3. Vercel → New Project → import `flowcashapp.git` → Framework Vite → set `VITE_API_URL=https://<backend>/api/v1` → Deploy → cek app load + login.
4. Update `CORS_ORIGIN` backend ke URL Vercel final → Redeploy backend.

Jangan klaim "deploy sukses" sebelum user konfirmasi URL health 200 + frontend load 200.
