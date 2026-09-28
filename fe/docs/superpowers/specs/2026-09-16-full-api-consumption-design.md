# Full API Consumption — Aplikasi Akuntansi × projectBLN1

**Tanggal:** 2026-09-16
**Status:** Draft (menunggu review user sebelum writing-plans)
**Repo backend:** `C:/Users/User/projectBLN1` (Express 4 + Prisma 5 + PostgreSQL)
**Repo frontend:** `C:/Users/User/aplikasi-akuntansi` (Vite 5 + React 18 + TS 5 + TanStack Query 5 + axios)

---

## 1. Ringkasan

Mengonsumsi **87 endpoint di 21 modul** yang di-mount di `projectBLN1/src/app.js:28-52` ke `aplikasi-akuntansi`. Saat ini baru 7 modul terkoneksi (`auth`, `businesses`, `chart-of-accounts`, `journals`, `dashboard`, `reports` parsial 2/10, `health`). Sisa **14 modul** belum ada UI/hooks sama sekali.

**Tujuan:** semua API dapat dipakai dari frontend dengan pola yang konsisten, business-scoped (`X-Business-Id`), role-aware, paginated, dan dengan Sidebar **parent-child dropdown 4 parent** sesuai permintaan user.

---

## 2. Konteks & Inventaris

### 2.1 Mount point (app.js)
| Prefix | Router |
|---|---|
| `GET /` | welcome |
| `/api/v1/health` | health |
| `/api/v1/users` | users (list public, get/create auth) |
| `/api/v1/auth` | register, login, me, change-password, profile |
| `/api/v1/businesses` | CRUD + myRole |
| `/api/v1/chart-of-accounts` | CRUD |
| `/api/v1/taxes` | CRUD |
| `/api/v1/cash-bank-accounts` | CRUD + POST /transfer (alias) |
| `/api/v1/cash-bank-transfers` | POST transfer, GET list |
| `/api/v1/products` | CRUD |
| `/api/v1/customers` | CRUD |
| `/api/v1/suppliers` | CRUD |
| `/api/v1/stock-movements` | list, getById, createAdjustment |
| `/api/v1/sales-invoices` | list, getById, create |
| `/api/v1/receipts` | list, getById, create |
| `/api/v1/purchase-invoices` | list, getById, create |
| `/api/v1/purchase-payments` | list, getById, create |
| `/api/v1/journals` | list, getById, createManual, delete |
| `/api/v1/fixed-assets` | CRUD + depreciate + listDepreciations |
| `/api/v1/asset-depreciations` | list, getById (read-only) |
| `/api/v1/dashboard` | getSummary |
| `/api/v1/reports` | profit-loss, sales, purchase, stock, ar, ap, balance-sheet, cash-flow, fixed-assets/ fixed-asset (alias) |

### 2.2 Auth & Scoping
- `lib/api.ts:11-16` inject `Authorization: Bearer <token>` (`akuntansi.token`) dan `X-Business-Id` (`akuntansi.businessId`) via interceptor.
- Middleware backend: `auth` → `requireBusiness` → `authorizeRoles`. Grup:
  - `owner,akuntan`: chart-of-accounts, taxes, cash-bank*, journals, fixed-assets, asset-depreciations, dashboard, reports
  - `owner,kasir`: products, customers, suppliers, stock-movements, sales-invoices, receipts, purchase-invoices, purchase-payments
- Envelope: `ApiEnvelope<T>` di `src/types/api.ts:1-6` → `{success, message, data, meta?}`. Pagination meta `{total, page, limit, totalPages}` dari `common/utils/pagination.js`.

### 2.3 Frontend existing
- `App.tsx:24-44` `AppInner` + `Sidebar.tsx:3-12` 8 halaman flat, `PageKey` di `types.ts:39-47`.
- Hooks: `useAccounts.ts:11-28`, `useJournals.ts:11-52`, `useBusiness.tsx:47-52`, `useDashboard.ts:21-28`, `useReports.ts` (profit-loss, balance-sheet), `useAuth.tsx`.
- `queryClient.ts:3-14` staleTime 30s, retry 1.

