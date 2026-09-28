# projectBLN1 — API Akuntansi UMKM (Express + Prisma)

Sistem akuntansi multi-tenant: Auth JWT + Business isolation (`X-Business-Id`), COA/Tax/CashBank, Product/Customer/Supplier, Sales & Purchase full auto (stock + journal + stock movement), Receipt/Payment, Transfer antar Kas, Journals, Fixed Asset + Depreciation, Dashboard & 9 Reports. Sinkron dengan `prisma/schema.prisma:1` (18 tabel, `@@unique [businessId, code/no]`) , `prisma/dbdiagram.dbml:1` dan `docs/flowchart/flowchart.md:1` (19 diagram, update 2026-09-16).

## Stack

Express 4.x, PostgreSQL + Prisma, JWT (`jsonwebtoken`), Zod, Winston, `express-rate-limit`, `helmet`, `cors`, Jest + Supertest, ESLint + Prettier.

## Fitur Utama (sinkron 2026-09-16)

- **Multi-tenant + RBAC:** `auth` (`src/common/middlewares/auth.js:1`) → `requireBusiness` (`src/common/middlewares/requireBusiness.js:1` cek `BusinessMember`) → `authorizeRoles` (`owner|kasir|akuntan`). Semua query scoped `where:{businessId}`.
- **Pagination 10/page (semua list):** `src/common/utils/pagination.js:1` `parsePagination(query)` default `page 1 limit 10 max 100` + `buildMeta` → response `{success, message, data, meta:{page,limit,total,totalPages}}`. Berlaku untuk `businesses`, `users`, `products`, `customers`, `suppliers`, `taxes`, `chart-of-accounts`, `cash-bank-accounts`, `journals`, `sales-invoices`, `purchase-invoices`, `receipts`, `purchase-payments`, `stock-movements`, `fixed-assets`, `asset-depreciations`, `cash-bank-transfers` (history), dan reports `sales/purchase/stock/fixed-assets` (`src/modules/reports/reports.service.js:65` + `src/modules/reports/reports.repository.js:81`).
- **Penomoran fleksibel (prefix client):** `invoiceNo`/`receiptNo`/`paymentNo` bisa manual `1-50 char` atau auto via `prefix` client `1-20 char` (`src/modules/sales-invoices/sales-invoices.validation.js:5` `invoiceNo|prefix` + refine). Sistem generate `{prefix}{001}` urut global per `businessId` per `prefix` per tabel (`src/common/utils/numbering.js:1` `getNextNoTx` cari `MAX(prefix+angka)` + `padStart(3,'0')`). Default `SI` (sales), `PB` (purchase), `RC` (receipt), `PP` (payment). `journalNo` tetap auto `JU-SALES-*`, `JU-PURCHASE-*`, `JU-RECEIPT-*`, `JU-PAYMENT-*`, `JU-MANUAL-*`, `JU-TRF-*`, `JU-DEP-*` (`src/modules/sales-invoices/sales-invoices.service.js:96` etc).
- **Transfer Kas:** `POST /cash-bank-transfers` + riwayat `GET /cash-bank-transfers?page=1&limit=10` filter `journalNo startsWith JU-TRF-` (`src/modules/cash-bank-transfers/cash-bank-transfers.repository.js:4`).
- **Reports:** `profit-loss`, `balance-sheet`, `cash-flow` (agregat) + `sales`, `purchase`, `stock`, `fixed-assets`, `ar`, `ap` (list paginated + `meta`).

## Struktur

```text
src/
  app.js, server.js
  config/{env.js, database.js}
  common/
    logger.js
    middlewares/{asyncHandler, notFound, errorHandler, validate, auth, requireBusiness, authorizeRoles, rateLimiter}
    utils/{ApiError, ApiResponse, pagination, numbering}
  modules/
    health/              GET /api/v1/health (publik)
    auth/                POST /api/v1/auth/register|login (publik), GET /api/v1/auth/me (Bearer)
    users/               GET /api/v1/users?page&limit (Bearer, paginated) 
    businesses/          POST /api/v1/businesses, GET /api/v1/businesses?page&limit (Bearer, paginated 10)
    chart-of-accounts/   CRUD ?page&limit
    taxes/               CRUD ?page&limit
    cash-bank-accounts/  CRUD ?page&limit
    cash-bank-transfers/ POST / (transfer), GET /?page&limit (riwayat JU-TRF-)
    products/            CRUD ?page&limit, stock
    customers/           CRUD ?page&limit
    suppliers/           CRUD ?page&limit
    sales-invoices/      POST {prefix|invoiceNo, lines}, GET ?page&limit
    purchase-invoices/   POST {prefix|invoiceNo, lines}, GET ?page&limit
    receipts/            POST {prefix|receiptNo}, GET ?page&limit
    purchase-payments/   POST {prefix|paymentNo}, GET ?page&limit
    stock-movements/     GET ?page&limit
    journals/            GET ?page&limit, POST manual
    fixed-assets/        CRUD ?page&limit
    asset-depreciations/ GET ?page&limit
    dashboard/           GET /dashboard?from&to (agregat omzet/revenue/expense/profit)
    reports/             GET /reports/{profit-loss,balance-sheet,cash-flow,sales,purchase,stock,ar,ap,fixed-assets}?from&to&page&limit
prisma/
  schema.prisma          18 tabel + 5 enum (UserRole, AccountType, JournalStatus, InvoiceStatus, PaymentMethod)
  dbdiagram.dbml         sinkron schema.prisma 2026-09-16 + catatan pagination & prefix
docs/flowchart/flowchart.md  19 mermaid sinkron pagination & prefix auto
```

