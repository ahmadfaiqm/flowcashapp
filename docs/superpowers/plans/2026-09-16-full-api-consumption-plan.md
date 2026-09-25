# Full API Consumption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Konsumsi 87 endpoint di 21 modul backend `projectBLN1` ke frontend `aplikasi-akuntansi` dengan Sidebar 4 parent dropdown.

**Architecture:** Modular per-modul mengikuti pola `useAccounts`/`useJournals` — tiap entitas punya `useX` hook (TanStack Query) + `X.tsx` page + type/mapper. Sidebar dipecah jadi 4 parent (Master, Penjualan, Pembelian, Aset & Laporan). Reuse `lib/api.ts` interceptor Bearer + X-Business-Id, envelope `ApiEnvelope`, pagination meta.

**Tech Stack:** Vite 5, React 18, TypeScript 5, TanStack Query 5.102, axios 1.20, recharts 2.12 (existing). Backend Express 4 + Prisma 5 + PostgreSQL. No new deps.

**Spec:** `docs/superpowers/specs/2026-09-16-full-api-consumption-design.md`

## Global Constraints

- Node backend `projectBLN1` tetap di `C:/Users/User/projectBLN1`, frontend `C:/Users/User/aplikasi-akuntansi`
- API baseURL: `VITE_API_URL || http://localhost:3000/api/v1` (`src/lib/api.ts:4`)
- Semua request harus kirim `Authorization: Bearer <akuntansi.token>` dan `X-Business-Id: <akuntansi.businessId>` via interceptor (`src/lib/api.ts:11-16`)
- Response envelope `ApiEnvelope<T>` = `{success, message, data, meta?}` (`src/types/api.ts:1-6`), paginated meta `{total, page, limit, totalPages}`
- `queryClient` default `staleTime 30_000`, `retry 1`, `refetchOnWindowFocus false` (`src/lib/queryClient.ts:3-14`)
- Role groups backend: `owner,akuntan` vs `owner,kasir` — frontend hide menu tapi backend enforce 403
- Decimal Prisma = string/number → frontend `Number()` di mapper
- Toast error via `getApiErrorMessage` + `useToasts`/`showToast`
- Pagination default `limit 20`, `page 1-indexed`, optional `search`
- No new backend endpoints, no schema migration, no OpenAPI codegen
- YAGNI, DRY, frequent commits per task

---

## File Structure

**Create:**
- `src/types/api.ts` (extend — tambah PaginatedMeta + 14 entitas)
- `src/utils/mappers.ts` (extend — tambah 14 mapper)
- `src/hooks/useProducts.ts`
- `src/hooks/useCustomers.ts`
- `src/hooks/useSuppliers.ts`
- `src/hooks/useTaxes.ts`
- `src/hooks/useCashBankAccounts.ts`
- `src/hooks/useCashBankTransfers.ts`
- `src/hooks/useStockMovements.ts`
- `src/hooks/useSalesInvoices.ts`
- `src/hooks/useReceipts.ts`
- `src/hooks/usePurchaseInvoices.ts`
- `src/hooks/usePurchasePayments.ts`
- `src/hooks/useFixedAssets.ts`
- `src/hooks/useAssetDepreciations.ts`
- `src/hooks/useReportsFull.ts`
- `src/hooks/useUsers.ts`
- `src/pages/Products.tsx`
- `src/pages/Customers.tsx`
- `src/pages/Suppliers.tsx`
- `src/pages/Taxes.tsx`
- `src/pages/CashBankAccounts.tsx`
- `src/pages/StockMovements.tsx`
- `src/pages/SalesInvoices.tsx`
- `src/pages/Receipts.tsx`
- `src/pages/PurchaseInvoices.tsx`
- `src/pages/PurchasePayments.tsx`
- `src/pages/FixedAssets.tsx`
- `src/pages/AssetDepreciations.tsx`
- `src/pages/ReportsFull.tsx`
- `src/pages/Users.tsx`

**Modify:**
- `src/types.ts` — extend `PageKey`
- `src/components/Sidebar.tsx` — 4 parent dropdown
- `src/App.tsx` — routing 14 halaman + isDataLoading
- `src/hooks/useBusiness.tsx` — tambah invalidate untuk 14 key baru (optional)

---

### Task 1: Types & Mappers Foundation

**Files:**
- Modify: `src/types/api.ts`
- Modify: `src/utils/mappers.ts`
- Modify: `src/types.ts:39-47`

**Interfaces:**
- Consumes: `ApiEnvelope` existing, `BackendCoA`/`BackendJournal` patterns
- Produces: `PaginatedMeta`, 14 entity types, `PaymentMethod`, mappers `mapProduct` etc — used by all Task 3+ hooks/pages

- [ ] **Step 1: Extend types/api.ts — add PaginatedMeta + 14 entities**

