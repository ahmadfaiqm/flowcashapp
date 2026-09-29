# Vercel Monorepo + Supabase + Cloudinary Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the monorepo as one Vercel project (static FE + serverless Express API) on Supabase Postgres with Cloudinary business logos.

**Architecture:** Add a thin `api/index.js` serverless entry that re-exports the existing Express app (no refactor of the 23 modules); point Prisma at Supabase via pooled `DATABASE_URL` + `DIRECT_URL`; add logo-only upload (multer memory + Cloudinary SDK) to the existing businesses module.

**Tech Stack:** Vercel (1 project), Supabase Postgres, Cloudinary v2 SDK, multer 1.x, Prisma 5.18, Express 4.16, Node 20.

**Spec:** `docs/superpowers/specs/2026-09-29-vercel-monorepo-supabase-cloudinary-design.md`

## Global Constraints

- Node runtime is 20 (matches `be/Dockerfile`).
- All API responses use the `success(res, data, message, meta?, status?)` envelope from `be/src/common/utils/ApiResponse.js`.
- All API errors throw `ApiError(statusCode, message, details?)` from `be/src/common/utils/ApiError.js`.
- Auth pattern per route: `auth` middleware, then `validate('body', schema)` for JSON, then `asyncHandler(controllerFn)` (see `be/src/modules/businesses/businesses.routes.js`).
- Multipart logo routes use multer middleware instead of `validate('body', ...)` (multipart bodies are not JSON).
- JWT secret minimum 32 random characters in production.
- Logo constraints: max 2 MB, mime jpeg/png/webp only, Cloudinary folder `akuntansi/logos`.
- Railway/Docker files (`be/Dockerfile`, `be/railway.toml`, `be/render.yaml`) are NOT deleted until Task 8 verification passes.
- Vercel function timeout (Hobby 10s) applies: dashboard/reports queries must stay fast; no WebSocket or persistent connections.
- The stale `fe/vercel.json` (old split-deploy config) is deleted in Task 8; the root `vercel.json` governs.
- Commit after every task with the exact message given.

---

### Task 1: Prisma dual-URL + env for Supabase

**Files:**
- Modify: `be/prisma/schema.prisma:5-8`
- Modify: `be/src/config/env.js`
- Modify: `be/.env.example`
- Test: `npx --prefix be prisma validate` (no new test file; existing jest suite must stay green)

**Interfaces:**
- Consumes: nothing new.
- Produces: `env.DIRECT_URL` (string) used by Prisma; `env.CLOUDINARY_CLOUD_NAME`, `env.CLOUDINARY_API_KEY`, `env.CLOUDINARY_API_SECRET` (strings, empty = unconfigured) used by Task 5.

- [ ] **Step 1: Update the datasource block in `be/prisma/schema.prisma`**

Replace lines 5-8 with:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- [ ] **Step 2: Run prisma validate to confirm the schema still parses**

Run: `npx --prefix be prisma validate`
Expected: `The schema at ... is valid`

- [ ] **Step 3: Extend `be/src/config/env.js` with the new variables**

Replace the schema object with:

```js
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/projectbln1'),
  DIRECT_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/projectbln1'),
  JWT_SECRET: z.string().default('dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
});
```

- [ ] **Step 4: Document the new variables in `be/.env.example`**

Append to the file:

