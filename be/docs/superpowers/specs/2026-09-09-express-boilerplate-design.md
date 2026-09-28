# Design Spec: ExpressJS Boilerplate Infrastructure (Feature Modules)

- Date: 2026-09-09
- Status: Approved (design review passed, awaiting spec review)
- Scope: Struktur boilerplate API saja (tanpa Docker / CI/CD)
- Stack: Express 4.x, PostgreSQL + Prisma, JWT, Zod, Winston, Jest + Supertest, ESLint + Prettier

## 1. Context

Repo saat ini adalah skeleton express-generator: `app.js` di root,
`bin/www` sebagai entry, folder `public/`, deps `express ~4.16.1`,
`cookie-parser`, `morgan`, `debug`. Belum ada commit git. Belum ada
routes/controllers/config/DB/error handling/env/testing.

Tujuan: mengubah skeleton menjadi boilerplate REST API production-ready
dengan pola Feature Modules, tanpa mengubah perilaku endpoint `/` yang ada
(kontrak JSON dipertahankan selama migrasi ke `src/`).

## 2. Architecture (dipilih: B Feature Modules)

```text
src/
  app.js                  # setup express (pengganti app.js root)
  server.js               # listen (pengganti bin/www)
  config/
    env.js                # validasi + export env (dotenv + zod)
    database.js           # export prisma client singleton
  common/
    logger.js             # winston (console + file, level via env)
    middlewares/
      asyncHandler.js     # bungkus async agar error ke next()
      notFound.js         # 404 untuk route tak dikenal
      errorHandler.js     # handler terpusat -> ApiError JSON
      validate.js         # middleware validasi zod (body/query/params)
      auth.js             # verify JWT -> req.user
      rateLimiter.js      # express-rate-limit (api limiter)
    utils/
      ApiError.js         # class { statusCode, message, details }
      ApiResponse.js      # helper { success(data, meta) }
      pagination.js       # parse page/limit -> skip/take + meta
  modules/
    health/
      health.routes.js    # GET /api/v1/health
      health.controller.js
    auth/
      auth.routes.js      # POST /api/v1/auth/register|login, GET /me
      auth.controller.js  # req/res saja
      auth.service.js     # bcrypt + jwt business logic
      auth.repository.js  # akses prisma user saja
      auth.validation.js  # schema zod register/login
    users/
      users.routes.js     # GET/GET by id/POST/PATCH/DELETE /api/v1/users
      users.controller.js
      users.service.js
      users.repository.js
      users.validation.js
prisma/
  schema.prisma           # datasource postgres, generator client, model User (+ Post contoh)
```

Alasan pilih B atas A/C:
- A (layered flat) lebih simpel tapi fitur auth/users tercampur di folder global.
- B mengelompokkan per fitur -> ownership jelas, tambah modul baru tanpa sentuh modul lama.
- C (controller langsung ke Prisma) ditolak karena business logic bocor ke transport layer.

YAGNI: tidak ada Docker/CI, tidak ada Redis/cache, tidak ada upload file,
tidak ada i18n. `public/` dibiarkan apa adanya (masih diserve statis).

## 3. Data Flow

1. `server.js` load `config/env` -> connect Prisma (`database.js`) -> `app.listen`.
2. Global middleware order: `helmet, cors, express.json, urlencoded, cookieParser, morgan -> winston stream, rateLimiter (hanya /api), routes, notFound, errorHandler`.
3. Per-request protected: `auth` -> `validate(zod)` -> `controller` -> `service` -> `repository (prisma)` -> `ApiResponse.success`.
4. Error: throw `ApiError` dari service/validation/auth -> `asyncHandler` forward -> `errorHandler` format `{ success:false, message, details }`. Prisma known errors (mis. P2002 unique) dipetakan ke 409 di service.

## 4. Error Handling