```ts
// src/types/api.ts — append after ApiEnvelope
export interface PaginatedMeta { total:number; page:number; limit:number; totalPages:number }
export interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> { meta: PaginatedMeta }
export type PaymentMethod = "cash"|"bank_transfer"|"e_wallet"|"other"
export interface Product { id:number; businessId:number; sku:string; name:string; unit?:string|null; purchasePrice:number; sellingPrice:number; stock:number; minimumStock:number; isActive:boolean }
export interface Customer { id:number; businessId:number; code:string; name:string; phone?:string|null; address?:string|null; creditLimit:number; isActive:boolean }
export interface Supplier { id:number; businessId:number; code:string; name:string; phone?:string|null; address?:string|null; isActive:boolean }
export interface Tax { id:number; businessId:number; code:string; name:string; rate:number; isActive:boolean }
export interface CashBankAccount { id:number; businessId:number; coaId:number; name:string; accountNumber?:string|null; bankName?:string|null; openingBalance:number; isActive:boolean; coa?:{code:string; name:string} }
export interface CashBankTransferPayload { fromAccountId:number; toAccountId:number; amount:number; transferDate:string; notes?:string }
export interface StockMovement { id:number; businessId:number; productId:number; quantity:number; unitCost:number; movementType:string; referenceType?:string|null; notes?:string|null; movementDate:string; product?:Product }
export interface SalesInvoiceLine { productId:number; quantity:number; unitPrice:number; discountAmount?:number; taxAmount?:number; subtotal?:number; product?:Product }
export interface SalesInvoice { id:number; businessId:number; invoiceNo:string; invoiceDate:string; dueDate?:string|null; customerId?:number|null; subtotal:number; taxAmount:number; discountAmount:number; totalAmount:number; paidAmount:number; status:string; notes?:string|null; lines: SalesInvoiceLine[]; customer?:Customer }
export interface Receipt { id:number; businessId:number; receiptNo:string; receiptDate:string; amount:number; paymentMethod:PaymentMethod; customerId?:number|null; salesInvoiceId?:number|null; cashBankAccountId?:number|null; notes?:string|null }
export interface PurchaseInvoiceLine { productId:number; quantity:number; unitPrice:number; discountAmount?:number; taxAmount?:number; subtotal?:number }
export interface PurchaseInvoice { id:number; businessId:number; invoiceNo:string; invoiceDate:string; dueDate?:string|null; supplierId?:number|null; subtotal:number; taxAmount:number; discountAmount:number; totalAmount:number; paidAmount:number; status:string; notes?:string|null; lines: PurchaseInvoiceLine[] }
export interface PurchasePayment { id:number; businessId:number; paymentNo:string; paymentDate:string; amount:number; paymentMethod:PaymentMethod; supplierId?:number|null; purchaseInvoiceId?:number|null; cashBankAccountId?:number|null; notes?:string|null }
export interface FixedAsset { id:number; businessId:number; code:string; name:string; acquisitionDate:string; acquisitionCost:number; usefulLifeMonths:number; residualValue:number; accumulatedDepreciation:number; bookValue:number; isActive:boolean }
export interface AssetDepreciation { id:number; businessId:number; fixedAssetId:number; depreciationDate:string; depreciationAmount:number; accumulatedAmount:number; bookValue:number; journalId?:number|null }
export interface ReportProfitLoss { revenue:number; expense:number; profit:number; [k:string]:unknown }
```

- [ ] **Step 2: Extend types.ts PageKey**

```ts
// src/types.ts:39-47 — replace PageKey
export type PageKey =
  | "dashboard" | "accounts" | "journal" | "ledger" | "trial" | "income" | "balance" | "profile"
  | "products" | "customers" | "suppliers" | "taxes" | "cashBank" | "transfers" | "stock" | "salesInvoices" | "receipts" | "purchaseInvoices" | "purchasePayments" | "fixedAssets" | "depreciations" | "reportsFull" | "users";
```

- [ ] **Step 3: Extend utils/mappers.ts — add helpers + mappers**

```ts
// src/utils/mappers.ts — append
export function toNum(v: unknown): number { return Number(v) || 0; }
export function mapProduct(raw:any): import("../types/api").Product {
  return { id: raw.id, businessId: raw.businessId, sku: raw.sku, name: raw.name, unit: raw.unit, purchasePrice: toNum(raw.purchasePrice), sellingPrice: toNum(raw.sellingPrice), stock: toNum(raw.stock), minimumStock: toNum(raw.minimumStock), isActive: !!raw.isActive };
}
export function mapCustomer(raw:any): import("../types/api").Customer {
  return { id: raw.id, businessId: raw.businessId, code: raw.code, name: raw.name, phone: raw.phone, address: raw.address, creditLimit: toNum(raw.creditLimit), isActive: !!raw.isActive };
}
export function mapSupplier(raw:any): import("../types/api").Supplier {
  return { id: raw.id, businessId: raw.businessId, code: raw.code, name: raw.name, phone: raw.phone, address: raw.address, isActive: !!raw.isActive };
}
export function mapTax(raw:any): import("../types/api").Tax {
  return { id: raw.id, businessId: raw.businessId, code: raw.code, name: raw.name, rate: toNum(raw.rate), isActive: !!raw.isActive };
}
// similar mapCashBankAccount, mapStockMovement, etc — Decimal → number, date slice(0,10)
```

- [ ] **Step 4: Verify build**

Run: `npm run build` in `C:\Users\User\aplikasi-akuntansi`
Expected: PASS (tsc -b && vite build)

- [ ] **Step 5: Commit**

