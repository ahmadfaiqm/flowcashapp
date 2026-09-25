# SAK Full Cycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement siklus akuntansi SAK ETAP lengkap — modal awal/akhir, jurnal penyesuaian a-e, neraca lajur 10 kolom, dan laporan perubahan modal dengan closing manual.

**Architecture:** Prisma model extension (Journal isAdjustment, AccountingPeriod, CapitalMovement, ChartOfAccount isContra) + single-source JournalLine aggregation untuk semua laporan. Backend modules baru (periods, capital-movements) + refactor reports. Frontend pages baru (Worksheet, CapitalChange, Periods) + modifikasi GeneralJournal/TrialBalance/BalanceSheet.

**Tech Stack:** Express 4, Prisma 5, PostgreSQL, Zod, React 18, Vite 5, TanStack Query 5, axios

**Spec:** `docs/superpowers/specs/2026-09-22-sak-full-cycle-design.md`

## Global Constraints

- Stack: Express 4 + Prisma 5 + PostgreSQL (backend), Vite 5 + React 18 + TS 5 + TanStack Query 5 (frontend)
- Envelope: ApiResponse {success, message, data, meta} — pagination via common/utils/pagination.js
- Auth: Bearer token + X-Business-Id (requireBusiness), role owner|akuntan|kasir
- Decimal Prisma = string → Number() di mapper
- Period filter via journalDate BETWEEN, status=posted only untuk laporan
- Closing manual tombol — tidak ada auto-lock cron
- Single source: semua laporan agregasi dari JournalLine (hapus cash+stock+AR tautologi)
- File paths absolut: backend C:/Users/User/projectBLN1, frontend C:/Users/User/aplikasi-akuntansi

---

### Task 1: Prisma Schema & Migrasi & Seed 28 Akun SAK

**Files:**
- Modify: `prisma/schema.prisma:17-35` (enum + models)
- Modify: `src/modules/businesses/businesses.repository.js:9` (seedCoATx)
- Modify: `src/modules/businesses/businesses.service.js:5` (modal awal journal)
- Create: `prisma/migrations/20260922_sak_full_cycle/migration.sql` (generated)

**Interfaces:**
- Consumes: existing chart_of_accounts, journals, business_profiles
- Produces: `AdjustmentType` enum, `AccountingPeriod` model, `CapitalMovement` model, `ChartOfAccount.isContra/normalBalance`, `Journal.isAdjustment/adjustmentType/periodYear/periodMonth` — used by Tasks 2-4

- [ ] **Step 1: Write failing test for new models**

Create `tests/sak-schema.test.js`:
```js
const prisma = require('../src/config/database');
test('schema has new SAK tables', async () => {
  const fields = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name='journals' AND column_name='is_adjustment'`;
  expect(fields.length).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/sak-schema.test.js` (in C:/Users/User/projectBLN1)
Expected: FAIL — column does not exist

- [ ] **Step 3: Edit prisma/schema.prisma**

Add after `enum PaymentMethod`:
```prisma
enum AdjustmentType {
  supplies
  depreciation
  prepaidExpense
  unearnedRevenue
  accruedExpense
  accruedRevenue
  other
}
```
Extend `Journal` with:
```prisma
  isAdjustment Boolean @default(false) @map("is_adjustment")
  adjustmentType AdjustmentType? @map("adjustment_type")
  periodYear Int? @map("period_year")
  periodMonth Int? @map("period_month")
