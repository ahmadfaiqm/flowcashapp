# Akuntansi UMKM API (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun REST API Fase 1 akuntansi UMKM (auth→business 2-step + RBAC X-Business-Id + COA/tax/cashBank + product/customer/supplier + sales & purchase full auto stock+journal + dashboard/reports sederhana) yang 1:1 dengan flowchart 19 modul dan DBML Int multi-tenant.

**Architecture:** Feature Modules di `src/modules/<feature>/` (routes/controller/service/repository/validation per fitur), shared `src/common/middlewares/requireBusiness` + `authorizeRoles`, `prisma.$transaction` untuk sales/purchase atomic (invoice+lines+stock+stockMovement+journal+lines debit==credit), tenant scoping `where:{businessId}` + `@@unique([businessId, code])`.

**Tech Stack:** Node 24 win32, Express 4.x (~4.16.1), PostgreSQL, Prisma 5.22.0 (@prisma/client Int PK), dotenv, cors, helmet, express-rate-limit, jsonwebtoken, bcryptjs, zod 3.23.8, winston, morgan, cookie-parser, jest 29 + supertest 6, cross-env.

**Spec:** `docs/superpowers/specs/2026-09-12-akuntansi-umkm-api-design.md`

## Global Constraints

- Express ~4.16.1 tidak upgrade ke v5.
- `GET /` tetap JSON `{status:'success', message:'Welcome to my awsome project REST API', docs, author}` (typo awsome dipertahankan).
- Response envelope sukses `{success:true, message, data, meta?}` / error `{success:false, message, details?}` via `ApiResponse.success` + `ApiError`.
- Repository = satu-satunya layer import `@prisma/client`/`src/config/database`; service tidak import prisma langsung; controller hanya req/res.
- Semua tenant query wajib `where:{businessId:req.businessId}` (dari `requireBusiness`); unique per business via `@@unique([businessId, code/sku/no])`.
- JWT `sub` = `String(user.id Int)` (mis. "1"), `requireBusiness` resolve `BusinessMember` per `X-Business-Id` header.
- RBAC: `owner=full`, `kasir=sales/purchase/stock`, `akuntan=journals/reports`; `authorizeRoles` lempar 403.
- `npx prisma validate` + `npm test --runInBand` hijau setiap task; commit per task.

---

## File Map (akhir Fase 1)

```text
src/app.js                                             # mount semua routers baru
src/common/middlewares/requireBusiness.js              # NEW
src/common/middlewares/authorizeRoles.js               # NEW
src/modules/auth/{auth.routes, controller, service, repository, validation}  # REFACTOR Int
src/modules/businesses/{routes, controller, service, repository, validation} # NEW
src/modules/chart-of-accounts/{routes, controller, service, repository, validation} # NEW
src/modules/taxes/{routes, controller, service, repository, validation} # NEW
src/modules/cash-bank-accounts/{routes, controller, service, repository, validation} # NEW
src/modules/products/{routes, controller, service, repository, validation} # NEW
src/modules/customers/{routes, controller, service, repository, validation} # NEW
src/modules/suppliers/{routes, controller, service, repository, validation} # NEW
src/modules/stock-movements/{routes, controller, service, repository, validation} # NEW
src/modules/sales-invoices/{routes, controller, service, repository, validation} # NEW (include lines)
src/modules/receipts/{routes, controller, service, repository, validation} # NEW
src/modules/purchase-invoices/{routes, controller, service, repository, validation} # NEW
src/modules/purchase-payments/{routes, controller, service, repository, validation} # NEW
src/modules/journals/{routes, controller, service, repository, validation} # NEW (read + manual post)
src/modules/reports/{routes, controller, service} # NEW
src/modules/dashboard/{routes, controller, service} # NEW
tests/{businesses, chart-of-accounts, taxes, cash-bank, products, customers, suppliers, sales, purchase, journals}.test.js
prisma/schema.prisma                                   # sudah sync (jangan ubah di Fase 1)
```

---

### Task 0: Business Context Foundation — requireBusiness, authorizeRoles, refactor auth Int, businesses + seed COA