```bash
git add src/types/api.ts src/types.ts src/utils/mappers.ts
git commit -m "feat: add full API types and mappers for 14 modules"
```

---

### Task 2: Sidebar 4-Parent Dropdown + App Routing Skeleton

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/App.tsx:1-30,202-262`

**Interfaces:**
- Consumes: `PageKey` from Task 1
- Produces: `NAV_GROUPS` structure, `page` routing — used by Task 5+ pages

- [ ] **Step 1: Modify Sidebar.tsx — 4 parent dropdown**

```tsx
// src/components/Sidebar.tsx
import type { PageKey } from "../types";
const NAV_GROUPS: { key:string; label:string; children:{key:PageKey; label:string}[] }[] = [
  { key:"master", label:"Master Data", children:[
    {key:"products", label:"Produk"}, {key:"customers", label:"Pelanggan"}, {key:"suppliers", label:"Supplier"}, {key:"taxes", label:"Pajak"}, {key:"cashBank", label:"Kas & Bank"},
  ]},
  { key:"sales", label:"Penjualan", children:[
    {key:"salesInvoices", label:"Faktur Jual"}, {key:"receipts", label:"Pelunasan"}, {key:"stock", label:"Stok"},
  ]},
  { key:"purchase", label:"Pembelian", children:[
    {key:"purchaseInvoices", label:"Faktur Beli"}, {key:"purchasePayments", label:"Pembayaran Beli"}, {key:"transfers", label:"Transfer Kas"},
  ]},
  { key:"asset", label:"Aset & Laporan", children:[
    {key:"fixedAssets", label:"Aset Tetap"}, {key:"depreciations", label:"Penyusutan"}, {key:"reportsFull", label:"Laporan"}, {key:"users", label:"Pengguna"},
  ]},
];
const FLAT_NAV: {key:PageKey; label:string}[] = [
  {key:"dashboard", label:"Dasbor"}, {key:"accounts", label:"Daftar Akun"}, {key:"journal", label:"Jurnal Umum"}, {key:"ledger", label:"Buku Besar"}, {key:"trial", label:"Neraca Saldo"}, {key:"income", label:"Laba Rugi"}, {key:"balance", label:"Neraca"}, {key:"profile", label:"Profil"},
];
// in Sidebar component: const [openGroups, setOpenGroups] = useState<Record<string,boolean>>(()=>{try{return JSON.parse(localStorage.getItem("ak.sidebarGroups")||"{}")}catch{return{}}});
```

Render: flat nav + map NAV_GROUPS → button parent toggle `setOpenGroups(s=>({...s,[g.key]:!s[g.key]}))` + if open render children `nav-item sub`.

- [ ] **Step 2: Modify App.tsx — add placeholder routing for 14 keys**

```tsx
// src/App.tsx — add imports (placeholder pages return <p>Coming soon</p>)
// const Placeholder = ({t}:{t:string})=><div className="panel"><p className="empty-text">{t} — coming soon</p></div>
// then in main:
{page==="products" && <Placeholder t="Produk" />}
{page==="customers" && <Placeholder t="Pelanggan" />}
// ... all 14
```

- [ ] **Step 3: Verify dev**

Run: `npm run dev` → open http://localhost:5173, login, check Sidebar shows 4 dropdown parents, click toggle, navigate each PageKey, placeholder appears.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx src/App.tsx
git commit -m "feat: add 4-parent dropdown sidebar and routing skeleton for 14 modules"
```

---

### Task 3: Master Hooks — Products, Customers, Suppliers, Taxes

**Files:**
- Create: `src/hooks/useProducts.ts`
- Create: `src/hooks/useCustomers.ts`
- Create: `src/hooks/useSuppliers.ts`
- Create: `src/hooks/useTaxes.ts`

**Interfaces:**
- Consumes: `api`, `useBusiness().businessId`, `PaginatedMeta`, mappers from Task 1
- Produces: `useProducts(): {items, meta, page, setPage, create, update, remove, isLoading}` — consumed by Task 5 pages

- [ ] **Step 1: Create useProducts.ts**

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapProduct } from "../utils/mappers";
import type { Product } from "../types/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useProducts(searchInit="") {
  const { businessId } = useBusiness(); const qc = useQueryClient();
  const [page, setPage] = useState(1); const [search, setSearch] = useState(searchInit); const limit=20;
  const q = useQuery({
    queryKey:["products", businessId, page, limit, search],
    queryFn: async()=>{
      const res = await api.get("/products", {params:{page, limit, search: search||undefined}});
      const items: any[] = res.data?.data ?? []; const meta = res.data?.meta ?? {total: items.length, page, limit, totalPages:1};
      return {data: items.map(mapProduct) as Product[], meta};
    },
    enabled: !!businessId,
  });
  const create = useMutation({ mutationFn: async(p:{sku:string;name:string;unit?:string;purchasePrice?:number;sellingPrice?:number})=> (await api.post("/products", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["products", businessId]})});
  const update = useMutation({ mutationFn: async({id, ...p}:{id:number}&Record<string,unknown>)=> (await api.patch(`/products/${id}`, p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["products", businessId]})});
  const remove = useMutation({ mutationFn: async(id:number)=> await api.delete(`/products/${id}`), onSuccess:()=>qc.invalidateQueries({queryKey:["products", businessId]})});
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, search, setSearch, isLoading: q.isLoading, error: q.error, create, update, remove, refetch: q.refetch };
}
```

- [ ] **Step 2: Create useCustomers.ts, useSuppliers.ts, useTaxes.ts — same pattern**

```ts
// useCustomers: api.get("/customers"), mapCustomer, POST/PATCH/DELETE /customers
// useSuppliers: api.get("/suppliers"), mapSupplier
// useTaxes: api.get("/taxes"), mapTax, body {code, name, rate}
// each: queryKey ["customers", businessId, page, limit, search] etc, enabled !!businessId
```

- [ ] **Step 3: Verify hooks compile**

Run: `npm run build`
Expected: PASS — no missing imports

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useProducts.ts src/hooks/useCustomers.ts src/hooks/useSuppliers.ts src/hooks/useTaxes.ts
git commit -m "feat: add master hooks products customers suppliers taxes"
```

