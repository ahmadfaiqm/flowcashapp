# Task 8 Report: Asset Hooks & Pages — FixedAssets, AssetDepreciations

**Status:** DONE

**Files Created:**
- `src/hooks/useFixedAssets.ts` — verbatim from plan Task 8 Step 1 `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:548-562`: `useQuery ["fixedAssets", businessId, page]` GET `/fixed-assets` paginated `limit 20` (`params:{page, limit}`), maps `acquisitionCost/residualValue/bookValue` via `Number()`, `create` POST `/fixed-assets` `{code:string, name:string, acquisitionDate:string YYYY-MM-DD, acquisitionCost:number, usefulLifeMonths:number, residualValue?:number}`, `update` PATCH `/fixed-assets/:id`, `remove` DELETE `/fixed-assets/:id`, `depreciate` POST `/fixed-assets/:id/depreciate` `{depreciationDate:string, depreciationAmount?:number}` with `onSuccess` invalidates `["fixedAssets", businessId]` + `["assetDepreciations", businessId]`, `listDepreciations(assetId)` returns `useQuery ["fixedAssetDepreciations", businessId, assetId]` GET `/fixed-assets/:id/depreciations`. All `enabled: !!businessId`.
- `src/hooks/useAssetDepreciations.ts` — verbatim from plan Task 8 Step 2 `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:567-575`: read-only `useAssetDepreciations(page=1, limit=20)` returns `useQuery ["assetDepreciations", businessId, page]` GET `/asset-depreciations` paginated `{data: res.data?.data ?? [], meta: res.data?.meta}`, `enabled: !!businessId`.
- `src/pages/FixedAssets.tsx` — table + create form + depreciate button per row (prompt date, call depreciate) per plan Task 8 Step 3: form fields `code, name, acquisitionDate (type date default todayISO), acquisitionCost (number), usefulLifeMonths (number), residualValue (optional number)` with validation required `code/name/acquisitionDate/acquisitionCost/usefulLifeMonths` via `showToast(..., "err")`, submit `create.mutateAsync({code, name, acquisitionDate, acquisitionCost:Number, usefulLifeMonths:Number, residualValue})`, toast `getApiErrorMessage`, reset form, table `code/name/acquisitionDate/acquisitionCost/usefulLifeMonths/bookValue` with per-row `Susutkan` button → `prompt` date `YYYY-MM-DD` regex validated + optional `prompt` nominal, calls `depreciate.mutateAsync({id, depreciationDate, depreciationAmount})`, `Hapus` button `confirm` → `remove.mutateAsync`, pagination `meta` Prev/Next, `isLoading` guard. Matches `src/pages/Products.tsx:1-99` / `src/pages/CashBankTransfers.tsx:1-113` pattern.
- `src/pages/AssetDepreciations.tsx` — table list all depreciations, filter by assetId if needed per plan Task 8 Step 4: uses `useAssetDepreciations(page,20)` + `useFixedAssets()` for asset select, local `page` state and `filterAssetId` string, `filtered = filterAssetId ? items.filter(d=>String(d.fixedAssetId)===filterAssetId) : items`, select `Semua aset` + `assets.map(a=>code - name)`, table `id/fixedAssetId/depreciationDate/depreciationAmount/accumulatedAmount/bookValue` with empty `Belum ada penyusutan`, pagination `meta` Prev/Next, `isLoading` guard.

**Files Modified:**
- `src/App.tsx:22-25,275-276` — added imports `FixedAssets` from `./pages/FixedAssets`, `AssetDepreciations` from `./pages/AssetDepreciations`; replaced placeholders `{page==="fixedAssets" && <Placeholder t="Aset Tetap" />}` → `{page==="fixedAssets" && <FixedAssets />}`, `{page==="depreciations" && <Placeholder t="Penyusutan" />}` → `{page==="depreciations" && <AssetDepreciations />}`. Kept `reportsFull/users` as placeholders for Task 9.

**Reference Verification:**
- Read `src/hooks/useProducts.ts:1-23` for hook pattern (useQuery/useMutation/useQueryClient, businessId, page/limit, api.get with params, mappers, invalidate).
- Read `src/hooks/useCashBankAccounts.ts:1-16` for pagination/map Number pattern.
- Read `src/pages/Products.tsx:1-99`, `src/pages/CashBankTransfers.tsx:1-113`, `src/pages/PurchasePayments.tsx:1-144` for page pattern (todayISO, form state, getApiErrorMessage, showToast, table, pagination, confirm/prompt).
- Read `src/types/api.ts:23-24` to confirm `FixedAsset {id,businessId,code,name,acquisitionDate,acquisitionCost,usefulLifeMonths,residualValue,accumulatedDepreciation,bookValue,isActive}` and `AssetDepreciation {id,businessId,fixedAssetId,depreciationDate,depreciationAmount,accumulatedAmount,bookValue,journalId}` match hook/payload fields.
- Read `src/App.tsx:1-309` before edit to locate import block and placeholder lines 275-278.
- Plan Task 8 spec `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:536-599` followed verbatim for hooks; pages implement Step 3-4 descriptions.

**Build:**
- `npm.cmd run build` in `C:\Users\User\aplikasi-akuntansi` — **PASS**
  - `tsc -b` — no errors
  - `vite build` — `978 modules transformed` -> `built in 6.37s` (`dist/assets/index-Cywd31dM.js 702.64 kB | gzip 198.11 kB`, `dist/assets/index-CiUzxTS2.css 10.63 kB | gzip 2.74 kB`, `dist/index.html 0.67 kB`)
  - Warnings only: chunk >500 kB advisory and dynamic import note for `src/lib/api.ts` (pre-existing, not introduced by Task 8).

**Constraints Met:**
- All requests via `lib/api.ts` interceptor Bearer + X-Business-Id, envelope `ApiEnvelope`, pagination `limit 20`.
- Hooks gated `enabled: !!businessId`, invalidate `fixedAssets` + `assetDepreciations` on depreciate.
- Pages validate required fields with `showToast(..., "err")` and `getApiErrorMessage`.
- Decimal handling via `Number()` at submit; date `YYYY-MM-DD` via `toISOString().slice(0,10)` and regex check on depreciate prompt; no new deps.

**Notes:**
- Workspace is not a git repository; no commit created — files written in place, per Task 8 Step 7 expected `git add ...` skipped due to missing repo.
- Executed via `npm.cmd run build` to bypass PowerShell execution policy (npm.ps1 blocked).
