# Express Boilerplate (Feature Modules) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ubah skeleton express-generator menjadi boilerplate REST API production-ready pola Feature Modules dengan Postgres+Prisma, JWT auth, dan quality gates.

**Architecture:** Feature Modules di `src/modules/<feature>/` (routes/controller/service/repository/validation per fitur); kode shared di `src/common/`; config di `src/config/`; entry `src/app.js` + `src/server.js`; Prisma sebagai satu-satunya akses DB via repository layer.

**Tech Stack:** Node 24 (win32), Express 4.x (pertahankan `~4.16.1`), PostgreSQL, Prisma (`@prisma/client` + `prisma` CLI), `dotenv`, `cors`, `helmet`, `express-rate-limit`, `jsonwebtoken`, `bcryptjs`, `zod`, `winston`, `morgan`, `cookie-parser`, Jest + Supertest, ESLint + Prettier, `cross-env`, `nodemon` (dev only).

**Spec:** `docs/superpowers/specs/2026-09-09-express-boilerplate-design.md`

## Global Constraints

- Express dikunci 4.x (`~4.16.1`), tidak upgrade ke v5.
- `GET /` lama harus tetap balas JSON `{status:'success', message:'Welcome to my awsome project REST API', docs, author}` (typo `awsome` dipertahankan).
- Semua response API v1 via format `{success:boolean, message, data, meta?}` / error `{success:false, message, details?}`.
- Repository = satu-satunya layer yang import `@prisma/client`; service tidak boleh import prisma langsung; controller hanya parse req/res.
- `.env` tidak boleh di-commit; `.env.example` wajib lengkap.
- Setiap task berakhir dengan `npm test` hijau (atau subset yang relevan) + commit.

---

## File Map (akhir)

```text
src/app.js
src/server.js
src/config/env.js
src/config/database.js
src/common/logger.js
src/common/utils/ApiError.js
src/common/utils/ApiResponse.js
src/common/utils/pagination.js
src/common/middlewares/asyncHandler.js
src/common/middlewares/notFound.js
src/common/middlewares/errorHandler.js
src/common/middlewares/validate.js
src/common/middlewares/auth.js
src/common/middlewares/rateLimiter.js
src/modules/health/health.routes.js
src/modules/health/health.controller.js
src/modules/users/users.routes.js
src/modules/users/users.controller.js
src/modules/users/users.service.js
src/modules/users/users.repository.js
src/modules/users/users.validation.js
src/modules/auth/auth.routes.js
src/modules/auth/auth.controller.js
src/modules/auth/auth.service.js
src/modules/auth/auth.repository.js
src/modules/auth/auth.validation.js
prisma/schema.prisma
tests/health.test.js
tests/users.test.js
tests/auth.test.js
.env.example
.eslintrc.cjs, .prettierrc, jest.config.cjs
README.md (tambah runbook)
```

---

### Task 1: Foundation — config, common, app/server baru, health module

**Files:**
- Create: `src/config/env.js`, `src/common/logger.js`, `src/common/utils/ApiError.js`, `src/common/utils/ApiResponse.js`, `src/common/utils/pagination.js`, `src/common/middlewares/asyncHandler.js`, `src/common/middlewares/notFound.js`, `src/common/middlewares/errorHandler.js`, `src/app.js`, `src/server.js`, `src/modules/health/health.controller.js`, `src/modules/health/health.routes.js`, `.env.example`, `tests/health.test.js`
- Modify: `package.json` (scripts + deps dasar), `.gitignore` (tambah baris)

**Interfaces:**
- Consumes: `process.env` (via dotenv)
- Produces: `loadEnv() -> {NODE_ENV, PORT, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, LOG_LEVEL, CORS_ORIGIN}`; `ApiError(statusCode,message,details)`; `ApiResponse.success(res,data,message,meta)`; `asyncHandler(fn)`; `healthRouter: express.Router`

- [ ] **Step 1: Tambah deps + scripts dasar**

Ubah `package.json` menjadi (pertahankan `express ~4.16.1`, pindah `nodemon` ke devDeps):