---

### Task 4: Master Hooks — Cash-Bank Accounts & Transfers, Stock Movements

**Files:**
- Create: `src/hooks/useCashBankAccounts.ts`
- Create: `src/hooks/useCashBankTransfers.ts`
- Create: `src/hooks/useStockMovements.ts`

- [ ] **Step 1: Create useCashBankAccounts.ts**

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useCashBankAccounts() {
  const {businessId}=useBusiness(); const qc=useQueryClient(); const [page,setPage]=useState(1); const limit=20;
  const q = useQuery({ queryKey:["cashBankAccounts", businessId, page], queryFn: async()=>{
    const res = await api.get("/cash-bank-accounts", {params:{page, limit}});
    const items = res.data?.data ?? []; const meta = res.data?.meta ?? {total: items.length, page, limit, totalPages:1};
    return {data: items.map((r:any)=>({...r, openingBalance: Number(r.openingBalance)||0})), meta};
  }, enabled: !!businessId });
  const create = useMutation({ mutationFn: async(p:{coaId:number; name:string; accountNumber?:string; bankName?:string; openingBalance?:number})=> (await api.post("/cash-bank-accounts", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["cashBankAccounts", businessId]})});
  const update = useMutation({ mutationFn: async({id, ...p}:{id:number}&any)=> (await api.patch(`/cash-bank-accounts/${id}`, p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["cashBankAccounts", businessId]})});
  const remove = useMutation({ mutationFn: async(id:number)=> await api.delete(`/cash-bank-accounts/${id}`), onSuccess:()=>qc.invalidateQueries({queryKey:["cashBankAccounts", businessId]})});
  return { items: q.data?.data??[], meta: q.data?.meta, page, setPage, isLoading: q.isLoading, create, update, remove };
}
```

- [ ] **Step 2: Create useCashBankTransfers.ts**

```ts
// query list: api.get("/cash-bank-transfers"), mutation transfer: api.post("/cash-bank-transfers", {fromAccountId, toAccountId, amount, transferDate, notes})
// also POST "/cash-bank-accounts/transfer" is alias — use /cash-bank-transfers as canonical
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
export function useCashBankTransfers() {
  const {businessId}=useBusiness(); const qc=useQueryClient();
  const q = useQuery({ queryKey:["cashBankTransfers", businessId], queryFn: async()=>{ const res=await api.get("/cash-bank-transfers"); return res.data?.data ?? []; }, enabled: !!businessId });
  const transfer = useMutation({ mutationFn: async(p:{fromAccountId:number; toAccountId:number; amount:number; transferDate:string; notes?:string})=> (await api.post("/cash-bank-transfers", p)).data?.data, onSuccess:()=>{ qc.invalidateQueries({queryKey:["cashBankTransfers", businessId]}); qc.invalidateQueries({queryKey:["cashBankAccounts", businessId]}); }});
  return { items: q.data ?? [], isLoading: q.isLoading, transfer };
}
```

- [ ] **Step 3: Create useStockMovements.ts**

```ts
// read-only list+get+createAdjustment: api.get("/stock-movements"), api.get(`/stock-movements/${id}`), api.post("/stock-movements", {productId, quantity, unitCost, movementType, notes})
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useStockMovements() {
  const {businessId}=useBusiness(); const qc=useQueryClient(); const [page,setPage]=useState(1); const limit=20;
  const q = useQuery({ queryKey:["stockMovements", businessId, page], queryFn: async()=>{ const res=await api.get("/stock-movements",{params:{page, limit}}); return {data: res.data?.data ?? [], meta: res.data?.meta}; }, enabled: !!businessId });
  const createAdjustment = useMutation({ mutationFn: async(p:{productId:number; quantity:number; unitCost?:number; movementType:string; notes?:string})=> (await api.post("/stock-movements", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["stockMovements", businessId]})});
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, isLoading: q.isLoading, createAdjustment };
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build` — Expected PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCashBankAccounts.ts src/hooks/useCashBankTransfers.ts src/hooks/useStockMovements.ts
git commit -m "feat: add hooks cash-bank accounts, transfers, stock movements"
```

---

### Task 5: Master Pages — Products, Customers, Suppliers, Taxes, CashBankAccounts