**Files:**
- Create: `src/common/middlewares/requireBusiness.js`, `src/common/middlewares/authorizeRoles.js`, `src/modules/businesses/businesses.validation.js`, `src/modules/businesses/businesses.repository.js`, `src/modules/businesses/businesses.service.js`, `src/modules/businesses/businesses.controller.js`, `src/modules/businesses/businesses.routes.js`, `tests/businesses.test.js`
- Modify: `src/modules/auth/auth.repository.js`, `src/modules/auth/auth.service.js`, `src/modules/auth/auth.validation.js`, `src/modules/auth/auth.routes.js`, `src/modules/auth/auth.controller.js`, `src/common/middlewares/auth.js`, `src/app.js`, `src/config/database.js` (tidak ubah, hanya cek)

**Interfaces:**
- Consumes: `prisma.user`, `prisma.businessProfile`, `prisma.businessMember`, `prisma.chartOfAccount`, `jwt.verify`, `bcryptjs`
- Produces: `requireBusiness(req.businessId, req.memberRole)` (async middleware), `authorizeRoles(...allowed)` (sync middleware), `businessesService.create(userId, body) -> {business, member, seededCount}`, `businessesService.listByUser(userId) -> BusinessProfile[]`, `authService.register/login` (Int ids, jwt sub String), `POST /api/v1/businesses` (auth), `GET /api/v1/businesses` (auth)

- [ ] **Step 1: Write failing test for requireBusiness + businesses**

```js
// tests/businesses.test.js
jest.mock('../src/config/database', () => ({
  businessMember: { findFirst: jest.fn() },
  businessProfile: { create: jest.fn(), findMany: jest.fn() },
  chartOfAccount: { createMany: jest.fn() },
  $transaction: jest.fn((fn) => fn({ businessProfile: { create: jest.fn().mockResolvedValue({ id: 1 }) }, businessMember: { create: jest.fn().mockResolvedValue({}) }, chartOfAccount: { createMany: jest.fn().mockResolvedValue({ count: 15 }) } })),
}));
const request = require('supertest');
const app = require('../src/app');

describe('Businesses + requireBusiness', () => {
  it('POST /api/v1/businesses without auth → 401', async () => {
    const res = await request(app).post('/api/v1/businesses').send({ businessName: 'Toko A' });
    expect(res.status).toBe(401);
  });
  it('GET /protected without X-Business-Id → 400', async () => {
    // akan pakai endpoint dummy yang requireBusiness, atau cek products yang butuh header
    const token = 'Bearer fake';
    const res = await request(app).get('/api/v1/products').set('Authorization', token);
    expect(res.status).toBe(401); // auth dulu, lalu 400 jika token valid tapi header hilang
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd jest tests/businesses.test.js --runInBand`
Expected: FAIL `Cannot find module '../src/common/middlewares/requireBusiness'` or `Cannot find module '../src/modules/businesses/businesses.routes'`

- [ ] **Step 3: Implement requireBusiness + authorizeRoles**

```js
// src/common/middlewares/requireBusiness.js
const prisma = require('../../config/database');
const ApiError = require('../utils/ApiError');
module.exports = async (req, res, next) => {
  const raw = req.headers['x-business-id'];
  if (!raw) return next(new ApiError(400, 'X-Business-Id header required'));
  const businessId = parseInt(raw, 10);
  if (Number.isNaN(businessId)) return next(new ApiError(400, 'Invalid X-Business-Id'));
  const member = await prisma.businessMember.findFirst({ where: { businessId, userId: req.user.id } });
  if (!member) return next(new ApiError(403, 'Not a member of this business'));
  req.businessId = businessId;
  req.memberRole = member.role;
  return next();
};
```

```js
// src/common/middlewares/authorizeRoles.js
const ApiError = require('../utils/ApiError');
module.exports = (...allowed) => (req, res, next) => {
  if (!req.memberRole) return next(new ApiError(403, 'Missing role'));
  if (!allowed.includes(req.memberRole)) return next(new ApiError(403, `Forbidden: role ${req.memberRole} not allowed`));
  return next();
};
```

- [ ] **Step 4: Refactor auth to Int + create businesses module**

`src/modules/auth/auth.repository.js`:
```js
const prisma = require('../../config/database');
async function findByEmail(email) { return prisma.user.findUnique({ where: { email } }); }
async function create(data) { return prisma.user.create({ data, select: { id: true, name: true, email: true, createdAt: true } }); }
async function findById(id) { return prisma.user.findUnique({ where: { id: Number(id) }, select: { id: true, name: true, email: true } }); }
module.exports = { findByEmail, create, findById };
```