- `ApiError(statusCode, message, details?)`. Default 500 untuk unknown.
- `notFound` untuk semua route tak cocok -> `ApiError(404)`.
- `errorHandler` bedakan operational vs programming: log stack via winston, tapi ke klien hanya message aman (sembunyikan stack kecuali `NODE_ENV=development`).
- Validasi zod gagal -> 400 dengan `details` per-field.

## 5. Config & Env

`.env.example` wajib berisi: `NODE_ENV, PORT, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, LOG_LEVEL, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, CORS_ORIGIN`.
`src/config/env.js` memvalidasi dengan zod saat boot dan throw cepat bila kurang.
`.gitignore` ditambah: `.env, *.log, coverage/, logs/, .DS_Store` (pertahankan `node_modules`).

## 6. Dependencies (ditambah)

- runtime: `dotenv, cors, helmet, express-rate-limit, jsonwebtoken, bcryptjs, zod, winston, @prisma/client`
- dev: `prisma, nodemon (dipindah ke devDeps, karena start script memakainya), jest, supertest, cross-env, eslint, prettier, eslint-config-prettier`
- scripts: `dev (nodemon src/server.js), start (node src/server.js), lint, format, test (jest --runInBand), test:watch, prisma:generate, prisma:migrate, prisma:studio, db:seed (opsional minimal)`

Catatan: `express ~4.16.1` dipertahankan (tidak upgrade mayor ke v5 agar tidak breaking).

## 7. Testing

- `jest + supertest` terhadap `src/app.js` (tanpa listen).
- Scope awal: `health` 200, `users` CRUD happy-path + 404, `auth` guard 401 tanpa token, validasi 400.
- DB untuk test: gunakan database Postgres terpisah via `DATABASE_URL` test (didokumentasikan di README, migrasi via prisma). Tidak pakai mock Prisma agar integrasi nyata.

## 8. Migration Plan (dari skeleton lama)

1. Tambah deps + config (env, logger, prisma init).
2. Buat `src/common` (utils + middlewares).
3. Buat `src/modules/health` + mount `/api/v1/*`, pertahankan `GET /` lama.
4. Buat `users` + `auth` modules (schema Prisma User + bcrypt + JWT).
5. Pindah `app.js` root -> `src/app.js`, `bin/www` -> `src/server.js` (tambah graceful shutdown + handle EADDRINUSE/EACCES seperti www lama). Hapus file lama setelah verifikasi.
6. Tambah `.env.example`, update `.gitignore`, tambah eslint/prettier/jest config + README runbook.

## 9. Acceptance Criteria

- `npm run dev` jalan di PORT env; `GET /` balikan JSON lama; `GET /api/v1/health` 200 `{ success:true }`.
- `POST /api/v1/auth/register|login` keluarkan JWT; `GET /api/v1/users` butuh Bearer + dukung `?page&limit` dengan meta pagination.
- Body invalid -> 400 format konsisten; route tak ada -> 404 konsisten; error tak terduga -> 500 tanpa bocor stack ke klien (prod).
- `npm test` hijau; `npm run lint` bersih; `npx prisma validate` lolos.
- README menjelaskan: prasyarat Postgres, copy `.env`, `prisma migrate dev`, `npm run dev`.

## 10. Non-Goals (eksplisit tidak dikerjakan)

Docker/Dockerfile, CI/CD, deploy, Redis, upload/storage, frontend, migrasi data lama (tidak ada).

---

## Spec Self-Review

1. Placeholder scan: tidak ada TBD/TODO; semua env dan script konkret.
2. Konsistensi: entry tunggal `src/server.js`, handler tunggal `errorHandler`, response tunggal `ApiResponse` — konsisten dengan modul auth/users.
3. Scope: satu rencana implementasi (boilerplate API). Tidak butuh dekomposisi lanjutan.
4. Ambiguitas: versi Express dikunci 4.x; zod dipilih untuk validasi+env (bukan joi); Postgres test-DB eksplisit via env terpisah.