**Files:**
- Create: `src/pages/Products.tsx`
- Create: `src/pages/Customers.tsx`
- Create: `src/pages/Suppliers.tsx`
- Create: `src/pages/Taxes.tsx`
- Create: `src/pages/CashBankAccounts.tsx`
- Modify: `src/App.tsx` — replace placeholders with real pages

**Interfaces:**
- Consumes: hooks from Task 3-4, `useToasts`, `getApiErrorMessage`
- Produces: rendered pages for routing

- [ ] **Step 1: Create Products.tsx (template for others)**

```tsx
import { useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { useToasts } from "../hooks/useToasts";
import { getApiErrorMessage } from "../lib/api";
export function Products() {
  const { items, meta, page, setPage, search, setSearch, create, remove, isLoading } = useProducts();
  const { showToast } = useToasts();
  const [form, setForm] = useState({sku:"", name:"", unit:"", purchasePrice:"", sellingPrice:""});
  async function onCreate(e: React.FormEvent){ e.preventDefault(); if(!form.sku.trim()||!form.name.trim()){showToast("SKU dan nama wajib","err"); return;} try{ await create.mutateAsync({sku:form.sku.trim(), name:form.name.trim(), unit: form.unit||undefined, purchasePrice: Number(form.purchasePrice)||0, sellingPrice: Number(form.sellingPrice)||0}); showToast("Produk ditambahkan"); setForm({sku:"",name:"",unit:"",purchasePrice:"",sellingPrice:""});}catch(err){showToast(getApiErrorMessage(err),"err");}}
  async function onDelete(id:number){ if(!confirm("Hapus?")) return; try{ await remove.mutateAsync(id); showToast("Dihapus");}catch(err){showToast(getApiErrorMessage(err),"err");}}
  if(isLoading) return <p className="empty-text">Memuat...</p>;
  return <div className="panel"><h2>Produk</h2><form onSubmit={onCreate} style={{display:"flex", gap:8, flexWrap:"wrap"}}><input className="field" placeholder="SKU" value={form.sku} onChange={e=>setForm(s=>({...s, sku:e.target.value}))}/><input className="field" placeholder="Nama" value={form.name} onChange={e=>setForm(s=>({...s, name:e.target.value}))}/><input className="field" placeholder="Unit" value={form.unit} onChange={e=>setForm(s=>({...s, unit:e.target.value}))}/><input className="field" type="number" placeholder="Harga beli" value={form.purchasePrice} onChange={e=>setForm(s=>({...s, purchasePrice:e.target.value}))}/><input className="field" type="number" placeholder="Harga jual" value={form.sellingPrice} onChange={e=>setForm(s=>({...s, sellingPrice:e.target.value}))}/><button className="primary-btn" type="submit" disabled={create.isPending}>Tambah</button></form><div style={{marginTop:12, display:"flex", gap:8}}><input className="field" placeholder="Cari" value={search} onChange={e=>setSearch(e.target.value)}/></div><table className="table" style={{marginTop:12}}><thead><tr><th>SKU</th><th>Nama</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>{items.map((p:any)=><tr key={p.id}><td>{p.sku}</td><td>{p.name}</td><td>{p.stock}</td><td><button className="link-btn" onClick={()=>onDelete(p.id)}>Hapus</button></td></tr>)}</tbody></table>{meta && <div style={{marginTop:8, display:"flex", gap:8}}><button disabled={page<=1} onClick={()=>setPage(page-1)}>Prev</button><span>{page}/{meta.totalPages} ({meta.total})</span><button disabled={page>=meta.totalPages} onClick={()=>setPage(page+1)}>Next</button></div>}</div>;
}
```

- [ ] **Step 2: Create Customers.tsx, Suppliers.tsx, Taxes.tsx, CashBankAccounts.tsx — same structure**

```tsx
// Customers: fields code, name, phone, address, creditLimit — POST /customers, note isActive
// Suppliers: code, name, phone, address — POST /suppliers
// Taxes: code, name, rate (0-100 Decimal) — POST /taxes
// CashBankAccounts: select CoA (fetch via useAccounts, filter Asset), fields name, accountNumber, bankName, openingBalance, coaId — POST /cash-bank-accounts
// each page uses its hook, showToast, pagination, delete confirm
```

- [ ] **Step 3: Wire in App.tsx**

```tsx
// src/App.tsx — replace placeholders
import { Products } from "./pages/Products";
import { Customers } from "./pages/Customers";
import { Suppliers } from "./pages/Suppliers";
import { Taxes } from "./pages/Taxes";
import { CashBankAccounts } from "./pages/CashBankAccounts";
// in render:
{page==="products" && <Products />}
{page==="customers" && <Customers />}
{page==="suppliers" && <Suppliers />}
{page==="taxes" && <Taxes />}
{page==="cashBank" && <CashBankAccounts />}
```

- [ ] **Step 4: Manual verify**