```env
# Supabase: DIRECT_URL = port 5432 (migrations), DATABASE_URL = port 6543 pooler (runtime)
# e.g. DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
# e.g. DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/projectbln1
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

- [ ] **Step 5: Run the existing backend tests**

Run: `npm --prefix be test`
Expected: all suites PASS (no behavior changed yet)

- [ ] **Step 6: Commit**

```bash
git add be/prisma/schema.prisma be/src/config/env.js be/.env.example
git commit -m "feat(be): prisma directUrl + cloudinary env for supabase"
```

---

### Task 2: Supabase project + baseline migration

**Files:**
- Modify (only if needed): `be/prisma/migrations/` (squash fallback, see Step 4)
- Test: `npx --prefix be prisma migrate deploy` against Supabase exits 0

**Interfaces:**
- Consumes: `DIRECT_URL` from Task 1.
- Produces: live Supabase database with all tables; connection strings stored in deployment env (Vercel), never committed.

- [ ] **Step 1: Create the Supabase project (manual, dashboard)**

Create a new project at `https://supabase.com/dashboard`, region Singapore, and wait until it reports healthy. Then open Project Settings → Database and copy the Transaction pooler URL (port 6543) and the Direct connection URL (port 5432). Convert them to Prisma form by appending `?pgbouncer=true&connection_limit=1` to the pooler URL only.

- [ ] **Step 2: Set local shell variables (do NOT commit them)**

Run (PowerShell, replace with real values):

```powershell
$env:DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
$env:DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
```

- [ ] **Step 3: Attempt the baseline deploy**

Run: `npx --prefix be prisma migrate deploy`
Expected: `All migrations have been successfully applied.` If it fails on the `accounting.*` schema migration, continue to Step 4; otherwise skip to Step 5.

- [ ] **Step 4 (fallback only): squash the legacy `accounting` schema migration**

If Step 3 failed with `schema "accounting" does not exist`, delete the folder `be/prisma/migrations/20260911030049_init_multischema/` (the only migration referencing `"accounting".`), then run `npx --prefix be prisma migrate diff --from-empty --to-schema-datamodel be/prisma/schema.prisma --script > be/prisma/migrations/20260929_baseline/migration.sql` after creating the folder `be/prisma/migrations/20260929_baseline/`, then re-run Step 3. Supabase data is fresh so no data migration is needed.

- [ ] **Step 5: Verify tables exist**

Run: `npx --prefix be prisma db execute --stdin <<< "SELECT count(*) FROM business_profiles;"` with `DIRECT_URL` set (use `--url` flag if the CLI version requires it).
Expected: query returns `0` (empty table, no error).

- [ ] **Step 6: Commit (only if Step 4 created files)**

```bash
git add be/prisma/migrations
git commit -m "chore(db): supabase baseline migration"
```

---

### Task 3: Prisma singleton for serverless

**Files:**
- Modify: `be/src/config/database.js`
- Test: `be/tests/prisma-singleton.test.js` (new)

**Interfaces:**
- Consumes: `@prisma/client` (already a dependency).
- Produces: unchanged default export (`prisma` instance); all existing `require('../../config/database')` call sites keep working.

- [ ] **Step 1: Write the failing test**

Create `be/tests/prisma-singleton.test.js`:

```js
test('database module exports a single shared PrismaClient', () => {
  const a = require('../src/config/database');
  const b = require('../src/config/database');
  expect(a).toBe(b);
  expect(typeof a.businessProfile.findUnique).toBe('function');
});
```

- [ ] **Step 2: Run the test to verify it passes already (baseline)**

Run: `npx --prefix be jest tests/prisma-singleton.test.js --runInBand`
Expected: PASS (documents current behavior before the change).

- [ ] **Step 3: Implement the `globalThis` singleton**

Replace `be/src/config/database.js` with:

```js
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
```

- [ ] **Step 4: Run the full backend suite**

Run: `npm --prefix be test`
Expected: all suites PASS

- [ ] **Step 5: Commit**

```bash
git add be/src/config/database.js be/tests/prisma-singleton.test.js
git commit -m "feat(be): prisma singleton safe for serverless reuse"
```

---

### Task 4: Vercel monorepo entry (`api/index.js` + root `vercel.json`)

**Files:**
- Create: `api/index.js`
- Create: `vercel.json` (repo root)
- Modify: `package.json` (root, add `build` script)
- Test: `be/tests/vercel-entry.test.js` (new)