```json
{
  "name": "projectbln1",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "lint": "eslint src tests --ext .js",
    "format": "prettier --write \"src/**/*.js\" \"tests/**/*.js\"",
    "test": "cross-env NODE_ENV=test jest --runInBand"
  },
  "dependencies": {
    "cookie-parser": "~1.4.4",
    "cors": "^2.8.5",
    "debug": "~2.6.9",
    "dotenv": "^16.4.5",
    "express": "~4.16.1",
    "helmet": "^7.1.0",
    "morgan": "~1.9.1",
    "winston": "^3.13.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "cross-env": "^7.0.3",
    "jest": "^29.7.0",
    "nodemon": "^3.1.4",
    "supertest": "^6.3.4"
  }
}
```

Install dengan (Windows: pakai `npm.cmd` bila `npm.ps1` diblokir ExecutionPolicy):

```bash
npm.cmd install
```

- [ ] **Step 2: Tulis failing test health**

Buat `tests/health.test.js`:

```js
const request = require('supertest');
const app = require('../src/app');

describe('GET /api/v1/health', () => {
  it('responds 200 with success:true', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

Buat `jest.config.cjs`:

```js
module.exports = { testEnvironment: 'node', testMatch: ['**/tests/**/*.test.js'] };
```

- [ ] **Step 3: Jalankan test, pastikan FAIL (src/app belum ada)**

Run: `npx jest tests/health.test.js --runInBand`
Expected: FAIL `Cannot find module '../src/app'`

- [ ] **Step 4: Implementasi config + common + app + health**

Buat `src/config/env.js`:

```js
require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/projectbln1'),
  JWT_SECRET: z.string().default('dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),
});

module.exports = schema.parse(process.env);
```

Buat `src/common/logger.js`:

```js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.simple() })],
});

module.exports = logger;
```

Buat `src/common/utils/ApiError.js`:

```js
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
module.exports = ApiError;
```

Buat `src/common/utils/ApiResponse.js`:

```js
function success(res, data, message = 'OK', meta, statusCode = 200) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}
module.exports = { success };
```

Buat `src/common/utils/pagination.js`:

```js
function parsePagination(query) {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
function buildMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
module.exports = { parsePagination, buildMeta };
```

Buat `src/common/middlewares/asyncHandler.js`:

```js
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = asyncHandler;
```

Buat `src/common/middlewares/notFound.js`:

```js
const ApiError = require('../utils/ApiError');
module.exports = (req, res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
```

Buat `src/common/middlewares/errorHandler.js`:

```js
const logger = require('../logger');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const status = err.statusCode || 500;
  if (status >= 500) logger.error(err.stack || err.message);
  const body = { success: false, message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message || 'Internal Server Error' };
  if (err.details) body.details = err.details;
  if (process.env.NODE_ENV === 'development' && err.stack) body.stack = err.stack;
  return res.status(status).json(body);
};
```

Buat `src/modules/health/health.controller.js`:

```js
const { success } = require('../../common/utils/ApiResponse');

async function getHealth(req, res) {
  return success(res, { uptime: process.uptime() }, 'OK');
}
module.exports = { getHealth };
```

Buat `src/modules/health/health.routes.js`:

```js
const express = require('express');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const { getHealth } = require('./health.controller');

const router = express.Router();
router.get('/', asyncHandler(getHealth));
module.exports = router;
```

Buat `src/app.js` (pertahankan kontrak `GET /` lama persis):

```js
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const notFound = require('./common/middlewares/notFound');
const errorHandler = require('./common/middlewares/errorHandler');
const healthRouter = require('./modules/health/health.routes');

const app = express();
app.use(helmet());
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Welcome to my awsome project REST API', docs: 'https://docs.example.com', author: 'programmer magang' });
});
app.use('/api/v1/health', healthRouter);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

Buat `src/server.js` (ganti `bin/www`, pertahankan pesan error EACCES/EADDRINUSE):