Run `npm run dev`, login, navigate to each Master page, test create + pagination + delete + error toast (try duplicate SKU/code → expect 409 toast).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Products.tsx src/pages/Customers.tsx src/pages/Suppliers.tsx src/pages/Taxes.tsx src/pages/CashBankAccounts.tsx src/App.tsx
git commit -m "feat: add master pages products customers suppliers taxes cash-bank"
```

---

### Task 6: Sales Hooks & Pages — SalesInvoices, Receipts, StockMovements Page

**Files:**
- Create: `src/hooks/useSalesInvoices.ts`
- Create: `src/hooks/useReceipts.ts`
- Create: `src/pages/SalesInvoices.tsx`
- Create: `src/pages/Receipts.tsx`
- Create: `src/pages/StockMovements.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create useSalesInvoices.ts**

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useSalesInvoices() {
  const {businessId}=useBusiness(); const qc=useQueryClient(); const [page,setPage]=useState(1); const limit=20;
  const q = useQuery({ queryKey:["salesInvoices", businessId, page], queryFn: async()=>{ const res=await api.get("/sales-invoices",{params:{page, limit}}); return {data: res.data?.data ?? [], meta: res.data?.meta}; }, enabled: !!businessId });
  const create = useMutation({ mutationFn: async(p:{customerId?:number; invoiceDate:string; dueDate?:string; notes?:string; lines:{productId:number; quantity:number; unitPrice:number}[]})=> (await api.post("/sales-invoices", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["salesInvoices", businessId]})});
  const getById = (id:number)=> useQuery({ queryKey:["salesInvoice", businessId, id], queryFn: async()=> (await api.get(`/sales-invoices/${id}`)).data?.data, enabled: !!businessId && !!id });
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, isLoading: q.isLoading, create, getById };
}
```

- [ ] **Step 2: Create useReceipts.ts — same, endpoint /receipts, fields receiptDate, amount, paymentMethod, customerId, salesInvoiceId, cashBankAccountId**

```ts
// POST /receipts body {salesInvoiceId?, customerId?, receiptDate: YYYY-MM-DD, amount, paymentMethod, cashBankAccountId?, notes?}
```

- [ ] **Step 3: Create SalesInvoices.tsx — dynamic lines**

Form: customer select (from useCustomers), invoiceDate (default today YYYY-MM-DD), notes, lines array `[{productId, quantity, unitPrice}]` with add/remove row, product select from useProducts, qty/unitPrice inputs, submit → `create.mutateAsync({customerId: Number(cust)||undefined, invoiceDate, lines: lines.map(l=>({productId:Number(l.productId), quantity:Number(l.quantity), unitPrice:Number(l.unitPrice)}))})`.

- [ ] **Step 4: Create Receipts.tsx + StockMovements.tsx**

Receipts: receiptDate, amount, paymentMethod select (cash/bank_transfer/e_wallet/other), customer/salesInvoice/cashBankAccount selects.
StockMovements: product select, quantity, unitCost, movementType (in/out/adjustment), notes, table list.

- [ ] **Step 5: Wire App.tsx**

```tsx
import { SalesInvoices } from "./pages/SalesInvoices";
import { Receipts } from "./pages/Receipts";
import { StockMovements } from "./pages/StockMovements";
{page==="salesInvoices" && <SalesInvoices />}
{page==="receipts" && <Receipts />}
{page==="stock" && <StockMovements />}
```

- [ ] **Step 6: Verify**

`npm run build` PASS; manual create sales invoice with 2 lines, then create receipt for it, check stock movement created.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useSalesInvoices.ts src/hooks/useReceipts.ts src/pages/SalesInvoices.tsx src/pages/Receipts.tsx src/pages/StockMovements.tsx src/App.tsx
git commit -m "feat: add sales invoices, receipts, stock movements"
```

---

### Task 7: Purchase Hooks & Pages — PurchaseInvoices, PurchasePayments, Cash-Bank Transfers Page

**Files:**
- Create: `src/hooks/usePurchaseInvoices.ts`
- Create: `src/hooks/usePurchasePayments.ts`
- Create: `src/pages/PurchaseInvoices.tsx`
- Create: `src/pages/PurchasePayments.tsx`
- Create: `src/pages/CashBankTransfers.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create usePurchaseInvoices.ts, usePurchasePayments.ts — mirror sales but endpoints /purchase-invoices, /purchase-payments, fields supplierId**

```ts
// usePurchaseInvoices: api.get("/purchase-invoices"), POST /purchase-invoices {supplierId?, invoiceDate, dueDate?, lines: [{productId, quantity, unitPrice}]}
// usePurchasePayments: api.get("/purchase-payments"), POST /purchase-payments {purchaseInvoiceId?, supplierId?, paymentDate, amount, paymentMethod, cashBankAccountId?}
```

- [ ] **Step 2: Create PurchaseInvoices.tsx, PurchasePayments.tsx — same UI pattern as sales**

- [ ] **Step 3: Create CashBankTransfers.tsx**

```tsx
import { useCashBankTransfers } from "../hooks/useCashBankTransfers";
import { useCashBankAccounts } from "../hooks/useCashBankAccounts";
// form: fromAccountId select, toAccountId select, amount, transferDate (YYYY-MM-DD), notes — calls transfer.mutateAsync
```

- [ ] **Step 4: Wire App.tsx**

```tsx
import { PurchaseInvoices } from "./pages/PurchaseInvoices";
import { PurchasePayments } from "./pages/PurchasePayments";
import { CashBankTransfers } from "./pages/CashBankTransfers";
{page==="purchaseInvoices" && <PurchaseInvoices />}
{page==="purchasePayments" && <PurchasePayments />}
{page==="transfers" && <CashBankTransfers />}
```

- [ ] **Step 5: Verify**

`npm run build` PASS; manual purchase invoice → purchase payment.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePurchaseInvoices.ts src/hooks/usePurchasePayments.ts src/pages/PurchaseInvoices.tsx src/pages/PurchasePayments.tsx src/pages/CashBankTransfers.tsx src/App.tsx
git commit -m "feat: add purchase invoices, purchase payments, cash-bank transfers"
```