**Interfaces:**
- Consumes: default export of `be/src/app` (the Express app, no `listen` inside).
- Produces: serverless handler `api/index.js` serving all `/api/*` routes; Vercel build outputs FE to `fe/dist`.

- [ ] **Step 1: Write the failing test**

Create `be/tests/vercel-entry.test.js`:

```js
const request = require('supertest');

test('serverless entry serves the API health check', async () => {
  const handler = require('../../api/index');
  const res = await request(handler).get('/api/v1/health');
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx --prefix be jest tests/vercel-entry.test.js --runInBand`
Expected: FAIL with "Cannot find module '../../api/index'"

- [ ] **Step 3: Create `api/index.js`**

```js
const app = require('../be/src/app');

module.exports = app;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx --prefix be jest tests/vercel-entry.test.js --runInBand`
Expected: PASS

- [ ] **Step 5: Create root `vercel.json`**

```json
{
  "buildCommand": "npm --prefix be install && npx --prefix be prisma generate && npm --prefix fe install && npm --prefix fe run build",
  "outputDirectory": "fe/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 6: Add a matching root `build` script in `package.json`**

Add to root `scripts`: `"build": "npm --prefix be install && npx --prefix be prisma generate && npm --prefix fe install && npm --prefix fe run build"`.

- [ ] **Step 7: Run the full backend suite plus the FE build**

Run: `npm --prefix be test`
Expected: all suites PASS. Then run the FE build per repo docs and confirm it succeeds.

- [ ] **Step 8: Commit**

```bash
git add api/index.js vercel.json package.json be/tests/vercel-entry.test.js
git commit -m "feat: single-project vercel monorepo entry and rewrites"
```

---

### Task 5: Logo upload middleware + error mapping

**Files:**
- Modify: `be/package.json` (add `multer`, `cloudinary` deps)
- Create: `be/src/common/middlewares/uploadLogo.js`
- Modify: `be/src/common/middlewares/errorHandler.js`
- Test: `be/tests/upload-logo.test.js` (new)

**Interfaces:**
- Consumes: `ApiError` (existing), `multer` (new).
- Produces: `uploadLogo` middleware (`upload.single('logo')`, 2 MB limit, jpeg/png/webp only) used by Task 6 routes; `errorHandler` maps `MulterError` to status 400.

- [ ] **Step 1: Install the new dependencies**

Run: `npm --prefix be install multer cloudinary`
Expected: `be/package.json` gains both dependencies.

- [ ] **Step 2: Write the failing tests**

Create `be/tests/upload-logo.test.js`:

```js
jest.mock('../src/config/database', () => ({
  businessMember: { findFirst: jest.fn() },
  businessProfile: { update: jest.fn() },
}));
jest.mock('cloudinary', () => ({
  v2: { config: jest.fn(), uploader: { upload_stream: jest.fn(), destroy: jest.fn() } },
}));
const request = require('supertest');
const app = require('../src/app');