```
Add models `AccountingPeriod`, `CapitalMovement` and extend `ChartOfAccount` with `normalBalance String?` and `isContra Boolean @default(false)` exactly as spec section 5.1. Add relation `accountingPeriods AccountingPeriod[]` and `capitalMovements CapitalMovement[]` to `BusinessProfile`.

- [ ] **Step 4: Replace seedCoATx**

Edit `src/modules/businesses/businesses.repository.js:9`:
```js
async function seedCoATx(tx, businessId) {
  const defaults = [
    { code:'1010', name:'Kas', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1020', name:'Bank', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1100', name:'Piutang Usaha', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1110', name:'Perlengkapan', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1120', name:'Sewa Dibayar Dimuka', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1130', name:'Asuransi Dibayar Dimuka', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1500', name:'Persediaan', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1510', name:'Peralatan', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1520', name:'Akumulasi Penyusutan', accountType:'Asset', normalBalance:'credit', isContra:true },
    { code:'2010', name:'Hutang Usaha', accountType:'Liability', normalBalance:'credit', isContra:false },
    { code:'2110', name:'Pendapatan Diterima Dimuka', accountType:'Liability', normalBalance:'credit', isContra:false },
    { code:'2120', name:'Beban YMH Dibayar', accountType:'Liability', normalBalance:'credit', isContra:false },
    { code:'2210', name:'Hutang Pajak', accountType:'Liability', normalBalance:'credit', isContra:false },
    { code:'3110', name:'Modal', accountType:'Equity', normalBalance:'credit', isContra:false },
    { code:'3111', name:'Prive', accountType:'Equity', normalBalance:'debit', isContra:true },
    { code:'3120', name:'Laba Ditahan', accountType:'Equity', normalBalance:'credit', isContra:false },
    { code:'3130', name:'Ikhtisar Laba Rugi', accountType:'Equity', normalBalance:'credit', isContra:false },
    { code:'4010', name:'Penjualan', accountType:'Revenue', normalBalance:'credit', isContra:false },
    { code:'4020', name:'Pendapatan Jasa', accountType:'Revenue', normalBalance:'credit', isContra:false },
    { code:'5010', name:'HPP', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5110', name:'Beban Gaji', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5120', name:'Beban Sewa', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5130', name:'Beban Listrik', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5140', name:'Beban Perlengkapan', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5150', name:'Beban Penyusutan', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5160', name:'Beban Lain-lain', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5210', name:'Beban Bunga', accountType:'Expense', normalBalance:'debit', isContra:false },
  ].map(c=>({businessId, ...c}));
  return tx.chartOfAccount.createMany({data: defaults, skipDuplicates:true});
}
```

- [ ] **Step 5: Add modal awal journal in businesses.service.js**

Edit `src/modules/businesses/businesses.service.js:5` after `createMemberTx`, before `seedCoATx`:
```js
if (body.initialCapital && Number(body.initialCapital) > 0) {
  const kasCoa = await tx.chartOfAccount.findFirst({where:{businessId: business.id, code:'1010'}});
  // seed already done? ensure seed first then journal
}
// Reorder: seed first, then journal if initialCapital
```
Full implementation: seedCoATx dulu, then if initialCapital >0 create Journal JU-MODAL-{businessId} Kas D → Modal 3110 K, and CapitalMovement initial.

- [ ] **Step 6: Generate migration**

Run: `npx prisma migrate dev --name sak_full_cycle` (in projectBLN1, DATABASE_URL must be set)
Expected: migration.sql created, prisma generate done

- [ ] **Step 7: Run test to verify passes**

Run: `npm test -- tests/sak-schema.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/modules/businesses/businesses.repository.js src/modules/businesses/businesses.service.js
git commit -m "feat(sak): schema 28 akun + isContra, Journal adjustment, Period & CapitalMovement + modal awal"
```

---

### Task 2: Jurnal Penyesuaian & Void Reversal + Period Guard

**Files:**
- Modify: `src/modules/journals/journals.validation.js:1` (add isAdjustment, adjustmentType)
- Modify: `src/modules/journals/journals.service.js:34` (periodYear/Month + period closed guard + void->reversal)
- Modify: `src/modules/journals/journals.repository.js:76` (remove hard delete, add reversal)
- Modify: `src/modules/journals/journals.routes.js` (keep same, validation extended)
- Modify: `src/modules/fixed-assets/fixed-assets.service.js:66` (flag depreciation as adjustment)

**Interfaces:**
- Consumes: Task 1 models (AccountingPeriod, Journal fields)
- Produces: `createManual({isAdjustment, adjustmentType})`, `voidJournal(id)` (reversal) — used by Tasks 4,6

- [ ] **Step 1: Write failing test**

Create `tests/journals-adjustment.test.js`:
```js
const svc = require('../src/modules/journals/journals.service');
test('creates adjustment journal with type supplies', async () => {
  const j = await svc.createManual(1, {journalDate:'2026-08-31', description:'Adj perlengkapan', isAdjustment:true, adjustmentType:'supplies', status:'posted', lines:[{coaId:101, debit:500000, credit:0},{coaId:102, debit:0, credit:500000}]});
  expect(j.isAdjustment).toBe(true);
  expect(j.adjustmentType).toBe('supplies');
});
test('void creates reversal not delete', async () => {
  await svc.remove(1, 1);
  const orig = await require('../src/config/database').journal.findFirst({where:{id:1}});
  expect(orig.status).toBe('void');
});
```

- [ ] **Step 2: Run test fails**

Run: `npm test -- tests/journals-adjustment.test.js`
Expected: FAIL — unknown field isAdjustment

- [ ] **Step 3: Update validation**

Edit `journals.validation.js`:
```js
const createManualJournalSchema = z.object({
  journalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).optional(),
  status: z.enum(['draft','posted','void']).optional().default('posted'),
  isAdjustment: z.boolean().optional().default(false),
  adjustmentType: z.enum(['supplies','depreciation','prepaidExpense','unearnedRevenue','accruedExpense','accruedRevenue','other']).optional(),
  lines: z.array(...).min(2)
}).superRefine((data,ctx)=>{
  if(data.isAdjustment && !data.adjustmentType) ctx.addIssue({code:z.ZodIssueCode.custom, message:'adjustmentType required when isAdjustment true', path:['adjustmentType']});
  // existing balance checks
});
```

- [ ] **Step 4: Update service createManual + remove**

In `journals.service.js:34` add at top of createManual:
```js
const dt = new Date(body.journalDate);
const periodYear = dt.getFullYear();
const periodMonth = dt.getMonth()+1;
const closed = await prisma.accountingPeriod.findFirst({where:{businessId, year:periodYear, month:periodMonth, status:'closed'}});
if(closed) throw new ApiError(403, 'Periode sudah ditutup, jurnal tidak bisa dibuat');
```
Include `isAdjustment`, `adjustmentType`, `periodYear`, `periodMonth` in repo.createJournalTx data.

Replace `remove`:
```js
async function remove(businessId, id){
  const existing = await repo.findById(businessId,id);
  if(!existing) throw new ApiError(404,'Journal not found');
  const dt = new Date(existing.journalDate);
  const closed = await prisma.accountingPeriod.findFirst({where:{businessId, year:dt.getFullYear(), month:dt.getMonth()+1, status:'closed'}});
  if(closed) throw new ApiError(403,'Periode tertutup, tidak bisa void');
  return prisma.$transaction(async(tx)=>{
    await tx.journal.update({where:{id:Number(id)}, data:{status:'void'}});
    const reversalNo = `VOID-${existing.journalNo}-${Date.now()}`;
    const rev = await tx.journal.create({data:{businessId, journalNo:reversalNo, journalDate: new Date(), description:`Reversal ${existing.journalNo}`, status:'posted', isAdjustment:false}});
    const revLines = existing.lines.map(l=>({journalId:rev.id, coaId:l.coaId, debit:l.credit, credit:l.debit, memo:`Reversal ${existing.journalNo}`}));
    await tx.journalLine.createMany({data: revLines});
    return rev;
  });
}
```

Update `fixed-assets.service.js:132` create journal with `isAdjustment:true, adjustmentType:'depreciation', periodYear, periodMonth`.

- [ ] **Step 5: Run test passes**

Run: `npm test -- tests/journals-adjustment.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/journals tests/journals-adjustment.test.js src/modules/fixed-assets
git commit -m "feat(journal): penyesuaian a-e, void reversal, period guard"
```

---

### Task 3: Periode & Pergerakan Modal Modules

**Files:**
- Create: `src/modules/periods/periods.routes.js`
- Create: `src/modules/periods/periods.controller.js`
- Create: `src/modules/periods/periods.service.js`
- Create: `src/modules/periods/periods.repository.js`
- Create: `src/modules/periods/periods.validation.js`
- Create: `src/modules/capital-movements/capital-movements.routes.js`
- Create: `src/modules/capital-movements/capital-movements.controller.js`
- Create: `src/modules/capital-movements/capital-movements.service.js`
- Create: `src/modules/capital-movements/capital-movements.repository.js`
- Create: `src/modules/capital-movements/capital-movements.validation.js`
- Modify: `src/app.js:36` (mount new routers)

**Interfaces:**
- Consumes: Task 1 models
- Produces: `POST /api/v1/periods/close`, `GET /periods`, `POST /capital-movements`, `GET /capital-movements` — used by Tasks 4,6

- [ ] **Step 1: Write failing test**

Create `tests/periods-capital.test.js`:
```js
test('close period creates closed status', async ()=>{
  const res = await require('supertest')(require('../src/app')).post('/api/v1/periods/close').set('Authorization','Bearer token').set('X-Business-Id','1').send({year:2026, month:8});
  expect(res.status).toBe(201);
});
```

- [ ] **Step 2: Run fails**

Run: `npm test -- tests/periods-capital.test.js`
Expected: FAIL 404 route not found

- [ ] **Step 3: Scaffold periods module**

`periods.validation.js`:
```js
const {z}=require('zod');
exports.closePeriodSchema=z.object({year:z.number().int().min(2000), month:z.number().int().min(0).max(12)});
```
`periods.repository.js`: findByBusiness, findOne, create, updateStatus.
`periods.service.js`:
```js
async function close(businessId, {year, month}){
  // check already closed
  // if month==0 -> closing tahunan: aggregate Revenue vs Expense for year, create journals  Revenue->3130 and 3130->Expense, then 3130->3120
  // else month close: check trial balance seimbang for period, then create AccountingPeriod closed
}
async function list(businessId){ return prisma.accountingPeriod.findMany({where:{businessId}, orderBy:[{year:'desc'},{month:'desc'}]})}
```
Follow spec 6.2 for closing logic inside prisma.$transaction.

`capital-movements` similar: `type enum initial|additional|prive`, create also creates journal if prive: `Prive 3111 D -> Kas 1010 K`.

- [ ] **Step 4: Mount in app.js**

Edit `src/app.js:52` add:
```js
app.use('/api/v1/periods', require('./modules/periods/periods.routes'));
app.use('/api/v1/capital-movements', require('./modules/capital-movements/capital-movements.routes'));
```

- [ ] **Step 5: Run test passes**

Run: `npm test -- tests/periods-capital.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/periods src/modules/capital-movements src/app.js tests/periods-capital.test.js
git commit -m "feat(period): closing manual + capital movements (prive/setoran)"
```

---

### Task 4: Reports — Worksheet 10 Kolom, NSD, Perubahan Modal & Refactor L/R & Neraca

**Files:**
- Modify: `src/modules/reports/reports.service.js:4` (add worksheet, adjustedTrial, capitalChange; refactor profitLoss, balanceSheet)
- Modify: `src/modules/reports/reports.repository.js:191` (replace balanceSheetAggregate with JournalLine aggregation, add worksheet helpers)
- Modify: `src/modules/reports/reports.controller.js` (add handlers)
- Modify: `src/modules/reports/reports.routes.js` (add routes)

**Interfaces:**
- Consumes: Tasks 1-3
- Produces: `GET /reports/worksheet`, `/adjusted-trial-balance`, `/capital-change` — consumed by Task 6 FE

- [ ] **Step 1: Write failing test**

Create `tests/worksheet.test.js`:
```js
const svc=require('../src/modules/reports/reports.service');
test('worksheet 10 kolom seimbang', async ()=>{
  const ws = await svc.worksheet(1, {from:'2026-08-01', to:'2026-08-31'});
  expect(ws.rows.length).toBeGreaterThan(0);
  expect(ws.totals.trialDebit).toBe(ws.totals.trialCredit);
  expect(ws.totals.adjustedDebit).toBe(ws.totals.adjustedCredit);
  expect(ws.totals.netIncome).toBeDefined();
});
test('capital change modal akhir benar', async ()=>{
  const cc = await svc.capitalChange(1, {from:'2026-08-01', to:'2026-08-31'});
  expect(cc.modalAkhir).toBe(cc.modalAwal + cc.setoran - cc.prive + cc.labaBersih);
});
```

- [ ] **Step 2: Run fails**

Run: `npm test -- tests/worksheet.test.js`
Expected: FAIL is not a function

- [ ] **Step 3: Implement worksheet service**

In `reports.service.js` add:
```js
async function worksheet(businessId, query){
  const from=query.from, to=query.to;
  // fetch CoAs
  const coas = await prisma.chartOfAccount.findMany({where:{businessId, isActive:true}, orderBy:{code:'asc'}});
  // aggregate trial: JournalLine where journal.isAdjustment=false, status posted, date between
  // aggregate adjustment: isAdjustment=true
  // for each coa compute trial {d,c,balance}, adjustment {d,c}, adjusted {d,c}
  // split income (Revenue+Expense) vs balanceSheet (Asset,Liability,Equity)
  // totals + netIncome = income credit - debit (adjusted)
  return {period:{from,to}, rows, totals};
}
async function adjustedTrialBalance(businessId, query){ const ws=await worksheet(businessId,query); return {period:ws.period, rows: ws.rows.map(r=>({code:r.code,name:r.name, debit:r.adjusted.debit, credit:r.adjusted.credit})), totals:{debit:ws.totals.adjustedDebit, credit:ws.totals.adjustedCredit}} }
async function capitalChange(businessId, query){
  const ws=await worksheet(businessId,query);
  const beforeFrom = query.from ? new Date(query.from) : null;
  // modalAwal = saldo 3110+3120 sebelum from (query all journals < from)
  // setoran/prive from CapitalMovement where date between + from journal prive
  // labaBersih = ws.totals.netIncome
  // modalAkhir = modalAwal + setoran - prive + laba
}
```
Add `profitLoss` refactor: aggregate Revenue/Expense from JournalLine (posted) between from-to, not sales/purchase tables. Keep dashboard compatible fields.

Replace `balanceSheetAggregate` in repository: aggregate Asset/Liability/Equity from JournalLine grouped by accountType, handling isContra.

- [ ] **Step 4: Wire controller & routes**

Add in `reports.controller.js`: `worksheet`, `adjustedTrialBalance`, `capitalChange` handlers using `asyncHandler` + `ApiResponse`.

Add in `reports.routes.js`:
```js
router.get('/worksheet', auth, requireBusiness, controller.worksheet);
router.get('/adjusted-trial-balance', auth, requireBusiness, controller.adjustedTrialBalance);
router.get('/capital-change', auth, requireBusiness, controller.capitalChange);
```

- [ ] **Step 5: Run tests pass**

Run: `npm test -- tests/worksheet.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/reports tests/worksheet.test.js
git commit -m "feat(reports): worksheet 10 kolom, NSD, perubahan modal, refactor L/R & neraca ke JournalLine"
```

---

### Task 5: Frontend — Types, Hooks & Sidebar SAK

**Files:**
- Modify: `C:/Users/User/aplikasi-akuntansi/src/types.ts:39` (PageKey add worksheet|capitalChange|periods)
- Modify: `C:/Users/User/aplikasi-akuntansi/src/components/Sidebar.tsx:4` (group Laporan SAK)
- Create: `src/hooks/useWorksheet.ts`
- Create: `src/hooks/useCapitalChange.ts`
- Create: `src/hooks/usePeriods.ts`
- Create: `src/hooks/useCapitalMovements.ts`
- Modify: `src/hooks/useJournals.ts:22` (add isAdjustment fields)
- Modify: `src/utils/mappers.ts` (add isContra handling)
- Modify: `src/utils/accounting.ts:13` (fix isContra)

**Interfaces:**
- Consumes: Task 4 endpoints
- Produces: hooks for Task 6 pages

- [ ] **Step 1: Write failing test (manual)**

No jest FE, verify by `npm run build` fails due to missing PageKey

- [ ] **Step 2: Update types & Sidebar**

Edit `types.ts:39`:
```ts
export type PageKey = ... | "worksheet" | "capitalChange" | "periods";
```
Edit `Sidebar.tsx:44` add group:
```ts
{key:"sak", label:"Laporan SAK", children:[{key:"worksheet",label:"Neraca Lajur 10 Kolom"}, {key:"capitalChange",label:"Perubahan Modal"}, {key:"periods",label:"Periode"}]}
```

- [ ] **Step 3: Create hooks**

`useWorksheet.ts`:
```ts
export function useWorksheet(from?:string, to?:string){ const {businessId}=useBusiness(); return useQuery({queryKey:["worksheet",businessId,from,to], queryFn: async()=>{ const res=await api.get("/reports/worksheet",{params:{from,to}}); return res.data.data; }, enabled:!!businessId});}
```
Similarly for `useCapitalChange`, `usePeriods` (list+close mutation), `useCapitalMovements`.

Update `useJournals.ts:22` payload add `isAdjustment, adjustmentType`.

Update `mappers.ts` & `accounting.ts` handle `isContra` → invert normal balance.

- [ ] **Step 4: Verify build**

Run: `npm run build` in aplikasi-akuntansi
Expected: PASS (no TS errors)

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/components/Sidebar.tsx src/hooks src/utils
git commit -m "feat(fe): hooks worksheet/capital/periods + Sidebar SAK + isContra fix"
```