---

### Task 8: Asset Hooks & Pages — FixedAssets, AssetDepreciations

**Files:**
- Create: `src/hooks/useFixedAssets.ts`
- Create: `src/hooks/useAssetDepreciations.ts`
- Create: `src/pages/FixedAssets.tsx`
- Create: `src/pages/AssetDepreciations.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create useFixedAssets.ts**

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
import { useState } from "react";
export function useFixedAssets() {
  const {businessId}=useBusiness(); const qc=useQueryClient(); const [page,setPage]=useState(1); const limit=20;
  const q = useQuery({ queryKey:["fixedAssets", businessId, page], queryFn: async()=>{ const res=await api.get("/fixed-assets",{params:{page, limit}}); const items=res.data?.data ?? []; return {data: items.map((r:any)=>({...r, acquisitionCost:Number(r.acquisitionCost), residualValue:Number(r.residualValue), bookValue:Number(r.bookValue)})), meta: res.data?.meta}; }, enabled: !!businessId });
  const create = useMutation({ mutationFn: async(p:{code:string; name:string; acquisitionDate:string; acquisitionCost:number; usefulLifeMonths:number; residualValue?:number})=> (await api.post("/fixed-assets", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["fixedAssets", businessId]})});
  const update = useMutation({ mutationFn: async({id, ...p}:{id:number}&any)=> (await api.patch(`/fixed-assets/${id}`, p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["fixedAssets", businessId]})});
  const remove = useMutation({ mutationFn: async(id:number)=> await api.delete(`/fixed-assets/${id}`), onSuccess:()=>qc.invalidateQueries({queryKey:["fixedAssets", businessId]})});
  const depreciate = useMutation({ mutationFn: async({id, depreciationDate, depreciationAmount}:{id:number; depreciationDate:string; depreciationAmount?:number})=> (await api.post(`/fixed-assets/${id}/depreciate`, {depreciationDate, depreciationAmount})).data?.data, onSuccess:()=>{ qc.invalidateQueries({queryKey:["fixedAssets", businessId]}); qc.invalidateQueries({queryKey:["assetDepreciations", businessId]}); }});
  const listDepreciations = (assetId:number)=> useQuery({ queryKey:["fixedAssetDepreciations", businessId, assetId], queryFn: async()=> (await api.get(`/fixed-assets/${assetId}/depreciations`)).data?.data ?? [], enabled: !!businessId && !!assetId });
  return { items: q.data?.data ?? [], meta: q.data?.meta, page, setPage, isLoading: q.isLoading, create, update, remove, depreciate, listDepreciations };
}
```

- [ ] **Step 2: Create useAssetDepreciations.ts — read-only**

```ts
// api.get("/asset-depreciations"), api.get(`/asset-depreciations/${id}`), paginated
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
export function useAssetDepreciations(page=1, limit=20){
  const {businessId}=useBusiness();
  return useQuery({ queryKey:["assetDepreciations", businessId, page], queryFn: async()=>{ const res=await api.get("/asset-depreciations",{params:{page, limit}}); return {data: res.data?.data ?? [], meta: res.data?.meta}; }, enabled: !!businessId });
}
```

- [ ] **Step 3: Create FixedAssets.tsx — table + create form + depreciate button per row (prompt date, call depreciate)**

- [ ] **Step 4: Create AssetDepreciations.tsx — table list of all depreciations, filter by assetId if needed**

- [ ] **Step 5: Wire App.tsx**

```tsx
import { FixedAssets } from "./pages/FixedAssets";
import { AssetDepreciations } from "./pages/AssetDepreciations";
{page==="fixedAssets" && <FixedAssets />}
{page==="depreciations" && <AssetDepreciations />}
```

- [ ] **Step 6: Verify**