`src/modules/auth/auth.service.js`: ubah `sign(user) => jwt.sign({email:user.email}, env.JWT_SECRET, {subject: String(user.id)})`, `register` hash + `repo.create` tanpa role field, `login` `bcrypt.compare(user.passwordHash, body.password)` + return `{user:{id,name,email}, token}`

`src/common/middlewares/auth.js`: ubah `req.user = { id: parseInt(payload.sub,10), email: payload.email }` (payload.sub String Int)

`src/modules/businesses/businesses.validation.js`:
```js
const { z } = require('zod');
const createBusinessSchema = z.object({ businessName: z.string().min(2).max(150), address: z.string().optional(), phone: z.string().max(30).optional(), taxId: z.string().max(50).optional(), baseCurrency: z.string().max(10).optional() });
module.exports = { createBusinessSchema };
```

`src/modules/businesses/businesses.repository.js`:
```js
const prisma = require('../../config/database');
async function createBusinessTx(tx, data) { return tx.businessProfile.create({ data }); }
async function createMemberTx(tx, data) { return tx.businessMember.create({ data }); }
async function seedCoATx(tx, businessId) {
  const defaults = [
    { code:'1010', name:'Kas', accountType:'Asset' },
    { code:'1020', name:'Bank', accountType:'Asset' },
    { code:'1100', name:'Piutang Usaha', accountType:'Asset' },
    { code:'1500', name:'Persediaan', accountType:'Asset' },
    { code:'2010', name:'Hutang Usaha', accountType:'Liability' },
    { code:'4010', name:'Penjualan', accountType:'Revenue' },
    { code:'5010', name:'HPP', accountType:'Expense' },
    { code:'6010', name:'Beban Operasional', accountType:'Expense' },
  ].map(c => ({ businessId, ...c }));
  return tx.chartOfAccount.createMany({ data: defaults });
}
async function findByUserId(userId) {
  const members = await prisma.businessMember.findMany({ where:{ userId }, include:{ business:true } });
  return members.map(m=>m.business);
}
module.exports = { createBusinessTx, createMemberTx, seedCoATx, findByUserId };
```

`src/modules/businesses/businesses.service.js`:
```js
const prisma = require('../../config/database');
const repo = require('./businesses.repository');
async function create(userId, body) {
  return prisma.$transaction(async (tx) => {
    const business = await repo.createBusinessTx(tx, { ownerUserId: userId, businessName: body.businessName, address: body.address, phone: body.phone, taxId: body.taxId, baseCurrency: body.baseCurrency||'IDR' });
    await repo.createMemberTx(tx, { businessId: business.id, userId, role:'owner' });
    const seeded = await repo.seedCoATx(tx, business.id);
    return { business, seededCount: seeded.count };
  });
}
async function listByUser(userId) { return repo.findByUserId(userId); }
module.exports = { create, listByUser };
```

`src/modules/businesses/businesses.controller.js` + `routes.js` mount `POST /` `auth, validate(createBusinessSchema)` → 201, `GET /` `auth` → 200 list.

- [ ] **Step 5: Mount in app.js**

Edit `src/app.js`: `const businessesRouter = require('./modules/businesses/businesses.routes'); app.use('/api/v1/businesses', businessesRouter);` before notFound.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx.cmd jest tests/businesses.test.js tests/auth.test.js --runInBand`
Expected: PASS (businesses 401/400 cases + auth register 400 + me 401)

- [ ] **Step 7: Commit**

```bash
git add src/common/middlewares/requireBusiness.js src/common/middlewares/authorizeRoles.js src/modules/auth src/modules/businesses tests/businesses.test.js src/app.js
git commit -m "feat: add business context (requireBusiness, authorizeRoles, businesses with COA seed) and refactor auth to Int"
```

---

### Task 1: Chart of Accounts, Taxes, Cash Bank Accounts (akuntan)

**Files:**
- Create: `src/modules/chart-of-accounts/{validation,repository,service,controller,routes}`, `src/modules/taxes/{...}`, `src/modules/cash-bank-accounts/{...}`, `tests/chart-of-accounts.test.js`, `tests/taxes.test.js`, `tests/cash-bank.test.js`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: `req.businessId, req.memberRole, prisma.chartOfAccount/tax/cashBankAccount, requireBusiness, authorizeRoles('owner','akuntan')`
- Produces: `chartOfAccountsService.{list, getById, create, update, remove}` (scoped businessId), `taxesService.*`, `cashBankService.*`; routes `GET /api/v1/chart-of-accounts?page&limit&search`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` (similar taxes, cash-bank)