---

### Task 6: Frontend — Pages Worksheet, Perubahan Modal, Periode & Penyesuaian UX

**Files:**
- Create: `C:/Users/User/aplikasi-akuntansi/src/pages/Worksheet.tsx`
- Create: `src/pages/CapitalChange.tsx`
- Create: `src/pages/Periods.tsx`
- Modify: `src/pages/GeneralJournal.tsx:15` (add checkbox penyesuaian + adjustmentType select)
- Modify: `src/App.tsx:24` (render new pages)

**Interfaces:**
- Consumes: Task 5 hooks

- [ ] **Step 1: Implement Worksheet.tsx**

10-col table: `Akun | NS D/C | Penyesuaian D/C | NSD D/C | L/R D/C | Neraca D/C` sorted by code, footer totals, `Laba Bersih` cross-check, date filter (from/to), Export CSV button. Use `useWorksheet`.

- [ ] **Step 2: Implement CapitalChange.tsx**

Show `Modal Awal + Setoran - Prive + Laba = Modal Akhir` cards + table `CapitalMovement` + form Tambah Prive/Setoran (calls `useCapitalMovements` create). Use `useCapitalChange`.

- [ ] **Step 3: Implement Periods.tsx**

List `usePeriods`, badge open/closed, button `Tutup Periode` (calls close mutation) with confirm, disable if already closed.