describe('logo upload validation', () => {
  it('rejects non-image files with 400', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ sub: '1', email: 'a@b.c' }, require('../src/config/env').JWT_SECRET);
    const res = await request(app)
      .post('/api/v1/businesses/1/logo')
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', Buffer.from('not-an-image'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx --prefix be jest tests/upload-logo.test.js --runInBand`
Expected: FAIL with 404 (route does not exist yet).

- [ ] **Step 4: Create `be/src/common/middlewares/uploadLogo.js`**

```js
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    return cb(new ApiError(400, 'Logo must be jpeg, png, or webp'));
  },
});

module.exports = upload.single('logo');
```

- [ ] **Step 5: Map `MulterError` to 400 in `errorHandler.js`**

In `be/src/common/middlewares/errorHandler.js`, insert before the `status` line:

```js
if (err && err.name === 'MulterError') {
  err.statusCode = 400;
  if (err.code === 'LIMIT_FILE_SIZE') err.message = 'Logo must not exceed 2 MB';
}
```

- [ ] **Step 6: Run the test (still 404 — route lands in Task 6)**

Run: `npx --prefix be jest tests/upload-logo.test.js --runInBand`
Expected: FAIL with 404. Keep the file; it turns green in Task 6. (If you prefer green now, skip this run and note it.)

- [ ] **Step 7: Commit**

```bash
git add be/package.json be/package-lock.json be/src/common/middlewares/uploadLogo.js be/src/common/middlewares/errorHandler.js be/tests/upload-logo.test.js
git commit -m "feat(be): logo upload middleware with 2MB image validation"
```

---

### Task 6: Cloudinary logo endpoints (BE)

**Files:**
- Create: `be/src/common/cloudinary.js`
- Modify: `be/prisma/schema.prisma` (add `logoUrl` to `BusinessProfile`)
- Create: `be/prisma/migrations/20260929_business_logo/migration.sql`
- Modify: `be/src/modules/businesses/businesses.service.js` (add `uploadLogo`, `deleteLogo`)
- Modify: `be/src/modules/businesses/businesses.controller.js` (add `uploadLogo`, `deleteLogo`)
- Modify: `be/src/modules/businesses/businesses.routes.js` (add 2 routes)
- Test: `be/tests/upload-logo.test.js` (extend), existing `be/tests/businesses.test.js` must stay green

**Interfaces:**
- Consumes: `uploadLogo` middleware (Task 5), `repo.updateById` (existing), `cloudinary` helper (this task).
- Produces: `POST /api/v1/businesses/:id/logo` → 200 `{ success: true, data: <updated business> }`; `DELETE /api/v1/businesses/:id/logo` → 200 with `logoUrl: null`. Both require membership; only `owner` role may change the logo (same rule as `update` in `businesses.service.js:74-81`).

- [ ] **Step 1: Create `be/src/common/cloudinary.js`**

```js
const cloudinary = require('cloudinary').v2;
const env = require('../config/env');

if (env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

module.exports = cloudinary;
```

- [ ] **Step 2: Add the `logoUrl` column to `BusinessProfile` in `schema.prisma`**

Insert after the `baseCurrency` line (line 78):

```prisma
logoUrl      String?  @map("logo_url") @db.Text
```

- [ ] **Step 3: Create the hand-written migration**

Create folder `be/prisma/migrations/20260929_business_logo/` with `migration.sql`:

```sql
ALTER TABLE "business_profiles" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
```

Then run `npx --prefix be prisma validate` (must print valid) and apply to Supabase with `DIRECT_URL` set via `npx --prefix be prisma migrate deploy`.

- [ ] **Step 4: Add service functions in `businesses.service.js`**

Append (requires at top: `const cloudinary = require('../../common/cloudinary');` and `const ApiError = require('../../common/utils/ApiError');` — replace the inline `require(...)` usages in the new functions only; do not refactor existing functions):

```js
function uploadBufferToCloudinary(buffer, businessId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'akuntansi/logos', public_id: `business-${businessId}`, overwrite: true, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

async function assertOwner(userId, businessId) {
  const db = require('../../config/database');
  const existing = await repo.findById(businessId);
  if (!existing) throw new ApiError(404, 'Business not found');
  const member = await db.businessMember.findFirst({ where: { businessId: Number(businessId), userId } });
  if (!member) throw new ApiError(403, 'Not a member of this business');
  if (member.role !== 'owner') throw new ApiError(403, 'Only owner can change business logo');
  return existing;
}

async function uploadLogo(userId, businessId, file) {
  if (!file) throw new ApiError(400, 'Logo file is required');
  if (!require('../../config/env').CLOUDINARY_CLOUD_NAME) throw new ApiError(503, 'Logo upload is not configured');
  await assertOwner(userId, businessId);
  let result;
  try {
    result = await uploadBufferToCloudinary(file.buffer, businessId);
  } catch {
    throw new ApiError(502, 'Logo upload failed');
  }
  return repo.updateById(businessId, { logoUrl: result.secure_url });
}

async function deleteLogo(userId, businessId) {
  await assertOwner(userId, businessId);
  try {
    await cloudinary.uploader.destroy(`akuntansi/logos/business-${businessId}`);
  } catch {
    // asset already gone — still clear the column
  }
  return repo.updateById(businessId, { logoUrl: null });
}
```

Export both new functions alongside the existing ones.

- [ ] **Step 5: Add controller functions in `businesses.controller.js`**

```js
async function uploadLogo(req, res) {
  const data = await service.uploadLogo(req.user.id, req.params.id, req.file);
  return success(res, data, 'Business logo updated');
}

async function deleteLogo(req, res) {
  const data = await service.deleteLogo(req.user.id, req.params.id);
  return success(res, data, 'Business logo removed');
}
```

Add both to `module.exports`.

- [ ] **Step 6: Wire the routes in `businesses.routes.js`**

Add the require: `const uploadLogoFile = require('../../common/middlewares/uploadLogo');` then:

```js
router.post('/:id/logo', auth, uploadLogoFile, asyncHandler(c.uploadLogo));
router.delete('/:id/logo', auth, asyncHandler(c.deleteLogo));
```

- [ ] **Step 7: Extend `be/tests/upload-logo.test.js` with the happy path**

Append a test that mocks `businessMember.findFirst` to `{ role: 'owner' }`, `businessProfile.update` to echo data, and `upload_stream` to call back `{ secure_url: 'https://res.cloudinary.com/x/logo.png' }`, then posts a 1x1 PNG buffer and expects 200 plus `data.logoUrl` set. (Mirror the existing 400 test structure; sign the JWT the same way.)

- [ ] **Step 8: Run the logo tests plus the full suite**

Run: `npx --prefix be jest tests/upload-logo.test.js --runInBand`
Expected: PASS. Then run: `npm --prefix be test`
Expected: all suites PASS

- [ ] **Step 9: Commit**

```bash
git add be/src/common/cloudinary.js be/prisma/schema.prisma be/prisma/migrations/20260929_business_logo be/src/modules/businesses be/tests/upload-logo.test.js
git commit -m "feat(be): cloudinary business logo upload and remove"
```

---

### Task 7: FE logo UI (type + context + picker card)

**Files:**
- Modify: `fe/src/hooks/useBusiness.tsx` (type `logoUrl`, context fns `uploadBusinessLogo`, `deleteBusinessLogo`)
- Modify: `fe/src/App.tsx` (logo preview + file input in the business picker card, ~lines 190-228)
- Test: FE build (`tsc -b && vite build`) must succeed; manual check in Task 8

**Interfaces:**
- Consumes: `POST /businesses/:id/logo` and `DELETE /businesses/:id/logo` from Task 6 (via shared `api` axios instance).
- Produces: `business.logoUrl` available everywhere `useBusiness()` is used; picker card shows logo with upload/remove controls.

- [ ] **Step 1: Extend the `Business` interface and context value**

In `fe/src/hooks/useBusiness.tsx`, add `logoUrl?: string | null;` to the `Business` interface (after `baseCurrency`), add to the context interface:

```ts
uploadBusinessLogo: (businessId: number, file: File) => Promise<Business>;
deleteBusinessLogo: (businessId: number) => Promise<Business>;
```

- [ ] **Step 2: Implement the two mutations (place after `updateBusiness`, before the `business` memo)**

```ts
const uploadBusinessLogo = useCallback(
  async (businessId: number, file: File) => {
    const form = new FormData();
    form.append("logo", file);
    const res = await api.post(`/businesses/${businessId}/logo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    qc.invalidateQueries({ queryKey: ["businesses"] });
    return res.data?.data;
  },
  [qc]
);

