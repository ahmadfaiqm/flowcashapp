# Design Spec: API Akuntansi UMKM — Full Flowchart (19 Modul)

- Date: 2026-09-12
- Status: Approved (5 sections reviewed, Approach 1 chosen)
- Scope: Fase 1 — Auth+Bisnis multi-tenant + COA/Tax/CashBank + Product/Customer/Supplier + Sales & Purchase full auto (stock+journal) + Receipt/Payment + Stock adjustment + Journals read + Dashboard/Reports sederhana. Fixed Assets & 9 laporan lengkap di Fase 2.
- Stack: Express 4.x, PostgreSQL + Prisma (Int PK), JWT, Zod, Winston, Jest+Supertest
- Sources: `docs/flowchart/flowchart.md:1-521` (19 mermaid), `prisma/dbdiagram.dbml:1-435` (18 tabel + 5 enum, Int increment), `prisma/schema.prisma:1-486` (sudah sync 2026-09-12), `docs/superpowers/specs/2026-09-09-express-boilerplate-design.md:1-131` (Feature Modules)

## 1. Context

Repo sudah boilerplate Feature Modules (`src/app.js:1-38`, `src/common/middlewares/auth.js:1-16`) + Prisma sync Int + `business_members` (`schema.prisma:93-107`). Flowchart mensyaratkan `REGISTER → BUSINESS → DASHBOARD → PENJUALAN/PEMBELIAN/STOK → RECEIPT/PAYMENT → JOURNAL → REPORTS` dengan isolasi `business_id` (#16) dan RBAC. Tujuan: bangun API yang 1:1 dengan flowchart & DBML, tanpa breaking boilerplate (envelope `{success,message,data,meta}` dipertahankan).

Keputusan yang sudah di-lock via brainstorming:
- **B: 2-langkah onboarding** — `POST /auth/register` hanya User, `POST /businesses` baru buat BusinessProfile+Member(owner)+seed COA.
- **A: X-Business-Id header** — `requireBusiness` cek `BusinessMember(userId,businessId)` per-request.
- **RBAC: owner=full, kasir=sales/purchase/stock, akuntan=journals/reports** — `authorizeRoles`.
- **A: Full auto** — sales/purchase create otomatis: hitung total, cek stock, update stock, create stock_movement, create journal+lines (debit==credit), update paidAmount/status.

## 2. Architecture (dipilih: Pendekatan 1 — Feature Modules + Shared Transaction)

```
src/
  app.js                         # helmet→cors→morgan→winston→rateLimiter(/api)→json→cookie→routes→notFound→errorHandler
  config/{env.js, database.js}
  common/
    middlewares/auth.js          # JWT Bearer → req.user {id,email}
    middlewares/requireBusiness.js (NEW) # X-Business-Id → BusinessMember → req.businessId, req.memberRole
    middlewares/authorizeRoles.js (NEW)  # (...roles) → 403 jika role tidak allowed
    middlewares/{validate, asyncHandler, notFound, errorHandler, rateLimiter}
    utils/{ApiError, ApiResponse, pagination}
  modules/
    auth/                        # refactor Int IDs, tetap register/login/me
    businesses/                  # POST /businesses, GET /, GET /:id, PATCH /:id, DELETE /:id
    chart-of-accounts/           # CRUD, hierarchy parentId, code unique per business
    taxes/                       # CRUD per businessId
    cash-bank-accounts/          # CRUD, coaId unique
    products/                    # CRUD, sku unique per business, stock/minimumStock
    customers/ suppliers/        # CRUD per businessId
    sales-invoices/ sales-invoice-lines/ receipts/
    purchase-invoices/ purchase-invoice-lines/ purchase-payments/
    stock-movements/             # GET + POST adjustment
    journals/ journal-lines/     # GET, POST manual (akuntan)
    reports/ dashboard/          # agregasi sederhana Fase 1
prisma/schema.prisma             # 18 tabel, semua tenant punya businessId FK
```

YAGNI: tanpa Redis/queue/event bus, tanpa upload file, tanpa multi-DB, tanpa Docker/CI di Fase 1. `public/` tetap diserve statis.

Alasan pilih 1 atas 2/3: sesuai `2026-09-09-express-boilerplate-design.md:19-58` Feature Modules, transaksi tetap di service (prisma.$transaction) jadi ACID tanpa orchestrator/event complexity.

## 3. Data Flow

1. **Auth:** `POST /auth/register {name,email,password}` → `bcrypt hash` → `prisma.user.create` → 201 `{user, token: jwt.sign({email}, sub:user.id)}`. `POST /auth/login` similar 200.
2. **Business:** `POST /businesses` `auth, validate(businessSchema {businessName, address, phone, taxId})` → `prisma.$transaction([businessProfile.create, businessMember.create owner, chartOfAccount.createMany seed 15-20 default])` → 201 `{business, member, seededCoA:count}`.
3. **Tenant request:** `Authorization: Bearer <token>` + `X-Business-Id: 1` → `auth` → `requireBusiness` → `authorizeRoles` → `validate(zod)` → `controller` → `service.$transaction` → `repository(prisma tx)` → `ApiResponse.success`.
4. **Sales (full auto):** `POST /sales-invoices {customerId, invoiceNo, invoiceDate, dueDate, lines:[{productId,quantity,unitPrice}], discountAmount, taxAmount}` → hitung `subtotal/tax/total` → cek `product.stock >= qty` (per businessId) → `salesInvoice.create + lines.createMany` → `product.update stock-=qty` → `stockMovement.create movementType:'out'` → `journal.create + journalLine.createMany [debit AR total, credit Sales, credit Tax, debit COGS/credit Inventory]` → validasi `debit==credit` else rollback 400. Receipt: `POST /receipts {salesInvoiceId, amount, paymentMethod, cashBankAccountId}` → `receipt.create + salesInvoice.update paidAmount/status + journal debit Cash credit AR`.
5. **Purchase mirror:** stock `+qty`, `movementType:'in'`, journal `debit Inventory credit AP`.
6. **Error:** throw `ApiError` → `asyncHandler` → `errorHandler` → `{success:false, message, details?, stack? (dev)}`.

## 4. RBAC & Business Isolation

- `requireBusiness` (`src/common/middlewares/requireBusiness.js`): parse `X-Business-Id`, `findFirst businessMember where businessId+userId`, 400 jika header hilang, 403 jika bukan member, set `req.businessId` + `req.memberRole`.
- `authorizeRoles(...allowed)` (`src/common/middlewares/authorizeRoles.js`): jika `!allowed.includes(req.memberRole)` → `ApiError(403)`.
- **Mapping:**
  - `owner`: semua endpoints
  - `kasir`: `authorizeRoles('owner','kasir')` → `products, customers, suppliers, sales-invoices, purchase-invoices, receipts, purchase-payments, stock-movements`
  - `akuntan`: `authorizeRoles('owner','akuntan')` → `chart-of-accounts, taxes, cash-bank-accounts, journals, fixed-assets, asset-depreciations, reports, dashboard`
  - `owner`-only: `DELETE /businesses/:id`, `POST /chart-of-accounts` (optional ketat)

Semua `where:{businessId:req.businessId}` + `@@unique([businessId, code/sku/no])` di schema → isolasi DB-level, tidak bisa tebak id cross-business.

## 5. Validation & Error Handling

- Zod per modul `*.validation.js`: `businessName min 2`, `sku min1 max50`, `quantity positive`, `invoiceNo max50`, `lines min1`, `paymentMethod enum cash/bank_transfer/e_wallet/other`, `accountType enum Asset/Liability/Equity/Revenue/Expense`, dll. Gagal → 400 `{success:false, message:'Validation failed', details:flatten}`.
- Prisma: `P2002` unique per-business → `ApiError(409, 'Code/SKU/no already exists in this business')`; `P2025` not found → 404; `stock < qty` → 400 `Stock tidak cukup`; `debit!=credit` → 400 `Journal tidak balance`.
- `notFound` 404 untuk route tak dikenal, `errorHandler` bedakan 4xx vs 5xx, log 5xx via winston, sembunyikan stack di prod.

## 6. Config & Env

`.env.example` sudah ada `DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, PORT, LOG_LEVEL, CORS_ORIGIN, RATE_LIMIT_*`. Tidak tambah env di Fase 1. `src/config/env.js:1-16` tetap zod parse.

## 7. Dependencies

Tidak tambah runtime baru di Fase 1 (pakai `bcryptjs, jsonwebtoken, zod, prisma` yang sudah ada). Jika butuh helper `decimal.js` untuk presisi Decimal(18,2/3), tambah `decimal.js` di Fase 1 Task 0.

## 8. Testing

- **Unit (mock repo):** tiap `service` test dengan `jest.mock('../*repository')`, test `requireBusiness` mock `prisma.businessMember.findFirst`, `authorizeRoles` 403, `validate` 400, `P2002` 409, stock insufficient 400, journal imbalance 400.
- **Integrasi (DB nyata `db_appguweh`):** seed `User+Business+COA` via `businesses.service.create`, lalu `POST /sales-invoices` cek `product.stock` berkurang, `stock_movement` ada, `journal` + `journal_lines` balance, `receipt` update `paidAmount/status`. `kasir` tidak bisa `POST /journals` (403), tanpa `X-Business-Id` 400.
- **Commands:** `npx prisma validate` ✅, `npm test` hijau, `npm run lint` bersih, manual `node src/server.js` cek `GET /` dan `/api/v1/health` tetap OK.

## 9. Migration Plan

Fase 1 dipecah per modul (TDD: failing test → implement → pass → commit):
1. **Task 0:** `requireBusiness + authorizeRoles` + refactor `auth` Int IDs + `businesses` + seed COA
2. **Task 1:** `chart-of-accounts, taxes, cash-bank-accounts`
3. **Task 2:** `products, customers, suppliers, stock-movements`
4. **Task 3:** `sales-invoices(+lines) + receipts` full auto (prisma.$transaction + journal)
5. **Task 4:** `purchase-invoices(+lines) + purchase-payments` full auto
6. **Task 5:** `journals (GET/POST manual), dashboard (omzet/revenue/expense/profit), reports (profit-loss/stock/AR/AP sederhana)`
Setiap task mount `app.js` → `npx jest --runInBand` → commit.

## 10. Acceptance Criteria

- `POST /auth/register` → 201 User Int, `POST /businesses` → 201 Business+Member owner + 15-20 COA seeded, `GET /businesses` list milik user.
- Tanpa `X-Business-Id` → 400, bukan member → 403, `kasir` POST `/journals` → 403, `akuntan` POST `/sales-invoices` → 403, owner bisa semua.
- `POST /sales-invoices` dengan `lines` → 201, `products.stock` berkurang, `stock_movements` `out` ada, `journals` + `lines` debit==credit, `GET /sales-invoices?businessId=1` tidak bocor business lain.
- `POST /receipts` update `paidAmount/status` + journal Cash→AR.
- `POST /purchase-invoices` stock bertambah + journal Inventory→AP.
- Pagination `?page&limit` meta `{page,limit,total,totalPages}` di semua GET list, invalid body → 400, duplikat code/sku/no per business → 409.
- `npx prisma validate` lolos, `npm test` hijau, `GET /` legacy tetap `{status:'success', message:'Welcome to my awsome project REST API', docs, author}`.

## 11. Non-Goals (Fase 2) — UPDATE 2026-09-16: Fase 2 sudah selesai di kode, spec ini jadi historis

Sebelumnya Non-Goals Fase 2 kini **sudah implemented**: `fixed-assets + asset-depreciations` (`src/modules/fixed-assets/*`, `src/modules/asset-depreciations/*`), 9 laporan lengkap (`balance-sheet`, `cash-flow`, `fixed-asset report` di `src/modules/reports/*:131,149,170`), transfer antar kas `POST /cash-bank-transfers` + riwayat `GET /cash-bank-transfers?page&limit` (`src/modules/cash-bank-transfers/cash-bank-transfers.service.js:33`), dashboard `omzet/revenue/expense/profit` lengkap (`src/modules/dashboard/dashboard.service.js:1`). Tetap Non-Goals: file upload, Redis/queue, frontend.

## 12. Addendum 2026-09-16 — Pagination & Penomoran Prefix Auto (sinkron flowchart/dbdiagram terbaru)

- **Pagination:** Semua GET list sekarang paginated via `src/common/utils/pagination.js:1` `parsePagination` default `page 1 limit 10 max 100` → `meta:{page,limit,total,totalPages}`. Termasuk `businesses` (`src/modules/businesses/businesses.service.js:19` `listByUser` + `findByUserIdPaginated`), `reports` (`sales/purchase/stock/fixed-assets` di `src/modules/reports/reports.service.js:65` + `src/modules/reports/reports.repository.js:81` `salesList(skip,take)` + `salesCount`), dan transfer history `GET /cash-bank-transfers` (`src/modules/cash-bank-transfers/cash-bank-transfers.repository.js:4` filter `journalNo startsWith JU-TRF-`).
- **Penomoran prefix client:** `invoiceNo`/`receiptNo`/`paymentNo` di `*.validation.js` kini optional + `prefix` optional `1-20 char` + refine `invoiceNo||prefix` (`src/modules/sales-invoices/sales-invoices.validation.js:5`). Service `create` jika `!invoiceNo` → `prefix||default` (`SI`/`PB`/`RC`/`PP`) → `getNextNoTx(tx, model, field, businessId, prefix)` (`src/common/utils/numbering.js:1` cari `MAX(prefix+angka)` per `businessId` + `padStart(3,'0')` → `{prefix}{001}` urut global per business per prefix per tabel). Manual `invoiceNo` tetap didukung (backward compat) dan tetap `@@unique([businessId, no])`. `journalNo` tetap auto `JU-SALES-*` etc.
- **Flowchart/DBML sinkron:** `docs/flowchart/flowchart.md:1` & `prisma/dbdiagram.dbml:1` sudah patch 2026-09-16 untuk 2 fitur ini + `README.md:1` rewrite.

---

## Spec Self-Review

1. Placeholder scan: tidak ada TBD/TODO, semua enum/field persis `dbdiagram.dbml`, semua route & role eksplisit.
2. Konsistensi: `businessId` FK di 14 tabel + `X-Business-Id` header + `requireBusiness` → konsisten dengan `schema.prisma:112,135,152,189,211,235,257,278,325,351,371,418,446,468`; `UserRole` owner/kasir/akuntan konsisten; `InvoiceStatus/PaymentMethod` match DBML.
3. Scope: Fase 1 satu rencana implementasi, Fase 2 tidak dicampur.
4. Ambiguitas: `X-Business-Id` dipilih atas JWT claim (B + A), RBAC per-modul eksplisit, full auto transaction sudah detail ACID vs eventual.