```js
const http = require('http');
const app = require('./app');
const env = require('./config/env');

const port = parseInt(env.PORT, 10) || 3000;
app.set('port', port);
const server = http.createServer(app);
server.listen(port);
server.on('error', (error) => {
  if (error.syscall !== 'listen') throw error;
  const bind = `Port ${port}`;
  if (error.code === 'EACCES') { console.error(`${bind} requires elevated privileges`); process.exit(1); }
  if (error.code === 'EADDRINUSE') { console.error(`${bind} is already in use`); process.exit(1); }
  throw error;
});
server.on('listening', () => console.log(`Listening on port ${port}`));

function shutdown(signal) {
  console.log(`${signal} received, closing...`);
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

Buat `.env.example`:

```text
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/projectbln1
JWT_SECRET=change-me-min-32-chars
JWT_EXPIRES_IN=1d
LOG_LEVEL=info
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

Update `.gitignore` (tambah setelah `node_modules`):

```text
node_modules
.env
*.log
coverage/
logs/
.DS_Store
```

- [ ] **Step 5: Jalankan test Task 1, harus PASS**

Run: `npx jest tests/health.test.js --runInBand`
Expected: PASS 1 test. Manual: `node src/server.js`, cek `GET /` JSON lama dan `GET /api/v1/health` 200.

- [ ] **Step 6: Commit Task 1**

```bash
git add src package.json package-lock.json tests .env.example .gitignore jest.config.cjs
git commit -m "feat: foundation app/server, common middlewares, health module"
```

---

### Task 2: Prisma + Users module (CRUD + pagination + validasi)

**Files:**
- Create: `prisma/schema.prisma`, `src/config/database.js`, `src/common/middlewares/validate.js`, `src/modules/users/users.validation.js`, `src/modules/users/users.repository.js`, `src/modules/users/users.service.js`, `src/modules/users/users.controller.js`, `src/modules/users/users.routes.js`, `tests/users.test.js`
- Modify: `src/app.js:mount users router`, `package.json` (tambah prisma deps + scripts)

**Interfaces:**
- Consumes: `prisma.user.*`, `parsePagination`, `validate(schema)`; Produces: `usersRouter`, `usersService.{list,getById,create,update,remove}`

- [ ] **Step 1: Tambah deps prisma + scripts**

Tambah ke `package.json` dependencies: `"@prisma/client": "^5.18.0"`, devDependencies: `"prisma": "^5.18.0"`. Scripts tambah:

```json
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate dev",
"prisma:studio": "prisma studio"
```

Run: `npm.cmd install` lalu `npx prisma --version` (harus tampil 5.x).

- [ ] **Step 2: Tulis failing test users (mock prisma agar tanpa DB)**

Buat `tests/users.test.js` (mock repository, bukan DB nyata — test integrasi DB nyata menyusul setelah migrate di Step 5):

```js
jest.mock('../src/modules/users/users.repository', () => ({
  findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'A', email: 'a@x.com' }]),
  count: jest.fn().mockResolvedValue(1),
  findById: jest.fn().mockResolvedValue({ id: 1, name: 'A', email: 'a@x.com' }),
  create: jest.fn().mockResolvedValue({ id: 1, name: 'A', email: 'a@x.com' }),
}));
const request = require('supertest');
const app = require('../src/app');

describe('Users module', () => {
  it('GET /api/v1/users returns paginated success', async () => {
    const res = await request(app).get('/api/v1/users?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.page).toBe(1);
  });
  it('POST invalid body returns 400', async () => {
    const res = await request(app).post('/api/v1/users').send({ name: '' });
    expect(res.status).toBe(400);
  });
});
```

Run: `npx jest tests/users.test.js --runInBand`
Expected: FAIL `Cannot find module '../src/modules/users/users.repository'`

- [ ] **Step 3: Implementasi prisma schema + database + validate + users module**

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```

`src/config/database.js`:

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
```

`src/common/middlewares/validate.js`:

```js
const ApiError = require('../utils/ApiError');

function validate(source, schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(new ApiError(400, 'Validation failed', parsed.error.flatten()));
    }
    req[source] = parsed.data;
    return next();
  };
}
module.exports = validate;
```

`src/modules/users/users.validation.js`:

```js
const { z } = require('zod');
const createUserSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(6) });
const updateUserSchema = z.object({ name: z.string().min(1).optional(), email: z.string().email().optional() });
module.exports = { createUserSchema, updateUserSchema };
```

