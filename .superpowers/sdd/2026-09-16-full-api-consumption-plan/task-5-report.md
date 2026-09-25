# Task 5 Report: Master Pages — Products, Customers, Suppliers, Taxes, CashBankAccounts

**Status:** DONE

**Files Created:**
- `src/pages/Products.tsx` — verbatim from plan Task 5 Step 1: `useProducts` with `search/pagination`, form `sku/name/unit/purchasePrice/sellingPrice`, `create.mutateAsync` trimming sku/name, `remove.mutateAsync` with `confirm("Hapus?")`, toast via `useToasts` + `getApiErrorMessage`, table SKU/Nama/Stok/Aksi, pagination Prev/Next `page/meta.totalPages`. Matches `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:364-378`.
- `src/pages/Customers.tsx` — same structure: `useCustomers`, fields `code/name/phone/address/creditLimit`, POST `/customers` body `{code, name, phone?, address?, creditLimit?}`, validation `code+name wajib`, table Kode/Nama/Telepon/Aksi, search/pagination, delete confirm, toast `getApiErrorMessage`.
- `src/pages/Suppliers.tsx` — `useSuppliers`, fields `code/name/phone/address`, POST `/suppliers` body `{code, name, phone?, address?}`, same pagination/search/toast/delete pattern, table Kode/Nama/Telepon/Aksi.
- `src/pages/Taxes.tsx` — `useTaxes`, fields `code/name/rate 0-100`, validation `rate 0-100` with `isNaN` check, POST `/taxes` body `{code, name, rate}`, table Kode/Nama/Rate/Aksi, search/pagination, delete confirm, toast via `getApiErrorMessage`.
- `src/pages/CashBankAccounts.tsx` — `useCashBankAccounts` + `useAccounts` filter `Asset` (`a.category === "Aset"`), fields `coaId` (select CoA Asset), `name`, `accountNumber`, `bankName`, `openingBalance`, POST `/cash-bank-accounts` body `{coaId:number, name, accountNumber?, bankName?, openingBalance?}`, validation `coaId+name wajib`, table Nama/No. Rekening/Bank/Saldo Awal/Aksi, pagination Prev/Next `meta`.

**Files Modified:**
- `src/App.tsx:1-14,253-257` — added imports `Products`, `Customers`, `Suppliers`, `Taxes`, `CashBankAccounts` from `./pages/*`, replaced 5 placeholders `{page==="products" && <Placeholder t="Produk" />}` etc with `{page==="products" && <Products />}` etc. Remaining placeholders kept for `transfers/stock/salesInvoices/receipts/purchaseInvoices/purchasePayments/fixedAssets/depreciations/reportsFull/users` (Tasks 6-9).

**Reference Verification:**
- Read `src/hooks/useProducts.ts:7-22`, `useCustomers.ts:7-22`, `useSuppliers.ts:7-22`, `useTaxes.ts:7-22`, `useCashBankAccounts.ts:5-15` confirmed hook signatures `items/meta/page/setPage/search/setSearch/create/remove/isLoading` and `create.mutateAsync` / `remove.mutateAsync` fields.
- Read `src/hooks/useAccounts.ts:7-44` confirmed `useAccounts()` returns `accounts: Account[]` with mapped `category` field used to filter `Aset`.
- Read `src/pages/ChartOfAccounts.tsx:1-100` as UI reference (panel/form/table/link-btn pattern) and reused class names `panel`, `field`, `primary-btn`, `link-btn`, `empty-text`, `table`.
- Read `src/lib/api.ts:36-43` confirmed `getApiErrorMessage`, and `src/hooks/useToasts.ts:9-21` confirmed `useToasts().showToast`.
- Code blocks adapted verbatim from plan `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:362-405` (Task 5 Steps 1-3).

**Build:**
- `npm.cmd run build` in `C:\Users\User\aplikasi-akuntansi` — **PASS**
  - `tsc -b` — no errors
  - `vite build` — `962 modules transformed` -> `built in 4.90s` (`dist/assets/index-D3KNgTrP.js 671.24 kB | gzip 193.99 kB`, `dist/assets/index-CiUzxTS2.css 10.63 kB | gzip 2.74 kB`, `dist/index.html 0.67 kB`)
  - Warnings only: chunk >500 kB advisory and dynamic import note for `src/lib/api.ts` (pre-existing, not introduced by this task).

**Constraints Met:**
- Each page uses its hook `useX` with `businessId` gating via `enabled: !!businessId` (hook-level).
- `create.mutateAsync` / `remove.mutateAsync` with `confirm` and `showToast(getApiErrorMessage(err), "err")`.
- Pagination `limit 20`, `page 1-indexed`, `meta.totalPages` Prev/Next disabled logic.
- Products search input wired to `search/setSearch` from `useProducts`; Customers/Suppliers/Taxes likewise; CashBankAccounts pagination without search (hook has no search param).
- `CashBankAccounts` CoA select filters `category === "Aset"` via `useAccounts`.
- No new deps; reuses `lib/api.ts` interceptor Bearer + X-Business-Id.

**Notes:**
- Workspace is not a git repository; no commit created — files written in place as listed above, per Task 5 Step 5 expected `git add ...` skipped due to missing repo.
- Executed via `npm.cmd run build` to bypass PowerShell execution policy (npm.ps1 blocked by default).