## Endpoint Ringkas

Semua butuh `Authorization: Bearer <JWT>` + `X-Business-Id: <id>` kecuali `health` & `auth/register|login`.

| Modul | Method & Path | Pagination | Penomoran |
|-------|---------------|------------|-----------|
| Auth | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | - | - |
| Businesses | `POST /api/v1/businesses`, `GET /api/v1/businesses?page=1&limit=10`, `GET /:id`, `PATCH /:id` | 10/page | - |
| Sales | `POST /api/v1/sales-invoices` body `{prefix:"SI"\|invoiceNo:"SI001", invoiceDate, lines}`, `GET /api/v1/sales-invoices?page&limit&search&status` | 10/page | `invoiceNo` manual atau `prefix`→`SI001` |
| Purchase | `POST /api/v1/purchase-invoices` `{prefix:"PB"\|invoiceNo}`, `GET /api/v1/purchase-invoices?page&limit` | 10/page | `PB001` |
| Receipt | `POST /api/v1/receipts` `{prefix:"RC"\|receiptNo}`, `GET /api/v1/receipts?page&limit` | 10/page | `RC001` |
| Payment | `POST /api/v1/purchase-payments` `{prefix:"PP"\|paymentNo}`, `GET /api/v1/purchase-payments?page&limit` | 10/page | `PP001` |
| Transfer | `POST /api/v1/cash-bank-transfers`, `GET /api/v1/cash-bank-transfers?page&limit&search&from&to` | 10/page | `JU-TRF-*` auto |
| Journals | `GET /api/v1/journals?page&limit&status&search&from&to`, `POST /api/v1/journals` manual | 10/page | `JU-*` auto |
| Reports | `GET /api/v1/reports/sales?page&limit&from&to`, `.../purchase`, `.../stock`, `.../fixed-assets` (+ `profit-loss`, `balance-sheet`, `cash-flow`, `ar`, `ap`) | 10/page untuk `sales/purchase/stock/fixed-assets` | - |
| Lain | `products`, `customers`, `suppliers`, `cash-bank-accounts`, `chart-of-accounts`, `taxes`, `stock-movements`, `fixed-assets` | semua `?page&limit` 10/page | - |

Contoh auto prefix:
```bash
POST /api/v1/sales-invoices
{ "prefix": "SI", "invoiceDate": "2025-09-16", "lines": [{"productId":1,"quantity":2,"unitPrice":10000}] }
→ { "invoiceNo": "SI001" }
# transaksi berikutnya dengan prefix "SI" di business yang sama → SI002
# bisa juga beda prefix: { "prefix": "INV" } → INV001
# atau tetap manual: { "invoiceNo": "CUSTOM-123" }
```

Pencarian & filter: `?search=SI001` / `?q=keyword` (contains insensitive di `invoiceNo`/`journalNo`/`receiptNo`/`paymentNo`), `?status=posted&from=2025-01-01&to=2025-12-31`, `?page=2&limit=10` → response `meta:{page,limit,total,totalPages}`.

## Run

1. Install: `npm.cmd install` (Windows: pakai `npm.cmd`, karena `npm.ps1` sering diblokir ExecutionPolicy)
2. `cp .env.example .env` lalu sesuaikan `DATABASE_URL` dan `JWT_SECRET` (`JWT_EXPIRES_IN`, `PORT`, `LOG_LEVEL`, `CORS_ORIGIN` optional)
3. `npx prisma generate` (sekali setelah install)
4. `npx prisma migrate dev` (butuh PostgreSQL lokal; bila belum ada, API tetap jalan untuk endpoint non-DB)
5. `npm run dev` → http://localhost:3000 — health di `/api/v1/health`, legacy `GET /` tetap ada

## Test & Quality

- `npm test` — Jest + Supertest (mock repository; 4 suites 8 tests) — `cross-env NODE_ENV=test jest --runInBand`
- `npx prisma validate` — validasi schema
- `npm run lint` / `npm run format` — ESLint + Prettier (sudah PASS)

## Response envelope

Sukses: `{ success: true, message, data, meta? }` — `meta` ada untuk semua GET list (`page,limit,total,totalPages`). Error: `{ success: false, message, details? }`.
Route tak dikenal → 404, validasi gagal → 400 (`Validation failed`), token hilang/kadaluarsa → 401, bukan member business → 403, `businessId+code/no` duplikat → 409 (`P2002`), stock tidak cukup → 400, journal tidak balance → 400.

## Dokumen

- `prisma/dbdiagram.dbml` — diagram DB 18 tabel sinkron `schema.prisma`
- `docs/flowchart/flowchart.md` — 19 flowchart Mermaid (auth, penjualan auto prefix, pembelian, kas transfer history, reports paginated, dll)
- `docs/superpowers/specs/2026-09-12-akuntansi-umkm-api-design.md` — spec asli + addendum 2026-09-16 (pagination & prefix)