`src/modules/users/users.repository.js`:

```js
const prisma = require('../../config/database');

async function findMany(skip, take) {
  return prisma.user.findMany({ skip, take, orderBy: { id: 'asc' }, select: { id: true, name: true, email: true, createdAt: true, updatedAt: true } });
}
async function count() { return prisma.user.count(); }
async function findById(id) {
  return prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, createdAt: true, updatedAt: true } });
}
async function create(data) {
  return prisma.user.create({ data, select: { id: true, name: true, email: true, createdAt: true } });
}
module.exports = { findMany, count, findById, create };
```

`src/modules/users/users.service.js`:

```js
const bcrypt = require('bcryptjs');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./users.repository');

async function list(query) {
  const { page, limit, skip, take } = parsePagination(query);
  const [items, total] = await Promise.all([repo.findMany(skip, take), repo.count()]);
  return { items, meta: buildMeta(page, limit, total) };
}
async function getById(id) {
  const user = await repo.findById(Number(id));
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}
async function create(body) {
  const password = await bcrypt.hash(body.password, 10);
  try {
    return await repo.create({ name: body.name, email: body.email, password });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Email already exists');
    throw e;
  }
}
module.exports = { list, getById, create };
```

`src/modules/users/users.controller.js`:

```js
const { success } = require('../../common/utils/ApiResponse');
const service = require('./users.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.query);
  return success(res, items, 'Users fetched', meta);
}
async function getById(req, res) {
  const user = await service.getById(req.params.id);
  return success(res, user, 'User fetched');
}
async function create(req, res) {
  const user = await service.create(req.body);
  return success(res, user, 'User created', undefined, 201);
}
module.exports = { list, getById, create };
```

`src/modules/users/users.routes.js`:

```js
const express = require('express');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const validate = require('../../common/middlewares/validate');
const { createUserSchema } = require('./users.validation');
const { list, getById, create } = require('./users.controller');

const router = express.Router();
router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getById));
router.post('/', validate('body', createUserSchema), asyncHandler(create));
module.exports = router;
```

Mount di `src/app.js` (tambah 2 baris sebelum `notFound`):

```js
const usersRouter = require('./modules/users/users.routes');
app.use('/api/v1/users', usersRouter);
```

Tambah dep `bcryptjs`: `"bcryptjs": "^2.4.3"` lalu `npm.cmd install`.

- [ ] **Step 4: Jalankan test Task 2, harus PASS**

Run: `npx jest tests/users.test.js --runInBand`
Expected: PASS 2 tests.

- [ ] **Step 5: Verifikasi Prisma nyata (butuh Postgres lokal)**

Run: `npx prisma validate` (Expected: valid) lalu bila DB tersedia: salin `.env.example` ke `.env`, sesuaikan `DATABASE_URL`, run `npx prisma migrate dev --name init`. Jika Postgres belum ada, catat di README dan lanjut (tidak blokir task).

- [ ] **Step 6: Commit Task 2**

```bash
git add prisma src tests package.json package-lock.json
git commit -m "feat: add prisma schema and users module with pagination"
```

---

### Task 3: Auth module (register/login/me + JWT guard)

**Files:**
- Create: `src/common/middlewares/auth.js`, `src/modules/auth/auth.validation.js`, `src/modules/auth/auth.repository.js`, `src/modules/auth/auth.service.js`, `src/modules/auth/auth.controller.js`, `src/modules/auth/auth.routes.js`, `tests/auth.test.js`
- Modify: `src/app.js:mount auth router`, `src/modules/users/users.routes.js:protect POST/GET by id (tambah auth)`, `package.json` (tambah `jsonwebtoken`)

**Interfaces:**
- Consumes: `users.repository`-like prisma user, `bcrypt`, `jsonwebtoken.sign/verify`; Produces: `authRouter`, `authMiddleware(req.user={id,email})`

- [ ] **Step 1: Tambah dep jsonwebtoken**

Tambah `"jsonwebtoken": "^9.0.2"` ke dependencies, run `npm.cmd install`.

- [ ] **Step 2: Tulis failing test auth**

Buat `tests/auth.test.js`:

