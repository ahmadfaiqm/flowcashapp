# Task 4 Report: Master Hooks — Cash-Bank Accounts & Transfers, Stock Movements

**Status:** DONE

**Files Created:**
- `src/hooks/useCashBankAccounts.ts` — verbatim from plan Task 4 Step 1: `useCashBankAccounts()` with `useBusiness().businessId`, `useQueryClient`, `useState page=1/limit=20`, `queryKey ["cashBankAccounts", businessId, page]`, `api.get("/cash-bank-accounts", {params:{page, limit}})`, `items.map((r:any)=>({...r, openingBalance: Number(r.openingBalance)||0}))`, `meta` fallback `{total: items.length, page, limit, totalPages:1}`, `enabled: !!businessId`, `create POST /cash-bank-accounts` body `{coaId:number; name:string; accountNumber?:string; bankName?:string; openingBalance?:number}`, `update PATCH /cash-bank-accounts/:id` `({id, ...p}:{id:number}&any)`, `remove DELETE /cash-bank-accounts/:id`, invalidate `["cashBankAccounts", businessId]`, return `{items, meta, page, setPage, isLoading, create, update, remove}`.
- `src/hooks/useCashBankTransfers.ts` — verbatim from plan Task 4 Step 2: `useCashBankTransfers()` with `useBusiness().businessId`, `useQueryClient`, `queryKey ["cashBankTransfers", businessId]`, `api.get("/cash-bank-transfers")` returning `res.data?.data ?? []`, `enabled: !!businessId`, `transfer POST /cash-bank-transfers` body `{fromAccountId:number; toAccountId:number; amount:number; transferDate:string; notes?:string}` (canonical `/cash-bank-transfers`, alias `/cash-bank-accounts/transfer` noted in plan), `onSuccess` invalidates both `["cashBankTransfers", businessId]` and `["cashBankAccounts", businessId]`, return `{items, isLoading, transfer}`.
- `src/hooks/useStockMovements.ts` — verbatim from plan Task 4 Step 3: `useStockMovements()` with `useBusiness().businessId`, `useQueryClient`, `useState page=1/limit=20`, `queryKey ["stockMovements", businessId, page]`, `api.get("/stock-movements", {params:{page, limit}})`, `enabled: !!businessId`, `createAdjustment POST /stock-movements` body `{productId:number; quantity:number; unitCost?:number; movementType:string; notes?:string}`, invalidate `["stockMovements", businessId]`, return `{items, meta, page, setPage, isLoading, createAdjustment}`.

**Reference Verification:**
- Read `src/hooks/useProducts.ts:1-23` as reference pattern (useQuery + enabled !!businessId + useMutation invalidate ["products", businessId], limit 20, page 1).
- Read `src/lib/api.ts:1-43` confirmed `api` axios instance with `VITE_API_URL` and Bearer + X-Business-Id interceptors.
- Read `src/hooks/useBusiness.tsx:1-157` confirmed `useBusiness().businessId` and `businessId` nullability.
- Code blocks copied verbatim from plan `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:284-333` (Steps 1-3).

**Build:**
- `npm run build` in `C:\Users\User\aplikasi-akuntansi` — **PASS**
  - `tsc -b` — no errors
  - `vite build` — `952 modules transformed` -> `built in 5.19s` (`dist/assets/index-Ma8LIsn3.js 652.71 kB | gzip 191.82 kB`, `dist/assets/index-CiUzxTS2.css 10.63 kB | gzip 2.74 kB`, `dist/index.html 0.67 kB`)
  - Warnings only: chunk >500 kB advisory and dynamic import note for `src/lib/api.ts` (pre-existing, not introduced by this task).

**Constraints Met:**
- `useBusiness().businessId`, `useQueryClient`, `enabled: !!businessId`, `limit 20`, `page 1-indexed` — all satisfied per file.
- Pagination with `page/limit` in `queryKey` for cache isolation (cashBankAccounts, stockMovements).
- Invalidation uses `["cashBankAccounts", businessId]`, `["cashBankTransfers", businessId]`, `["stockMovements", businessId]` prefix to clear all pages.
- `useCashBankTransfers.transfer` invalidates both `cashBankTransfers` and `cashBankAccounts` as required.
- No new dependencies; reuses `lib/api.ts` interceptor (`Authorization: Bearer`, `X-Business-Id`).
- Decimal handling via `Number(r.openingBalance)||0` in cashBankAccounts mapper inline.

**Notes:**
- Workspace is not a git repository; no commit created — files written in place as listed above, per Task 4 Step 5 expected `git add ...` skipped due to missing repo.
- Executed via `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; npm run build` to bypass PowerShell execution policy (npm.ps1 blocked by default).