const deleteBusinessLogo = useCallback(
  async (businessId: number) => {
    const res = await api.delete(`/businesses/${businessId}/logo`);
    qc.invalidateQueries({ queryKey: ["businesses"] });
    return res.data?.data;
  },
  [qc]
);
```

Add both to the context `value` object.

- [ ] **Step 3: Add logo UI to the business picker card in `fe/src/App.tsx`**

In the `businesses.map` block, render `{b.logoUrl ? <img src={b.logoUrl} alt="" width={28} height={28} /> : null}` before the business name inside the select button. Below the create-business form, add a file input that calls `uploadBusinessLogo(businessId, file)` for the currently selected business with `accept="image/jpeg,image/png,image/webp"`, plus a remove button calling `deleteBusinessLogo`. Show upload errors with the existing `showToast(getApiErrorMessage(e), "err")` pattern.

- [ ] **Step 4: Run the FE build**

Run the FE build per repo docs (`npm --prefix fe run build`).
Expected: `tsc -b && vite build` succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add fe/src/hooks/useBusiness.tsx fe/src/App.tsx
git commit -m "feat(fe): business logo upload and preview"
```

---

### Task 8: Deploy verification, Railway cleanup, docs

**Files:**
- Modify: Vercel project settings (dashboard, not committed): env vars + build settings
- Delete (only after verification): `be/Dockerfile`, `be/railway.toml`, `be/render.yaml`
- Modify: `README-DEPLOY.md`, root `.gitignore` (remove duplicate `dist` line, keep `fe/dist/`)
- Test: live checklist below — all items must pass before any deletion