```js
const request = require('supertest');
const app = require('../src/app');

describe('Auth module', () => {
  it('POST /api/v1/auth/register invalid returns 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'bad' });
    expect(res.status).toBe(400);
  });
  it('GET /api/v1/auth/me without token returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
```

Run: `npx jest tests/auth.test.js --runInBand`
Expected: FAIL `Cannot find module` atau 404 (router belum mount).

- [ ] **Step 3: Implementasi auth middleware + module**

`src/common/middlewares/auth.js`:

```js
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const env = require('../../config/env');

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new ApiError(401, 'Missing or invalid token'));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};
```

`src/modules/auth/auth.validation.js`:

```js
const { z } = require('zod');
const registerSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(6) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
module.exports = { registerSchema, loginSchema };
```

`src/modules/auth/auth.repository.js`:

```js
const prisma = require('../../config/database');

async function findByEmail(email) { return prisma.user.findUnique({ where: { email } }); }
async function create(data) {
  return prisma.user.create({ data, select: { id: true, name: true, email: true, createdAt: true } });
}
module.exports = { findByEmail, create };
```

`src/modules/auth/auth.service.js`:

```js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ApiError = require('../../common/utils/ApiError');
const env = require('../../config/env');
const repo = require('./auth.repository');

function sign(user) {
  return jwt.sign({ email: user.email }, env.JWT_SECRET, { subject: String(user.id), expiresIn: env.JWT_EXPIRES_IN });
}
async function register(body) {
  const exists = await repo.findByEmail(body.email);
  if (exists) throw new ApiError(409, 'Email already exists');
  const password = await bcrypt.hash(body.password, 10);
  const user = await repo.create({ name: body.name, email: body.email, password });
  return { user, token: sign(user) };
}
async function login(body) {
  const user = await repo.findByEmail(body.email);
  if (!user) throw new ApiError(401, 'Invalid credentials');
  const ok = await bcrypt.compare(body.password, user.password);
  if (!ok) throw new ApiError(401, 'Invalid credentials');
  return { user: { id: user.id, name: user.name, email: user.email }, token: sign(user) };
}
module.exports = { register, login };
```

`src/modules/auth/auth.controller.js`:

```js
const { success } = require('../../common/utils/ApiResponse');
const service = require('./auth.service');

async function register(req, res) {
  const result = await service.register(req.body);
  return success(res, result, 'Registered', undefined, 201);
}
async function login(req, res) {
  const result = await service.login(req.body);
  return success(res, result, 'Logged in');
}
async function me(req, res) {
  return success(res, { user: req.user }, 'Profile');
}
module.exports = { register, login, me };
```

`src/modules/auth/auth.routes.js`:

```js
const express = require('express');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const validate = require('../../common/middlewares/validate');
const auth = require('../../common/middlewares/auth');
const { registerSchema, loginSchema } = require('./auth.validation');
const { register, login, me } = require('./auth.controller');

const router = express.Router();
router.post('/register', validate('body', registerSchema), asyncHandler(register));
router.post('/login', validate('body', loginSchema), asyncHandler(login));
router.get('/me', auth, asyncHandler(me));
module.exports = router;
```

Mount di `src/app.js` sebelum `notFound`:

```js
const authRouter = require('./modules/auth/auth.routes');
app.use('/api/v1/auth', authRouter);
```

- [ ] **Step 4: Jalankan test Task 3, harus PASS**

Run: `npx jest tests/auth.test.js --runInBand`
Expected: PASS 2 tests.

- [ ] **Step 5: Commit Task 3**

```bash
git add src tests package.json package-lock.json
git commit -m "feat: add auth module with JWT guard"
```

---

### Task 4: Hardening — helmet/cors/rate-limit/winston, lint/format, README, cleanup skeleton lama

**Files:**
- Create: `src/common/middlewares/rateLimiter.js`, `.eslintrc.cjs`, `.prettierrc`, `README.md` (tambah runbook bila belum ada)
- Modify: `src/app.js:morgan -> winston stream + rateLimiter untuk /api`, `package.json:tambah eslint/prettier deps`, `src/modules/users/users.routes.js:protect dengan auth`

