# Task 7 Report: Purchase Hooks & Pages — PurchaseInvoices, PurchasePayments, Cash-Bank Transfers Page

**Status:** DONE

**Files Created:**
- `src/hooks/usePurchaseInvoices.ts` — mirror `src/hooks/useSalesInvoices.ts:1-30`: `useQuery ["purchaseInvoices", businessId, page]` GET `/purchase-invoices` paginated `limit 20` (`params:{page, limit}`), `create` POST `/purchase-invoices` `{supplierId?:number, invoiceDate:string YYYY-MM-DD, dueDate?:string, notes?:string, lines: [{productId:number, quantity:number, unitPrice:number}]}`, `invalidate ["purchaseInvoices", businessId]`, `getById(id)` returns `useQuery ["purchaseInvoice", businessId, id]` GET `/purchase-invoices/:id`. Matches plan Task 7 Step 1 `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:497-499`.
- `src/hooks/usePurchasePayments.ts` — GET `/purchase-payments` paginated `limit 20` `queryKey ["purchasePayments", businessId, page]`, POST `/purchase-payments` `{purchaseInvoiceId?:number, supplierId?:number, paymentDate:string YYYY-MM-DD, amount:number, paymentMethod:string, cashBankAccountId?:number, notes?:string}`, invalidate `["purchasePayments", businessId]`. Matches plan Task 7 Step 1.
- `src/pages/PurchaseInvoices.tsx` — mirror `src/pages/SalesInvoices.tsx:1-172`: supplier select via `useSuppliers()` (not customers), invoiceDate default `todayISO()` YYYY-MM-DD, dueDate, notes, dynamic `lines [{productId:string, quantity:string, unitPrice:string}]` with `addLine`/`removeLine`/`updateLine`, product select via `useProducts()`, qty/unitPrice inputs, submit `create.mutateAsync({supplierId: Number(supplierId)||undefined, invoiceDate, dueDate, notes, lines: parsedLines})` where `parsedLines = lines.filter(l=>l.productId && Number(qty)>0).map({productId:Number, quantity:Number, unitPrice:Number||0})`, toast `getApiErrorMessage`, reset form, table invoiceNo/invoiceDate/supplier/total/status, pagination Prev/Next `meta`. Matches plan Task 7 Step 2.
- `src/pages/PurchasePayments.tsx` — mirror `src/pages/Receipts.tsx:1-144`: paymentDate default today, amount, paymentMethod select `cash/bank_transfer/e_wallet/other`, supplier select `useSuppliers`, purchaseInvoice select `usePurchaseInvoices`, cashBankAccount select `useCashBankAccounts`, notes, submit `create.mutateAsync({paymentDate, amount:Number(amount), paymentMethod, supplierId?, purchaseInvoiceId?, cashBankAccountId?, notes?})`, table paymentNo/paymentDate/amount/paymentMethod/notes, pagination `meta`. Matches plan Task 7 Step 2 payment fields.
- `src/pages/CashBankTransfers.tsx` — uses `useCashBankTransfers()` (GET `/cash-bank-transfers`, `transfer` POST `/cash-bank-transfers` `{fromAccountId:number, toAccountId:number, amount:number, transferDate:string YYYY-MM-DD, notes?:string}` with invalidates `cashBankTransfers` + `cashBankAccounts`) and `useCashBankAccounts()` for selects: form fromAccountId select, toAccountId select, amount, transferDate default today, notes — calls `transfer.mutateAsync`, validates required + `from !== to`, toast via `getApiErrorMessage`, table id/transferDate/from/to/amount/notes. Matches plan Task 7 Step 3.

**Files Modified:**
- `src/App.tsx:14-18,22-24,266-271` — added imports `PurchaseInvoices` from `./pages/PurchaseInvoices`, `PurchasePayments` from `./pages/PurchasePayments`, `CashBankTransfers` from `./pages/CashBankTransfers`; replaced placeholders `{page==="transfers" && <Placeholder t="Transfer Kas" />}` → `{page==="transfers" && <CashBankTransfers />}`, `{page==="purchaseInvoices" && <Placeholder t="Faktur Beli" />}` → `{page==="purchaseInvoices" && <PurchaseInvoices />}`, `{page==="purchasePayments" && <Placeholder t="Pembayaran Beli" />}` → `{page==="purchasePayments" && <PurchasePayments />}`. Kept `fixedAssets/depreciations/reportsFull/users` as placeholders for Tasks 8-9.

**Reference Verification:**
- Read `src/hooks/useSalesInvoices.ts:1-30` as template for `usePurchaseInvoices`/`usePurchasePayments` structure (page/limit/queryKey/enabled/create/invalidate/getById).
- Read `src/hooks/useReceipts.ts:1-24`, `src/hooks/useCashBankTransfers.ts:1-9` for payment/transfer mutation signatures.
- Read `src/pages/SalesInvoices.tsx:1-172`, `src/pages/Receipts.tsx:1-144` for UI pattern (todayISO, dynamic lines, selects, getApiErrorMessage, pagination).
- Read `src/App.tsx:1-38,261-276` before edit to locate placeholders and import block; confirmed `Placeholder` helper still needed for remaining tasks.
- Plan Task 7 spec `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:485-532` followed verbatim.

**Build:**
- `npm.cmd run build` in `C:\Users\User\aplikasi-akuntansi` — **PASS**
  - `tsc -b` — no errors
  - `vite build` — `974 modules transformed` -> `built in 10.00s` (`dist/assets/index-BTravo-3.js 695.10 kB | gzip 196.81 kB`, `dist/assets/index-CiUzxTS2.css 10.63 kB | gzip 2.74 kB`, `dist/index.html 0.67 kB`)
  - Warnings only: chunk >500 kB advisory and dynamic import note for `src/lib/api.ts` (pre-existing, not introduced by Task 7).

**Constraints Met:**
- All requests via `lib/api.ts` interceptor Bearer + X-Business-Id, envelope `ApiEnvelope`, pagination `limit 20`.
- Hooks gated `enabled: !!businessId`, invalidate on success (transfers also invalidates `cashBankAccounts`).
- Pages validate required fields (invoiceDate/min 1 line, paymentDate+amount, from/to/amount/date) with `showToast(..., "err")`.
- Decimal handling via `Number()` at submit; no new deps.

**Notes:**
- Workspace is not a git repository; no commit created — files written in place, per Task 7 Step 6 expected `git add ...` skipped due to missing repo.
- Executed via `npm.cmd run build` to bypass PowerShell execution policy (npm.ps1 blocked).
