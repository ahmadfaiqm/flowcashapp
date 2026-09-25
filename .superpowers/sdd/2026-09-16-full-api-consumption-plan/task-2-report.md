# Task 2 Report: Sidebar 4-Parent Dropdown + App Routing Skeleton

**Status:** DONE

**Files Changed:**
- `src/components/Sidebar.tsx` — replaced flat `NAV` with `NAV_GROUPS` (4 parents: Master Data [products, customers, suppliers, taxes, cashBank], Penjualan [salesInvoices, receipts, stock], Pembelian [purchaseInvoices, purchasePayments, transfers], Aset & Laporan [fixedAssets, depreciations, reportsFull, users]) plus `FLAT_NAV` for existing 8 pages (dashboard, accounts, journal, ledger, trial, income, balance, profile). Added `openGroups` state persisted to localStorage key `ak.sidebarGroups` (lazy initializer via `JSON.parse(localStorage.getItem(...))` with try/catch), `useEffect` to persist on change, `toggleGroup` handler, rendered `FLAT_NAV` then `NAV_GROUPS` with parent toggle buttons (`nav-group-toggle`, `aria-expanded`, chevron ▸/▾) and children as `nav-item sub` when open. Preserved existing behavior: `open` prop, `onClose`, mobile close button, brand input, user/logout/reset.
- `src/App.tsx` — added `Placeholder` component (`<div className="panel"><p className="empty-text">{t} — coming soon</p></div>`), wired routing for all 15 new `PageKey` values: `products`→Produk, `customers`→Pelanggan, `suppliers`→Supplier, `taxes`→Pajak, `cashBank`→Kas & Bank, `transfers`→Transfer Kas, `stock`→Stok, `salesInvoices`→Faktur Jual, `receipts`→Pelunasan, `purchaseInvoices`→Faktur Beli, `purchasePayments`→Pembayaran Beli, `fixedAssets`→Aset Tetap, `depreciations`→Penyusutan, `reportsFull`→Laporan, `users`→Pengguna. No new imports.

**Build:**
- `npm run build` — **PASS**
  - `tsc -b` — no errors
  - `vite build` — `✓ 952 modules transformed` → `✓ built in 5.04s` (assets/index-Ma8LIsn3.js 652.71 kB, gzip 191.82 kB)

**Verification:**
- Sidebar renders 8 flat nav items plus 4 collapsible parent groups with localStorage persistence (`ak.sidebarGroups`).
- Placeholder routing verified via `src/App.tsx:8-14` and `src/App.tsx:243-257` — all 15 keys render `Placeholder`.

**Constraints Met:**
- `PageKey` extended in Task 1 (no change here).
- Sidebar keeps existing `open`/`onClose`/mobile behavior.
- No new dependencies.

**Notes:**
- Workspace is not a git repository (`fatal: not a git repository`); no commit created — files modified in place.