**Interfaces:**
- Consumes: `env.RATE_LIMIT_*`, `logger.stream`; Produces: hardened `app` (security headers + 429 saat abuse)

- [ ] **Step 1: Tambah deps quality**

Tambah devDeps: `"eslint": "^8.57.0"`, `"prettier": "^3.3.3"`, `"eslint-config-prettier": "^9.1.0"`. Run `npm.cmd install`.

Buat `src/common/middlewares/rateLimiter.js`:

```js
const rateLimit = require('express-rate-limit');
const env = require('../../config/env');

const apiLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
  max: parseInt(env.RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
});
module.exports = apiLimiter;
```

Tambah dep `"express-rate-limit": "^7.2.0"`, run `npm.cmd install`.

- [ ] **Step 2: Protect users routes + harden app**

Ubah `src/modules/users/users.routes.js` GET by id + POST jadi protected (tambah `const auth = require('../../common/middlewares/auth');` lalu `router.get('/:id', auth, asyncHandler(getById));` dan `router.post('/', auth, validate(...), ...)` — GET list tetap publik agar test Task 2 tidak pecah; dokumentasikan di README).

Ubah `src/app.js`: tambah setelah `app.use(cors())`:

```js
const apiLimiter = require('./common/middlewares/rateLimiter');
app.use('/api', apiLimiter);
```

Ganti `app.use(logger('dev'))` dengan stream winston bila `NODE_ENV=production`, contoh minimal:

```js
const winstonLogger = require('./common/logger');
app.use(logger('combined', { stream: { write: (msg) => winstonLogger.info(msg.trim()) } }));
```

- [ ] **Step 3: Tambah eslint/prettier config + jalankan**

`.eslintrc.cjs`:

```js
module.exports = { env: { node: true, es2021: true, jest: true }, extends: ['eslint:recommended', 'prettier'], rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^next$' }] } };
```

`.prettierrc`:

```json
{ "singleQuote": true, "trailingComma": "es5", "printWidth": 120 }
```

Run: `npx eslint src tests --ext .js` Expected: 0 errors (perbaiki bila ada). Run: `npx prettier --check "src/**/*.js" "tests/**/*.js"` lalu `--write` bila perlu.

- [ ] **Step 4: Hapus skeleton lama setelah verifikasi + tulis README runbook**

Verifikasi dulu: `GET /` dan `/api/v1/health` masih OK via `node src/server.js`. Lalu hapus: `app.js` root dan folder `bin/`:

```bash
git rm app.js bin/www
```

Tambah `README.md` (atau append) runbook minimal:

```md
## Run
1. `cp .env.example .env` (sesuaikan DATABASE_URL, JWT_SECRET)
2. `npm.cmd install`
3. `npx prisma migrate dev`
4. `npm run dev` -> http://localhost:3000, health di `/api/v1/health`
## Test
`npm test` (butuh Postgres untuk migrate; unit users/auth memakai mock repository)
```

- [ ] **Step 5: Final verification + commit**

Run berurutan, semua harus hijau:

```bash
npx prisma validate
npx eslint src tests --ext .js
npx jest --runInBand
```

```bash
git add -A
git commit -m "chore: harden API, lint/format, cleanup legacy skeleton"
```

---

## Self-Review

1. Spec coverage: foundation+health (Task 1), Prisma+users+pagination+P2002 (Task 2), JWT auth+guard (Task 3), helmet/cors/rate-limit/winston/eslint/jest/README + hapus `app.js`/`bin/www` (Task 4). Semua acceptance criteria (health 200, `/` lama, JWT, pagination meta, 400/404/500 konsisten, lint+test+prisma validate, README) terpetakan.
2. Placeholder scan: tidak ada TBD/TODO; semua code block konkret, versi dep eksplisit, perintah verifikasi eksplisit (`prisma validate`, `eslint`, `jest`).
3. Type consistency: `ApiError(statusCode,message,details)`, `success(res,data,message,meta,status)`, `parsePagination(query)->{page,limit,skip,take}`, repo `findMany(skip,take)/count/findById/create`, service `list/getById/create`, auth `sign(user)->token`. Nama konsisten antar task.
