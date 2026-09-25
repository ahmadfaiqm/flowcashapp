# Task 3 Report: Master Hooks — Products, Customers, Suppliers, Taxes

**Status:** DONE

**Files Created:**
- `src/hooks/useProducts.ts` — verbatim from plan Task 3 Step 1: `useProducts(searchInit="")` with `useBusiness().businessId`, `useQueryClient`, `useState page=1/search/limit=20`, `queryKey ["products", businessId, page, limit, search]`, `api.get("/products", {params:{page, limit, search: search||undefined}})`, `items.map(mapProduct) as Product[]`, `meta` fallback, `enabled: !!businessId`, `create POST /products` body `{sku, name, unit?, purchasePrice?, sellingPrice?}`, `update PATCH /products/:id`, `remove DELETE /products/:id`, invalidate `["products", businessId]`, return `{items, meta, page, setPage, search, setSearch, isLoading, error, create, update, remove, refetch}`. Imports: `mapProduct` from `../utils/mappers`, `Product` from `../types/api`, `useBusiness` from `./useBusiness`.
- `src/hooks/useCustomers.ts` — same pattern: `queryKey ["customers", businessId, page, limit, search]`, `api.get("/customers", {params:{page, limit, search}})`, `mapCustomer`/`Customer`, `create POST /customers` body `{code, name, phone?, address?, creditLimit?}`, `update PATCH /customers/:id`, `remove DELETE /customers/:id`, invalidate `["customers", businessId]`, `enabled !!businessId`, `limit 20`, `page 1`.
- `src/hooks/useSuppliers.ts` — `queryKey ["suppliers", businessId, page, limit, search]`, `api.get("/suppliers")`, `mapSupplier`/`Supplier`, `create POST /suppliers` body `{code, name, phone?, address?}`, `update PATCH /suppliers/:id`, `remove DELETE /suppliers/:id`, invalidate `["suppliers", businessId]`.
- `src/hooks/useTaxes.ts` — `queryKey ["taxes", businessId, page, limit, search]`, `api.get("/taxes")`, `mapTax`/`Tax`, `create POST /taxes` body `{code, name, rate}`, `update PATCH /taxes/:id`, `remove DELETE /taxes/:id`, invalidate `["taxes", businessId]`.

**Reference Verification:**
- Read `src/hooks/useAccounts.ts:1-45` as reference pattern (useQuery + enabled !!businessId + useMutation invalidate ["accounts", businessId]).
- Read `src/utils/mappers.ts:87-99` confirmed `mapProduct`, `mapCustomer`, `mapSupplier`, `mapTax` and `toNum` exist from Task 1.
- Read `src/types/api.ts:10-13` confirmed `Product`, `Customer`, `Supplier`, `Tax` interfaces.
- Code blocks copied verbatim from plan `docs/superpowers/plans/2026-09-16-full-api-consumption-plan.md:226-259`, adjusted only for entity-specific imports/types/endpoints as specified in Step 2 comment.

**Build:**
- `npm.cmd run build` in `C:\Users\User\aplikasi-akuntansi` — **PASS**
  - `tsc -b` — no errors
  - `vite build` — `✓ 952 modules transformed` → `✓ built in 5.19s` (`dist/assets/index-Ma8LIsn3.js 652.71 kB | gzip 191.82 kB`, `dist/assets/index-CiUzxTS2.css 10.63 kB | gzip 2.74 kB`, `dist/index.html 0.67 kB`)
  - Warnings only: chunk >500 kB advisory and dynamic import note for `src/lib/api.ts` (pre-existing, not introduced by this task).

**Constraints Met:**
- `useBusiness().businessId`, `useQueryClient`, `enabled !!businessId`, `limit 20`, `default page 1` — all satisfied per file.
- Pagination with `search` state and `page/limit/search` in `queryKey` for cache isolation.
- Invalidation uses `["<entity>", businessId]` prefix to clear all pages/searches.
- No new dependencies; reuses `lib/api.ts` interceptor (`Authorization: Bearer`, `X-Business-Id`).
- `Decimal` handling via `mapProduct`/`mapCustomer`/etc `toNum` (Number conversion).

**Notes:**
- Workspace is not a git repository (`fatal: not a git repository`); no commit created — files written in place as listed above, per Task 3 Step 4 expected `git add ...` skipped due to missing repo.
- `useTaxes` create body is `{code, name, rate}` exactly as plan specifies; update/remove mirror other masters with `Record<string,unknown>` generic patch.