---

## 3. Keputusan Desain

### 3.1 Pendekatan terpilih: Modular per-modul (A)
Mengikuti pola existing `useAccounts`/`useJournals`. Tiap modul dapat hook + page + type + mapper sendiri. Alasan: type-safe, mudah direview, invalidate granular, selaras dengan codebase. YAGNI: tanpa generic factory dan tanpa codegen OpenAPI.

Alternatif ditolak:
- B Generic factory → banyak `any` karena payload heterogen.
- C Codegen zod → belum ada spec, overkill.

### 3.2 Prinsip
- Satu hook = satu entitas, `queryKey: [entity, businessId, params]`, `enabled: !!businessId`.
- Decimal dari Prisma (string) → `Number()` di mapper.
- Validasi ringan di frontend, zod backend sebagai source of truth.
- Toast via `useToasts` + `getApiErrorMessage` (`lib/api.ts:36-43`).

---

## 4. Arsitektur & Aliran Data

```
UI Page (Products.tsx) → hook useProducts (useQuery/useMutation)
  → api.get/post/patch/delete("/products", {params, data})
  → axios interceptor (Bearer + X-Business-Id)
  → Express /api/v1/products (auth, requireBusiness, authorizeRoles)
  → controller → service → repository → Prisma (businessId scoped)
  → ApiResponse {success, data, meta} → mapper → React Query cache
  → invalidate + toast
```

Business switch (`useBusiness.tsx:91-99`) invalidate semua `queryKey` domain.

---

## 5. Perubahan File

### 5.1 Tipe & Mapper
- `src/types/api.ts` — tambah:
  ```ts
  export interface PaginatedMeta { total:number; page:number; limit:number; totalPages:number }
  export interface ApiList<T> { data:T[]; meta:PaginatedMeta }
  // 14 entitas: Product {id, sku, name, unit, purchasePrice, sellingPrice, stock, minimumStock, isActive}, Customer {id, code, name, phone, address, creditLimit, isActive}, Supplier {id, code, name, phone, address, isActive}, Tax {id, code, name, rate, isActive}, CashBankAccount {id, coaId, name, accountNumber, bankName, openingBalance, isActive}, CashBankTransfer {id, ...}, StockMovement {id, productId, quantity, unitCost, movementType, referenceType, notes}, SalesInvoice {id, invoiceNo, invoiceDate, dueDate, customerId, totalAmount, status, lines[]}, Receipt {id, receiptNo, receiptDate, amount, paymentMethod, customerId, salesInvoiceId, cashBankAccountId}, PurchaseInvoice {id, invoiceNo, invoiceDate, supplierId, totalAmount, status, lines[]}, PurchasePayment {id, paymentNo, paymentDate, amount, paymentMethod, supplierId, purchaseInvoiceId, cashBankAccountId}, FixedAsset {id, code, name, acquisitionDate, acquisitionCost, usefulLifeMonths, residualValue, bookValue, accumulatedDepreciation, isActive}, AssetDepreciation {id, fixedAssetId, depreciationDate, depreciationAmount, accumulatedAmount, bookValue, journalId}
  export type PaymentMethod = "cash"|"bank_transfer"|"e_wallet"|"other"
  ```
- `src/utils/mappers.ts` — fungsi `toNumber`, mapper per entitas, `mapProduct`, `mapCustomer`, dst, `formatDate` helper.
- `src/types.ts` — `PageKey` tambah 14 key: `products|customers|suppliers|taxes|cashBank|transfers|stock|salesInvoices|receipts|purchaseInvoices|purchasePayments|fixedAssets|depreciations|reportsFull|users`