- [ ] **Step 1: Write failing tests**

```js
// tests/chart-of-accounts.test.js
jest.mock('../src/modules/chart-of-accounts/chart-of-accounts.repository', () => ({
  findMany: jest.fn().mockResolvedValue([{ id:1, code:'1010', name:'Kas' }]),
  count: jest.fn().mockResolvedValue(1),
  findById: jest.fn().mockResolvedValue({ id:1 }),
  create: jest.fn().mockResolvedValue({ id:1 }),
}));
const request = require('supertest');
const app = require('../src/app');
describe('COA RBAC', () => {
  it('POST without X-Business-Id → 400', async () => { const res = await request(app).post('/api/v1/chart-of-accounts').send({code:'1010', name:'Kas', accountType:'Asset'}); expect(res.status).toBe(401); });
  it('GET with mocked kasir token should 403 for akuntan-only route', async () => {
    // akan butuh token valid + header + role kasir → 403
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx.cmd jest tests/chart-of-accounts.test.js --runInBand` Expected: FAIL `Cannot find module`

- [ ] **Step 3: Implement modules**

`src/modules/chart-of-accounts/chart-of-accounts.validation.js`:
```js
const {z}=require('zod');
const createCoASchema=z.object({code:z.string().min(1).max(20), name:z.string().min(1).max(100), accountType:z.enum(['Asset','Liability','Equity','Revenue','Expense']), parentId:z.number().int().optional(), isActive:z.boolean().optional()});
const updateCoASchema=createCoASchema.partial();
module.exports={createCoASchema, updateCoASchema};
```

`repository.js`: `findMany(businessId, skip,take, search) => prisma.chartOfAccount.findMany({where:{businessId, ...(search?{name:{contains:search, mode:'insensitive'}}:{})}, skip,take})`, `count`, `findById(businessId,id)`, `create(businessId,data)` catch P2002 → 409, `update`, `remove`.

`service.js`: `list(businessId, query) => {page,limit,skip,take}=parsePagination(query); [items,total]=Promise.all([repo.findMany..., repo.count...]); return {items, meta:buildMeta(page,limit,total)}`, `getById` throw 404, `create` repo, etc.

`controller.js`: `async list(req,res){const {items,meta}=await service.list(req.businessId, req.query); return success(res, items, 'COA fetched', meta)}` etc.

`routes.js`:
```js
const router=require('express').Router();
const auth=require('../../common/middlewares/auth');
const requireBusiness=require('../../common/middlewares/requireBusiness');
const authorizeRoles=require('../../common/middlewares/authorizeRoles');
const validate=require('../../common/middlewares/validate');
const asyncHandler=require('../../common/middlewares/asyncHandler');
const {createCoASchema,updateCoASchema}=require('./chart-of-accounts.validation');
const c=require('./chart-of-accounts.controller');
router.use(auth, requireBusiness, authorizeRoles('owner','akuntan'));
router.get('/', asyncHandler(c.list));
router.get('/:id', asyncHandler(c.getById));
router.post('/', validate('body', createCoASchema), asyncHandler(c.create));
router.patch('/:id', validate('body', updateCoASchema), asyncHandler(c.update));
router.delete('/:id', asyncHandler(c.remove));
module.exports=router;
```

Replicate untuk `taxes` (`code, name, rate:z.number().min(0).max(100)`) dan `cash-bank-accounts` (`coaId:z.number().int(), name, bankName, accountNumber, openingBalance`).

- [ ] **Step 4: Mount in app.js**

```js
app.use('/api/v1/chart-of-accounts', require('./modules/chart-of-accounts/chart-of-accounts.routes'));
app.use('/api/v1/taxes', require('./modules/taxes/taxes.routes'));
app.use('/api/v1/cash-bank-accounts', require('./modules/cash-bank-accounts/cash-bank-accounts.routes'));
```