**Interfaces:**
- Consumes: everything from Tasks 1-7.
- Produces: production URL serving FE + API; repo cleaned of Railway artifacts.

- [ ] **Step 1: Configure the Vercel project (manual, dashboard)**

Create one Vercel project from this repo (no Root Directory override — the root `vercel.json` governs). Set env vars for Production: `DATABASE_URL` (Supabase pooler, port 6543 with pgbouncer flags), `DIRECT_URL` (Supabase direct, port 5432), `JWT_SECRET` (fresh, min 32 chars), `JWT_EXPIRES_IN=1d`, `CORS_ORIGIN=https://<project>.vercel.app`, `NODE_ENV=production`, `LOG_LEVEL=info`, plus the three `CLOUDINARY_*` values, plus `VITE_API_URL=/api/v1` (relative same-origin URL so the FE build calls the colocated API). Deploy.

- [ ] **Step 2: Run the live verification checklist (deletion gate)**

All must pass: `GET https://<project>.vercel.app/api/v1/health` returns `{ success: true }`; login works; business list/create works; logo upload + remove works and the logo renders in the FE; one product CRUD round-trip works; logo survives a fresh login (persistence via Supabase + Cloudinary URL).

- [ ] **Step 3: Delete the Railway artifacts and stale FE config (only if Step 2 fully passed)**

Run: `git rm be/Dockerfile be/railway.toml be/render.yaml fe/vercel.json`
Expected: files staged for deletion. If Step 2 did not fully pass, stop here and keep the fallback.

- [ ] **Step 4: Rewrite `README-DEPLOY.md` for the new topology**

Replace Railway instructions with: single Vercel project, required env vars table (the 10 vars from Step 1), Supabase migrate/pooler notes, Cloudinary setup notes, and the rollback note (Vercel env `VITE_API_URL` is same-origin; no separate FE project needed).

- [ ] **Step 5: Tidy root `.gitignore`**

Remove the bare `dist` line (line 2), keeping `fe/dist/`. Verify `git check-ignore fe/dist/index.html` still reports ignored.

- [ ] **Step 6: Final full verification**

Run: `npm --prefix be test` (all PASS) and the FE build (succeeds). Confirm `git status` shows only intended files.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(deploy): single vercel project live, remove railway artifacts"
```
