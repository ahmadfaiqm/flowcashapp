# Task 6 Report: Sales Hooks & Pages — SalesInvoices, Receipts, StockMovements Page

**Status:** DONE

**Files Created:**
- `src/hooks/useSalesInvoices.ts` — verbatim from plan Task 6 Step 1: `useQuery ["salesInvoices", businessId, page]` GET `/sales-invoices` paginated `limit 20`, `create` POST `/sales-invoices` `{customerId?, invoiceDate YYYY-MM-DD, dueDate?, notes?, lines: [{productId, quantity, unitPrice}]}`, `invalidate salesInvoices`, `getById(id)` returns `useQuery ["salesInvoice", businessId, id]` GET `/sales-invoices/:id`. Matches `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:430-444`.
- `src/hooks/useReceipts.ts` — GET `/receipts` paginated, POST `/receipts` `{salesInvoiceId?, customerId?, receiptDate YYYY-MM-DD, amount, paymentMethod, cashBankAccountId?, notes?}`, queryKey `["receipts", businessId, page]`, invalidate `["receipts", businessId]`. Matches plan Task 6 Step 2.
- `src/pages/SalesInvoices.tsx` — customer select via `useCustomers()`, invoiceDate default `todayISO()` YYYY-MM-DD, dueDate, notes, dynamic `lines [{productId, quantity, unitPrice}]` with add/remove (`addLine`/`removeLine`/`updateLine`), product select via `useProducts()`, qty/unitPrice inputs, submit via `create.mutateAsync({customerId: Number(cust)||undefined, invoiceDate, dueDate, notes, lines: lines.map(...)})`, toast `getApiErrorMessage`, table invoiceNo/invoiceDate/customer/total/status, pagination Prev/Next `meta`.
- `src/pages/Receipts.tsx` — receiptDate default today, amount, paymentMethod select `cash/bank_transfer/e_wallet/other`, customer select `useCustomers`, salesInvoice select `useSalesInvoices`, cashBankAccount select `useCashBankAccounts`, notes, submit `create.mutateAsync({receiptDate, amount:Number(amount), paymentMethod, customerId?, salesInvoiceId?, cashBankAccountId?, notes?})`, table receiptNo/receiptDate/amount/paymentMethod/notes, pagination.
- `src/pages/StockMovements.tsx` — product select `useProducts`, quantity, unitCost, movementType `in/out/adjustment`, notes, table list `movementDate/product/quantity/movementType/notes`, form calls `createAdjustment.mutateAsync({productId, quantity, unitCost?, movementType, notes?})`, toast via `getApiErrorMessage`, pagination `meta`.

**Files Modified:**
- `src/App.tsx:14-18,263-265` — added imports `SalesInvoices` from `./pages/SalesInvoices`, `Receipts` from `./pages/Receipts`, `StockMovements` from `./pages/StockMovements`; replaced placeholders `{page==="stock" && <Placeholder t="Stok" />}` → `{page==="stock" && <StockMovements />}`, `{page==="salesInvoices" && <Placeholder t="Faktur Jual" />}` → `{page==="salesInvoices" && <SalesInvoices />}`, `{page==="receipts" && <Placeholder t="Pelunasan" />}` → `{page==="receipts" && <Receipts />}`. Kept `transfers/purchaseInvoices/purchasePayments/fixedAssets/depreciations/reportsFull/users` as placeholders for Tasks 7-9.

**Reference Verification:**
- Read `src/pages/Products.tsx:1-99` for form pattern (panel/field/primary-btn/table, `useToasts`+`getApiErrorMessage`, `confirm`, pagination).
- Read `src/hooks/useProducts.ts:1-23`, `src/hooks/useCustomers.ts:1-23`, `src/hooks/useCashBankAccounts.ts:1-16`, `src/hooks/useStockMovements.ts:1-10` confirmed `items/meta/page/setPage/isLoading/create` signatures and `businessId` gating.
- Read `src/App.tsx:29-35,258-272` confirmed placeholder locations before wiring.
- Plan Task 6 spec `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:420-481` followed verbatim for hook endpoints/payloads/pages.

**Build:**
- `npm.cmd run build` in `C:\Users\User\aplikasi-akuntansi` — **PASS**
  - `tsc -b` — no errors
  - `vite build` — `968 modules transformed` -> `built in 6.79s` (`dist/assets/index-DW2aAq8p.js 683.36 kB | gzip 196.04 kB`, `dist/assets/index-CiUzxTS2.css 10.63 kB | gzip 2.74 kB`, `dist/index.html 0.67 kB`)
  - Warnings only: chunk >500 kB advisory and dynamic import note for `src/lib/api.ts` (pre-existing, not introduced by Task 6).

**Constraints Met:**
- All requests via `lib/api.ts` interceptor Bearer + X-Business-Id, envelope `ApiEnvelope`, pagination `limit 20`.
- `useSalesInvoices`/`useReceipts`/`useStockMovements` enabled `!!businessId`, invalidate on success.
- `SalesInvoices` lines validation `minimal satu baris`, invoiceDate required; `Receipts` receiptDate+amount required; `StockMovements` product+qy required.
- No new deps; reuses `useCustomers`/`useProducts`/`useCashBankAccounts`.

**Notes:**
- Workspace is not a git repository; no commit created — files written in place, per Task 6 Step 7 expected `git add ...` skipped due to missing repo.
- Executed via `npm.cmd run build` to bypass PowerShell execution policy (npm.ps1 blocked).