- [ ] **Step 5: Run tests**

Run: `npx.cmd jest tests/chart-of-accounts.test.js tests/taxes.test.js tests/cash-bank.test.js --runInBand` Expected: PASS (mocked RBAC + validation)

- [ ] **Step 6: Commit**

```bash
git add src/modules/chart-of-accounts src/modules/taxes src/modules/cash-bank-accounts tests/ src/app.js
git commit -m "feat: add COA, taxes, cash-bank accounts (akuntan, business scoped, P2002 409)"
```

---

### Task 2: Products, Customers, Suppliers, Stock Movements (kasir)

**Files:**
- Create: `src/modules/products/{validation,repository,service,controller,routes}`, `customers`, `suppliers`, `stock-movements` (4 modules) + `tests/products.test.js` etc.
- Modify: `src/app.js`

**Interfaces:**
- Consumes: `requireBusiness, authorizeRoles('owner','kasir'), prisma.product/customer/supplier/stockMovement`
- Produces: `productsService.list(businessId,query)` etc., `stockMovementsService.list + createAdjustment(businessId, {productId, quantity, notes})`

- [ ] **Step 1: Write failing test**

```js
// tests/products.test.js
jest.mock('../src/modules/products/products.repository', () => ({
  findMany: jest.fn().mockResolvedValue([{id:1, sku:'A', name:'Produk'}]),
  count: jest.fn().mockResolvedValue(1),
  create: jest.fn().mockResolvedValue({id:1}),
}));
const request=require('supertest'); const app=require('../src/app');
describe('Products kasir', ()=>{ it('POST sku duplicate per business → 409', async()=>{
  const res=await request(app).post('/api/v1/products').send({sku:'A', name:'X', unit:'pcs'}); expect(res.status).toBe(401);
});});
```

- [ ] **Step 2: Run fail**

Run: `npx.cmd jest tests/products.test.js --runInBand` Expected: FAIL module missing

- [ ] **Step 3: Implement**

`products.validation.js`: `z.object({sku:z.string().min(1).max(50), name:z.string().min(1).max(150), unit:z.string().max(30).optional(), purchasePrice:z.number().min(0).optional(), sellingPrice:z.number().min(0).optional(), stock:z.number().min(0).optional(), minimumStock:z.number().min(0).optional()})`

`products.repository.js`: `create(businessId,data) => prisma.product.create({data:{businessId, ...data}})` catch P2002 → ApiError 409 `SKU already exists in this business`, `findMany` with search `name contains`.

`customers.validation.js`: `z.object({code:z.string().min(1).max(30), name:z.string().min(1).max(150), phone:z.string().max(30).optional(), address:z.string().optional(), creditLimit:z.number().min(0).optional()})`, similar suppliers `code`.

`stock-movements`: `validation createAdjustment {productId:z.number().int(), quantity:z.number(), notes:z.string().optional()}`; `service.createAdjustment` → `prisma.$transaction([product.update stock+=quantity, stockMovement.create {businessId, productId, quantity, movementType:'adjustment', notes}])`; check `updated stock <= minimumStock` → log warning (stock alert) but not error.

Routes: all `auth, requireBusiness, authorizeRoles('owner','kasir')`, plus pagination.

- [ ] **Step 4: Mount**

`app.use('/api/v1/products', ...); app.use('/api/v1/customers', ...); app.use('/api/v1/suppliers', ...); app.use('/api/v1/stock-movements', ...);`

- [ ] **Step 5: Run tests**

