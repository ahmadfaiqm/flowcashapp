# Task 9 Report: Reports Full (10 endpoints) & Users & Polish

**Status:** DONE

**Files Created:**
- `src/hooks/useReportsFull.ts` — 9 hooks: `useProfitLoss`, `useSalesReport`, `usePurchaseReport`, `useStockReport`, `useArReport`, `useApReport`, `useBalanceSheetReport`, `useCashFlowReport`, `useFixedAssetReport`; each `useQuery ["reports", type, businessId, params]` GET `/reports/*`, `enabled: !!businessId`, via `lib/api.ts` interceptor Bearer + X-Business-Id. Covers 10 backend endpoints (`/profit-loss`, `/sales`, `/purchase`, `/stock`, `/ar`, `/ap`, `/balance-sheet`, `/cash-flow`, `/fixed-assets` + alias `/fixed-asset`).
- `src/hooks/useUsers.ts` — `useUsers(): {items, isLoading, create}`; `GET /users` public list, `POST /users` auth + validate, invalidate `["users"]`, type `AppUser {id,name,email}`.
- `src/pages/ReportsFull.tsx` — tabs `profit-loss/sales/purchase/stock/ar/ap/balance-sheet/cash-flow/fixed-assets` (9 tabs), date filters `from/to` (YYYY-MM-DD), per-tab query switch, `JsonBlock` pretty-print, loading/error guards, endpoint hint.
- `src/pages/Users.tsx` — table `ID/Nama/Email`, create form `name/email/password` (validate required, password min 6), `create.mutateAsync`, `showToast` + `getApiErrorMessage`.

**Files Modified:**
- `src/App.tsx:22-26,277-280` — add imports `ReportsFull`, `Users`; replace placeholders `{page==="reportsFull" && <Placeholder>}` → `<ReportsFull />`, `{page==="users" && <Placeholder>}` → `<Users />`.
- `src/hooks/useBusiness.tsx:91-117` — extend `selectBusiness` invalidate: now clears `accounts,journals,dashboard,reports,products,customers,suppliers,taxes,cashBankAccounts,cashBankTransfers,stockMovements,salesInvoices,receipts,purchaseInvoices,purchasePayments,fixedAssets,assetDepreciations,users` (17 keys).

**Reference Verification:**
- Read `src/modules/reports/reports.routes.js:14-24` to confirm 10 endpoints and `authorizeRoles('owner','akuntan')`.
- Read `src/modules/reports/reports.controller.js:1-49` to confirm `success(res, data, msg, data.meta)` shape for sales/purchase/stock/fixed-assets meta.
- Read `src/modules/users/users.routes.js:1-14` to confirm `GET /` public, `GET /:id` auth, `POST /` auth+validate.
- Read `src/hooks/useReports.ts:1-27` and `src/hooks/useBusiness.tsx:91-99` for existing queryKey pattern.
- Plan Task 9 `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:603-682` followed verbatim.

**Build:**
- `npm.cmd run build` in `C:\Users\User\aplikasi-akuntansi` — **PASS**
  - `tsc -b` — no errors
  - `vite build` — `982 modules transformed` -> `built in 5.14s` (`assets/index-DPivWcZa.js 709.84 kB | gzip 199.50 kB`)
  - Warnings only: chunk >500 kB advisory + dynamic import note for `lib/api.ts` (pre-existing).

**Constraints Met:**
- No new deps, YAGNI, DRY, interceptor Bearer+X-Business-Id, enabled `!!businessId`, pagination meta passthrough, toast error via `getApiErrorMessage`.
- Backend no schema change, no new endpoint.

**Notes:**
- Workspace not a git repo; no commit — files written in place per Task 9 Step 7.