### 5.2 Hooks (14 file, pola useAccounts)
Tiap `src/hooks/useX.ts`:
```ts
export function useX() {
  const {businessId}=useBusiness(); const qc=useQueryClient();
  const list = useQuery({queryKey:[key, businessId, page, limit, search], queryFn:()=>api.get("/products",{params:{page,limit,search}}).then(r=>({data: r.data.data.map(map), meta: r.data.meta})), enabled:!!businessId});
  const create = useMutation({mutationFn:(p)=>api.post("/products", p).then(r=>r.data.data), onSuccess:()=>qc.invalidateQueries({queryKey:[key, businessId]})});
  const update = useMutation({mutationFn:({id,p})=>api.patch(`/products/${id}`, p), onSuccess:()=>qc.invalidateQueries({queryKey:[key, businessId]})});
  const remove = useMutation({mutationFn:(id)=>api.delete(`/products/${id}`), onSuccess:()=>qc.invalidateQueries({queryKey:[key, businessId]})});
  return {items:list.data?.data??[], meta:list.data?.meta, ...};
}
```
Catatan khusus:
- `useCashBankAccounts` — create butuh `coaId` (select dari CoA Asset), `POST /cash-bank-accounts/transfer` via `useCashBankTransfers`.
- `useStockMovements` — hanya list/get/createAdjustment (tidak ada patch/delete).
- `useSalesInvoices`/`useReceipts`/`usePurchaseInvoices`/`usePurchasePayments` — create dengan `lines[]`, `invoiceNo` auto jika tidak isi (backend `prefix`/`numbering.js`).
- `useFixedAssets` — tambah `depreciate` mutation `POST /fixed-assets/:id/depreciate`, `listDepreciations` query.
- `useReportsFull` — 10 query terpisah (`/reports/profit-loss` ... `/reports/cash-flow`), masing-masing `queryKey: ["reports", type, businessId, params]`.
- `useUsers` — list/get/create (admin, `GET /users` public list tetap dipakai).

### 5.3 Pages (14 file)
Tiap `src/pages/X.tsx` — layout konsisten dengan `ChartOfAccounts.tsx`:
- Header + search + pagination (page, limit 20, meta.totalPages)
- Tabel, loading/empty state
- Form create/edit (controlled, validasi required, number min 0, date YYYY-MM-DD), select relasi (customer, product, supplier, coa, cashBankAccount)
- Delete confirm, toast sukses/gagal via `getApiErrorMessage`
- Khusus: `SalesInvoices` form lines dinamis (product, qty, unitPrice), `Receipts` pilih salesInvoice, `FixedAssets` tombol depreciate.

### 5.4 Navigasi
- `src/components/Sidebar.tsx` — ubah `NAV` ke struktur parent:
  ```ts
  const NAV_GROUPS = [
    {key:"master", label:"Master Data", children:[{key:"products",label:"Produk"}, {key:"customers",label:"Pelanggan"}, {key:"suppliers",label:"Supplier"}, {key:"taxes",label:"Pajak"}, {key:"cashBank",label:"Kas & Bank"}]},
    {key:"sales", label:"Penjualan", children:[{key:"salesInvoices",label:"Faktur Jual"}, {key:"receipts",label:"Pelunasan"}, {key:"stock",label:"Stok"}]},
    {key:"purchase", label:"Pembelian", children:[{key:"purchaseInvoices",label:"Faktur Beli"}, {key:"purchasePayments",label:"Pembayaran Beli"}]},
    {key:"asset", label:"Aset & Laporan", children:[{key:"fixedAssets",label:"Aset Tetap"}, {key:"depreciations",label:"Penyusutan"}, {key:"reportsFull",label:"Laporan"}]},
  ]
  // plus existing: dashboard, accounts, journal, ledger, trial, income, balance, profile, users
  ```
  State `openGroups: Record<string, boolean>` toggle dropdown. `onNavigate` tetap `PageKey`.
- `src/App.tsx` — `const [page,setPage]=useState<PageKey>("dashboard")`, `isDataLoading` gabung semua hooks jika perlu, render kondisional `page==="products" && <Products/>` dst. `businessId` switch invalidate semua 14 queryKey.