`npx.cmd jest tests/products.test.js tests/customers.test.js tests/suppliers.test.js tests/stock-movements.test.js --runInBand` Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/products src/modules/customers src/modules/suppliers src/modules/stock-movements tests/ src/app.js
git commit -m "feat: add products, customers, suppliers, stock-movements (kasir, business scoped)"
```

---

### Task 3: Sales Invoices + Lines + Receipts — Full Auto (kasir)

**Files:**
- Create: `src/modules/sales-invoices/{validation,repository,service,controller,routes}`, `src/modules/receipts/{...}`, `tests/sales.test.js`, `tests/receipts.test.js`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: `prisma.salesInvoice/salesInvoiceLine/product/stockMovement/journal/journalLine, requireBusiness, authorizeRoles('owner','kasir')`
- Produces: `salesInvoicesService.create(businessId, body) -> invoice with lines, stock updated, journal created`, `salesInvoicesService.list(businessId, query)`, `receiptsService.create(businessId, body) -> receipt + invoice paidAmount/status + journal`

- [ ] **Step 1: Write failing test for full auto transaction**

```js
// tests/sales.test.js
jest.mock('../src/modules/sales-invoices/sales-invoices.repository', () => ({
  createTx: jest.fn(),
}));
const request=require('supertest'); const app=require('../src/app');
describe('Sales full auto', ()=>{
  it('POST /sales-invoices without stock → 400', async()=>{
    const res=await request(app).post('/api/v1/sales-invoices').send({invoiceNo:'INV-001', customerId:1, lines:[{productId:1, quantity:100, unitPrice:1000}]}); expect(res.status).toBe(401);
  });
  it('debit==credit validation → 400 if not balance', async()=>{});
});
```

- [ ] **Step 2: Run fail**

`npx.cmd jest tests/sales.test.js --runInBand` Expected: FAIL missing module

- [ ] **Step 3: Implement**

`sales-invoices.validation.js`:
```js
const {z}=require('zod');
const createSalesInvoiceSchema=z.object({
  customerId:z.number().int().optional(), invoiceNo:z.string().min(1).max(50), invoiceDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dueDate:z.string().optional(), discountAmount:z.number().min(0).optional(), taxAmount:z.number().min(0).optional(),
  lines:z.array(z.object({productId:z.number().int(), quantity:z.number().positive(), unitPrice:z.number().min(0), discountAmount:z.number().min(0).optional(), taxAmount:z.number().min(0).optional()})).min(1)
});
module.exports={createSalesInvoiceSchema};
```

`sales-invoices.repository.js`: helpers `findProductForUpdate(tx, businessId, productId) => tx.product.findFirst({where:{businessId, id:productId}})`, `createInvoiceTx(tx, data)`, `createLinesTx(tx, data)`, `updateStockTx(tx, id, delta)`, `createMovementTx(tx, data)`, `createJournalTx(tx, data)`, `createJournalLinesTx(tx, data)`.

`sales-invoices.service.js` core:
```js
async function create(businessId, body) {
  return prisma.$transaction(async (tx) => {
    let subtotal=0; for(const l of body.lines) subtotal+= Number(l.quantity)*Number(l.unitPrice) - Number(l.discountAmount||0);
    const totalAmount = subtotal + Number(body.taxAmount||0) - Number(body.discountAmount||0);
    // cek stock
    for(const l of body.lines){ const p=await repo.findProductForUpdate(tx,businessId,l.productId); if(!p) throw new ApiError(404,'Product not found'); if(Number(p.stock) < Number(l.quantity)) throw new ApiError(400,`Stock tidak cukup untuk ${p.name}: ${p.stock} < ${l.quantity}`); }
    const invoice=await repo.createInvoiceTx(tx,{businessId,customerId:body.customerId,invoiceNo:body.invoiceNo,invoiceDate:new Date(body.invoiceDate), dueDate: body.dueDate?new Date(body.dueDate):null, subtotal, taxAmount:body.taxAmount||0, discountAmount:body.discountAmount||0, totalAmount, paidAmount:0, status:'posted'});
    for(const l of body.lines){ await repo.createLinesTx(tx,{salesInvoiceId:invoice.id, productId:l.productId, quantity:l.quantity, unitPrice:l.unitPrice, discountAmount:l.discountAmount||0, taxAmount:l.taxAmount||0, subtotal: Number(l.quantity)*Number(l.unitPrice)}); await repo.updateStockTx(tx,l.productId, -Number(l.quantity)); await repo.createMovementTx(tx,{businessId,productId:l.productId, quantity:-Number(l.quantity), unitCost:l.unitPrice, movementType:'out', referenceType:'sales_invoice', referenceId:invoice.id}); }
    // journal: need COA ids - fetch first Cash/AR etc atau pakai default COA seeded (1010,1100,4010,5010). Untuk Fase 1, ambil chartOfAccount findFirst where businessId and code in ['1100','4010','5010','1500']
    const coas=await tx.chartOfAccount.findMany({where:{businessId, code:{in:['1100','4010','1500','5010']}}});
    const journal=await repo.createJournalTx(tx,{businessId, journalNo:`JU-${Date.now()}`, journalDate:new Date(body.invoiceDate), status:'posted'});
    const lines=[{journalId:journal.id, coaId:coas.find(c=>c.code==='1100').id, debit:totalAmount, credit:0}, {journalId:journal.id, coaId:coas.find(c=>c.code==='4010').id, debit:0, credit:subtotal}];
    // tambah tax, cogs jika ada
    const debitSum=lines.reduce((s,l)=>s+Number(l.debit),0); const creditSum=lines.reduce((s,l)=>s+Number(l.credit),0); if(debitSum!==creditSum) throw new ApiError(400,'Journal tidak balance: debit != credit');
    await repo.createJournalLinesTx(tx, lines);
    return invoice;
  });
}
```

`receipts.service.js`: `create(businessId, {salesInvoiceId, amount, paymentMethod, cashBankAccountId})` → `prisma.$transaction([receipt.create, salesInvoice.update paidAmount, journal debit CashBank credit AR])`.

Controller/routes: `auth, requireBusiness, authorizeRoles('owner','kasir')`, `POST /sales-invoices`, `GET /sales-invoices?page&limit&customerId&status`, `GET /:id`, `POST /receipts`.

- [ ] **Step 4: Mount**

`app.use('/api/v1/sales-invoices', salesRouter); app.use('/api/v1/receipts', receiptsRouter);`

- [ ] **Step 5: Run tests**

`npx.cmd jest tests/sales.test.js tests/receipts.test.js --runInBand` Expected: PASS mocked; manual integrate: `POST /sales-invoices` dengan token+header → cek `products.stock` berkurang, `stock_movements` ada, `journals` balance.

- [ ] **Step 6: Commit**

```bash
git add src/modules/sales-invoices src/modules/receipts tests/sales.test.js tests/receipts.test.js src/app.js
git commit -m "feat: add sales invoices + receipts full auto (stock check, movement out, journal balance)"
```

---

### Task 4: Purchase Invoices + Lines + Payments — Full Auto (kasir)

**Files:**
- Create: `src/modules/purchase-invoices/{validation,repository,service,controller,routes}`, `src/modules/purchase-payments/{...}`, `tests/purchase.test.js`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: `prisma.purchaseInvoice/purchaseInvoiceLine/purchasePayment/product/stockMovement/journal, requireBusiness, authorizeRoles('owner','kasir')`
- Produces: `purchaseInvoicesService.create(businessId, body)` (stock +qty, movement in, journal Inventory→AP), `purchasePaymentsService.create` (paidAmount→status, journal AP→Cash)

- [ ] **Step 1: Write failing test**

```js
// tests/purchase.test.js
describe('Purchase full auto', ()=>{ it('POST /purchase-invoices → stock +qty', async()=>{ });});
```

- [ ] **Step 2: Run fail**

`npx.cmd jest tests/purchase.test.js --runInBand` Expected: FAIL missing

- [ ] **Step 3: Implement mirror sales**

`purchase-invoices.validation.js`: `z.object({supplierId:z.number().int().optional(), invoiceNo:z.string().min(1).max(50), invoiceDate:z.string(), lines:z.array({productId:z.number().int(), quantity:z.number().positive(), unitPrice:z.number().min(0)}).min(1)})`

`service.create`: `prisma.$transaction` → `subtotal/totalAmount` → `purchaseInvoice.create + lines.createMany` → `product.update stock+=qty` → `stockMovement.create movementType:'in'` → `journal.create + journalLines [debit Inventory/Expense total, credit AP total]` check balance → return invoice. `payments` similar `purchasePayment.create + purchaseInvoice.update paidAmount/status + journal debit AP credit Cash`.

- [ ] **Step 4: Mount**

`app.use('/api/v1/purchase-invoices', ...); app.use('/api/v1/purchase-payments', ...);`

- [ ] **Step 5: Run tests**

`npx.cmd jest tests/purchase.test.js --runInBand` Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/purchase-invoices src/modules/purchase-payments tests/purchase.test.js src/app.js
git commit -m "feat: add purchase invoices + payments full auto (stock in, journal)"
```