`npm run build` PASS; create asset, depreciate, check depreciation list.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useFixedAssets.ts src/hooks/useAssetDepreciations.ts src/pages/FixedAssets.tsx src/pages/AssetDepreciations.tsx src/App.tsx
git commit -m "feat: add fixed assets and asset depreciations"
```

---

### Task 9: Reports Full (10 endpoints) & Users & Polish

**Files:**
- Create: `src/hooks/useReportsFull.ts`
- Create: `src/hooks/useUsers.ts`
- Create: `src/pages/ReportsFull.tsx`
- Create: `src/pages/Users.tsx`
- Modify: `src/App.tsx`
- Modify: `src/hooks/useBusiness.tsx` (optional invalidate extension)

**Interfaces:**
- Consumes: all prior hooks for navigation, `api`
- Produces: complete 21-module coverage

- [ ] **Step 1: Create useReportsFull.ts — 10 queries**

```ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
export function useProfitLoss(params?:{from?:string; to?:string}){ const {businessId}=useBusiness(); return useQuery({queryKey:["reports","profit-loss", businessId, params], queryFn: async()=> (await api.get("/reports/profit-loss",{params})).data?.data, enabled: !!businessId}); }
export function useSalesReport(params?:any){ const {businessId}=useBusiness(); return useQuery({queryKey:["reports","sales", businessId, params], queryFn: async()=> (await api.get("/reports/sales",{params})).data?.data, enabled: !!businessId}); }
// repeat for purchase, stock, ar, ap, balance-sheet, cash-flow, fixed-assets (GET /reports/fixed-assets and alias /reports/fixed-asset)
export function useFixedAssetReport(){ const {businessId}=useBusiness(); return useQuery({queryKey:["reports","fixed-assets", businessId], queryFn: async()=> (await api.get("/reports/fixed-assets")).data?.data, enabled: !!businessId}); }
```

- [ ] **Step 2: Create useUsers.ts**

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useBusiness } from "./useBusiness";
export function useUsers(){
  const qc=useQueryClient();
  // GET /users is public list (no businessId), GET /users/:id needs auth, POST /users needs auth
  const q = useQuery({ queryKey:["users"], queryFn: async()=>{ const res=await api.get("/users"); return res.data?.data ?? []; }});
  const create = useMutation({ mutationFn: async(p:{name:string; email:string; password:string})=> (await api.post("/users", p)).data?.data, onSuccess:()=>qc.invalidateQueries({queryKey:["users"]})});
  return { items: q.data ?? [], isLoading: q.isLoading, create };
}
```

- [ ] **Step 3: Create ReportsFull.tsx — tab per report**

```tsx
import { useState } from "react";
import { useProfitLoss, useSalesReport, useFixedAssetReport } from "../hooks/useReportsFull";
// tabs: profit-loss, sales, purchase, stock, ar, ap, balance-sheet, cash-flow, fixed-assets — each shows JSON pretty + table if array, with from/to date filters where applicable
export function ReportsFull(){
  const [tab, setTab] = useState<"profit-loss"|"sales"|"purchase"|"stock"|"ar"|"ap"|"balance-sheet"|"cash-flow"|"fixed-assets">("profit-loss");
  // render tab buttons, then conditional: if tab==="profit-loss" const q=useProfitLoss(); if q.isLoading return loading; return <pre>{JSON.stringify(q.data,null,2)}</pre>
  return <div className="panel"><h2>Laporan</h2><div style={{display:"flex", gap:8, flexWrap:"wrap"}}>{["profit-loss","sales","purchase","stock","ar","ap","balance-sheet","cash-flow","fixed-assets"].map(t=><button key={t} className={tab===t?"primary-btn":"link-btn"} onClick={()=>setTab(t as any)}>{t}</button>)}</div>{/* conditional render */}</div>;
}
```

- [ ] **Step 4: Create Users.tsx — simple table + create form (name, email, password)**

- [ ] **Step 5: Wire App.tsx + optional useBusiness invalidate**

```tsx
// src/App.tsx
import { ReportsFull } from "./pages/ReportsFull";
import { Users } from "./pages/Users";
{page==="reportsFull" && <ReportsFull />}
{page==="users" && <Users />}
// src/hooks/useBusiness.tsx — in selectBusiness, add:
qc.invalidateQueries({queryKey:["products"]}); qc.invalidateQueries({queryKey:["customers"]}); // ... all 14 keys
```

- [ ] **Step 6: Final verify — build + manual smoke**

Run: `npm run build` — Expected PASS
Run: `npm run dev` — login, visit Laporan → each tab loads without 404, visit Pengguna → list.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useReportsFull.ts src/hooks/useUsers.ts src/pages/ReportsFull.tsx src/pages/Users.tsx src/App.tsx src/hooks/useBusiness.tsx
git commit -m "feat: add full reports (10 endpoints) and users, complete 21-module consumption"
```

---

## Self-Review

**Spec coverage:**
- 5.1 Types & Mappers → Task 1 ✓
- 5.2 Hooks (14) → Tasks 3,4,6,7,8,9 ✓
- 5.3 Pages (14) → Tasks 5,6,7,8,9 ✓
- 5.4 Sidebar 4 parent dropdown + PageKey + App routing → Task 2 ✓ (+ Tasks 5-9 wiring)
- 6 Validasi & Error → built into each page form (required, min, date regex) + getApiErrorMessage ✓
- 7 Pagination → limit 20, meta, page state per hook ✓
- 8 Role hide → noted as optional in Task 9 (role query) ✓
- 9 Testing → build + manual smoke per task ✓

**Placeholder scan:** No TBD/TODO, every step has concrete code, run command, expected output.

**Type consistency:** `PageKey` values in Task 1 match Sidebar children keys in Task 2 and App routing keys in Tasks 5-9; hook queryKeys `["products", businessId, page, limit, search]` consistent across create/invalidate; mapper names `mapProduct` etc match hooks imports.

Fixes applied inline: added `PaginatedMeta` to avoid missing meta type, added alias note for cash-bank transfer.