### 5.5 Tidak diubah
- `src/lib/api.ts`, `src/lib/queryClient.ts`, `src/hooks/useBusiness.tsx` (hanya tambah invalidate key), `prisma/schema.prisma`.

---

## 6. Validasi & Error Handling

- Frontend: required, min length, number >=0, date regex `^\d{4}-\d{2}-\d{2}$` sebelum mutate. Pesan via `showToast`.
- Backend: zod schema (`products.validation.js:3-11`, `sales-invoices.validation.js:3-25`, dll) → 400 dengan `message` → `getApiErrorMessage` tangkap.
- 401 → interceptor `lib/api.ts:22-30` clear token (kecuali login/register).
- 403 role → toast "Akses ditolak untuk role kasir/akuntan".
- 404/409 (sku/code duplikat, stok tidak cukup) → toast spesifik.

---

## 7. Pagination & Query

- Params: `page` (1-indexed), `limit` (default 20), `search` (optional), `isActive` filter jika ada.
- Backend `pagination.js` → `meta`. Frontend simpan `page` di state lokal per page, reset ke 1 saat search berubah.
- `staleTime 30s`, `retry 1`, `refetchOnWindowFocus false` (dari `queryClient.ts`).

---

## 8. Keamanan & Role

- UI hide menu: `const role = useQuery(["role", businessId], ()=>api.get(`/businesses/${businessId}/role`))`, jika `kasir` hide Taxes/CashBank/FixedAssets/Reports akuntan; jika `akuntan` hide Penjualan/Pembelian kasir. Backend tetap enforce.
- Tidak simpan token di query cache.

---

## 9. Testing & Verifikasi

- **Manual (wajib sebelum selesai):** jalankan `projectBLN1: npm run dev` (DATABASE_URL dari `.env`), `aplikasi-akuntansi: npm run dev`, login/register, buat bisnis, CRUD tiap 14 modul, cek pagination, search, toast error, ganti bisnis, cek role 403.
- **Build:** `npm run build` (tsc -b && vite build) harus lolos.
- **Tidak ada test otomatis Fase ini** (bisa tambah vitest untuk mappers di iterasi berikutnya).

---

## 10. Non-Goals (Fase ini tidak mencakup)

- Tidak ubah schema Prisma, tidak tambah endpoint backend.
- Tidak buat OpenAPI generator.
- Tidak ubah auth flow (tetap Bearer).
- Tidak implement real-time / websocket.

---

## 11. Risiko & Mitigasi

- **Banyak file baru (28+)** → pecah implementasi per grup parent, review per PR kecil.
- **Payload heterogen** → mapper + type per modul, jangan generic.
- **Sidebar panjang** → dropdown + scroll, simpan open state di localStorage.
- **Decimal string** → selalu `Number()` di mapper, tampil `toLocaleString("id-ID")`.

---

## 12. Urutan Implementasi (untuk writing-plans)

1. Types + mappers + queryClient invalidate
2. Sidebar dropdown + PageKey + App routing skeleton
3. Grup Master (products, customers, suppliers, taxes, cash-bank)
4. Grup Penjualan (sales-invoices, receipts, stock-movements)
5. Grup Pembelian (purchase-invoices, purchase-payments, cash-bank-transfers)
6. Grup Aset (fixed-assets, asset-depreciations)
7. Laporan lengkap (10 endpoint reports) + Users
8. Polish: search, pagination, role hide, toast, build verify

---

## 13. Self-Review Checklist

- [x] Tidak ada TBD/TODO placeholder
- [x] Konsisten dengan `app.js` mount points dan `schema.prisma` enums
- [x] Scope = satu spec untuk full consumption (sesuai approval user 2026-09-16)
- [x] Tidak bertentangan: parent 4 grup mencakup semua 14 modul baru
- [x] Verifikasi file path absolut via `read`/`glob` sebelum tulis

---

**Menunggu persetujuan tertulis user pada spec ini sebelum invoke `writing-plans`.**