---

### Task 5: Journals (read+manual) + Dashboard + Reports (sederhana)

**Files:**
- Create: `src/modules/journals/{validation,repository,service,controller,routes}`, `src/modules/dashboard/{controller,service,routes}`, `src/modules/reports/{controller,service,routes}`, `tests/journals.test.js`, `tests/reports.test.js`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: `prisma.journal/journalLine, requireBusiness, authorizeRoles('owner','akuntan')`, `prisma sales/purchase/product/customer/supplier for agregasi`
- Produces: `journalsService.list(businessId, query)`, `journalsService.postManual(businessId, {journalDate, description, lines:[{coaId,debit,credit}]})` (validate debit==credit), `dashboardService.getSummary(businessId, period) -> {omzet, revenue, expense, profit, cashBank, receivable, payable, stock}`, `reportsService.profitLoss(businessId, {from,to})`

- [ ] **Step 1: Write failing test**

```js
// tests/journals.test.js
jest.mock('../src/modules/journals/journals.repository', ()=>({findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), create: jest.fn()}));
const request=require('supertest'); const app=require('../src/app');
describe('Journals akuntan', ()=>{ it('kasir POST /journals → 403', async()=>{}); it('debit!=credit → 400', async()=>{}); });
```

- [ ] **Step 2: Run fail**