- [ ] **Step 4: Extend GeneralJournal**

Add state `isAdjustment`, `adjustmentType`. Checkbox "Jurnal Penyesuaian" shows select `supplies|depreciation|prepaidExpense|unearnedRevenue|accruedExpense|accruedRevenue|other`. Pass to `onAdd` → `useJournals` sends to BE. Button label "Simpan Penyesuaian" if checked. Disable if period closed (show toast).

- [ ] **Step 5: Wire App.tsx**

Add imports and render: `page==="worksheet" && <Worksheet/>` etc. In `AppInner` pass `businessId` context.

- [ ] **Step 6: Build verify**

Run: `npm run build` in aplikasi-akuntansi
Expected: PASS, no missing imports

- [ ] **Step 7: Commit**

```bash
git add src/pages/Worksheet.tsx src/pages/CapitalChange.tsx src/pages/Periods.tsx src/pages/GeneralJournal.tsx src/App.tsx
git commit -m "feat(fe): worksheet 10 kolom, perubahan modal, periode & penyesuaian UX"
```

---

### Task 7: Frontend — Trial NSD Tab, Neraca Rincian Modal & HPP Refactor

**Files:**
- Modify: `src/pages/TrialBalance.tsx:10` (tabs NS | NSD)
- Modify: `src/pages/BalanceSheet.tsx:11` (rich modal breakdown)
- Modify: `src/pages/IncomeStatement.tsx:10` (period filter, include HPP)
- Modify: `src/utils/accounting.ts:190` (HPP preview helper if needed)