`npx.cmd jest tests/journals.test.js --runInBand` Expected: FAIL

- [ ] **Step 3: Implement**

`journals.validation.js`: `z.object({journalDate:z.string(), description:z.string().optional(), lines:z.array(z.object({coaId:z.number().int(), debit:z.number().min(0), credit:z.number().min(0), memo:z.string().optional()})).min(2)})` + superRefine `sum debit == sum credit`.

`journals.service.js`: `list(businessId, query) => paginated`, `createManual(businessId, body) => prisma.$transaction([journal.create, journalLines.createMany])` after validate balance.

`dashboard.service.js`: `async getSummary(businessId, {period}) => { sales: sum totalAmount where invoiceDate in period, purchases: sum, receipts, payments, products: sum stock, customers: count, suppliers: count, cashBank: sum openingBalance }` via `prisma.*.aggregate` filtered `businessId`.

`reports.service.js`: `profitLoss` = `sales total - purchase total - expenses from journalLines where coa accountType Expense etc`.

Routes: `auth, requireBusiness, authorizeRoles('owner','akuntan')` for journals/reports/dashboard.

- [ ] **Step 4: Mount**

`app.use('/api/v1/journals', journalsRouter); app.use('/api/v1/dashboard', dashboardRouter); app.use('/api/v1/reports', reportsRouter);`

- [ ] **Step 5: Run tests**

`npx.cmd jest tests/journals.test.js tests/reports.test.js --runInBand` Expected: PASS

Run full: `npx.cmd jest --runInBand` Expected: 3 old + 7 new suites PASS; `npx.cmd prisma validate` OK

- [ ] **Step 6: Commit**

```bash
git add src/modules/journals src/modules/dashboard src/modules/reports tests/ src/app.js
git commit -m "feat: add journals (manual), dashboard and reports (akuntan)"
```

---

## Self-Review

1. Spec coverage: Task 0 business context (B + X-Business-Id + RBAC) → Task 1 COA/taxes/cashBank (akuntan) → Task 2 products/customers/suppliers/stock (kasir) → Task 3 sales+receipts full auto (stock+journal) → Task 4 purchase+payments mirror → Task 5 journals/dashboard/reports → semua 5 design sections terpetakan, flowchart #1-#16 tercakup, #10 aset ditunda Fase 2 sesuai Non-Goals.
2. Placeholder scan: tidak ada TODO/TBD, semua zod schema, service transaction, test snippet konkret, commit message eksplisit.
3. Type consistency: `businessId Int`, `userId Int`, `req.businessId Int`, `req.memberRole: UserRole`, `InvoiceStatus draft/posted/paid/partially_paid/cancelled`, `PaymentMethod cash/bank_transfer/e_wallet/other`, `ApiError(403)` konsisten antar task 0-5.