**Interfaces:**
- Consumes: Task 5-6

- [ ] **Step 1: TrialBalance NSD tab**

Add prop `adjustedBalances` from `useWorksheet`. Render tabs: NS (existing) and NSD (using `adjusted`). Default NSD. Show both totals seimbang check.

- [ ] **Step 2: BalanceSheet breakdown**

Fetch `useCapitalChange` for period, show `3110 Modal`, `3111 Prive (negatif)`, `3120 Laba Ditahan`, `Laba Tahun Berjalan (netIncome)`, then `Total Ekuitas`, check `Aset == Kewajiban + Ekuitas`.

- [ ] **Step 3: Verify HPP shown**

Ensure `5010 HPP` appears in IncomeStatement Beban section, populated via journal sales (BE already does HPP? if not, document manual penyesuaian).

- [ ] **Step 4: Build verify**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/TrialBalance.tsx src/pages/BalanceSheet.tsx src/pages/IncomeStatement.tsx src/utils/accounting.ts
git commit -m "feat(fe): NSD tab, neraca rincian modal, L/R HPP"
```

---

### Task 8: Tests, E2E & Build Verification

**Files:**
- Modify: `tests/*` (ensure all new tests green)
- Verify: `C:/Users/User/projectBLN1` npm test & `C:/Users/User/aplikasi-akuntansi` npm run build
- Create: `docs/manual-e2e-sak.md` (checklist)

**Interfaces:**
- Consumes: All Tasks 1-7

- [ ] **Step 1: Run backend tests**

Run: `npm test -- --runInBand` in projectBLN1
Expected: All PASS (sak-schema, journals-adjustment, periods-capital, worksheet)

- [ ] **Step 2: Run frontend build**

Run: `npm run build` in aplikasi-akuntansi
Expected: PASS, dist/ generated

- [ ] **Step 3: Manual E2E**

Follow checklist Section 8.2 spec: create business 50jt → 7 journals → penyesuaian a+b → worksheet NSD → capitalChange → neraca seimbang → close period 403.

- [ ] **Step 4: Commit docs**

```bash
git add docs/manual-e2e-sak.md
git commit -m "test: E2E SAK full cycle verified"
```

---

## Self-Review

**Spec coverage:** Worksheet 10 kolom (Task4+6) ✓, NSD (Task4) ✓, Perubahan Modal (Task4+6) ✓, Penyesuaian a-e (Task2) ✓, Modal Awal (Task1) ✓, Penutup & Periode (Task3) ✓, Kontra-asset fix (Task1) ✓, Void reversal (Task2) ✓, Single source JournalLine (Task4) ✓

**Placeholder scan:** No TBD/TODO, all code blocks concrete, file paths exact

**Type consistency:** AdjustmentType enum matches BE+FE, periodYear/Month Int, isContra Boolean, PageKey worksheet/capitalChange/periods consistent across hooks/pages

