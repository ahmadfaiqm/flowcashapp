# Flowchart Sistem Akuntansi UMKM

Dokumen flowchart berdasarkan DBML `akuntansi_umkm` — **sinkron 2026-09-16** dengan sistem saat ini:
- **Pagination 10/page** untuk semua list: `businesses`, `journals`, `products`, `customers`, `suppliers`, `cash_bank_accounts`, `sales_invoices`, `purchase_invoices`, `receipts`, `purchase_payments`, `stock_movements`, `fixed_assets`, `asset_depreciations`, **reports** (`sales`, `purchase`, `stock`, `fixed_assets`) dan **riwayat transfer** `GET /cash-bank-transfers` (filter `journalNo startsWith JU-TRF-`).
- **Penomoran auto prefix client**: `invoiceNo`, `receiptNo`, `paymentNo` bisa manual atau `prefix` dari client (`SI`, `PB`, `RC`, `PP` bebas 1-20 char) → sistem generate `{prefix}{001}` urut global per `businessId` per prefix per tabel via `src/common/utils/numbering.js` (`getNextNoTx` cari `MAX(prefix+angka)` +1, `padStart(3,'0')`). `journalNo` tetap auto `JU-SALES-*`, `JU-PURCHASE-*`, `JU-RECEIPT-*`, `JU-PAYMENT-*`, `JU-MANUAL-*`, `JU-TRF-*`, `JU-DEP-*`.

## 1. Flowchart Utama

```mermaid
flowchart TD
    A([Start]) --> B[Login]
    B --> C[Input Email & Password]
    C --> D{User Terdaftar?}
    D -->|Tidak| E[Register User]
    E --> F[Create User]
    F --> G[Register Business]
    G --> H[Create Business Profile]
    H --> I[Create Business Member - Owner]
    I --> J[Generate Default COA]
    J --> K[Dashboard]
    D -->|Ya| L[Validasi Password]
    L --> M{Password Benar?}
    M -->|Tidak| N[Error]
    N --> B
    M -->|Ya| O[Cek Business Membership]
    O --> P{Punya Business?}
    P -->|Tidak| G
    P -->|Ya| Q[Ambil Business + Role]
    Q --> K
    K --> R{Pilih Modul}
    R -->|Penjualan| S[Sales & Receivable]
    R -->|Pembelian| T[Purchase & Payable]
    R -->|Stok| U[Inventory]
    R -->|Kas & Bank| V[Cash & Bank]
    R -->|Akuntansi| W[Accounting]
    R -->|Aset| X[Fixed Assets]
    R -->|Laporan| Y[Reports]
    S --> K
    T --> K
    U --> K
    V --> K
    W --> K
    X --> K
    Y --> K
```

## 2. Authentication & Business Onboarding

```mermaid
flowchart TD
    A([Start]) --> B[Login]
    B --> C[Email + Password]
    C --> D{Email Terdaftar?}
    D -->|Tidak| E[Register User]
    E --> F[Create User]
    F --> G[Register Business]
    D -->|Ya| H[Validate Password]
    H --> I{Password Valid?}
    I -->|Tidak| J[Login Error]
    J --> B
    I -->|Ya| K[Find Business Membership]
    K --> L{Membership Exists?}
    L -->|Tidak| G
    L -->|Ya| M[Get Business + Role]
    M --> N[Dashboard]
    G --> O[Input Business Data]
    O --> P[Create Business Profile]
    P --> Q[Create Business Member]
    Q --> R[Role = Owner]
    R --> S[Generate Default COA]
    S --> T[Initial Business Setup]
    T --> N
```

## 3. Penjualan (dengan penomoran prefix auto & pagination)

```mermaid
flowchart TD
    A([Start]) --> B[Pilih Penjualan]
    B --> B1{invoiceNo / prefix?}
    B1 -->|Manual invoiceNo| B2[Validasi invoiceNo 1-50, unique per business]
    B1 -->|Auto prefix| B3[Validasi prefix 1-20, cari MAX prefix+angka per businessId di sales_invoices, generate {prefix}{001} padStart 3]
    B2 --> C
    B3 --> C
    C[Pilih / Input Customer] --> D[Pilih Product]
    D --> E[Input Quantity]
    E --> F[Ambil Selling Price]
    F --> G[Hitung Subtotal]
    G --> H[Hitung Discount]
    H --> I[Hitung Tax]
    I --> J[Hitung Total]
    J --> K{Stock Cukup?}
    K -->|Tidak| L[Stock Tidak Cukup]
    L --> D
    K -->|Ya| M[Create Sales Invoice - invoiceNo final]
    M --> N[Create Invoice Lines]
    N --> O[Kurangi Stock]
    O --> P[Create Stock Movement - movementType out]
    P --> Q{Pembayaran?}
    Q -->|Belum| R[Invoice Posted - status posted]
    Q -->|Sudah| S[Create Receipt - receiptNo auto/prefix RC atau manual]
    S --> T[Update Paid Amount]
    T --> U[Update Invoice Status - partially_paid/paid]
    R --> V[Create Journal JU-SALES-{Date.now()}-{businessId}]
    U --> V
    V --> W[Debit AR 1100]
    W --> X[Credit Sales Revenue 4010]
    X --> Y[Record COGS - validasi debit==credit]
    Y --> Z[Update Inventory]
    Z --> AA([Selesai])
    AA --> AB[List / Riwayat Penjualan - GET /sales-invoices?page=1&limit=10 - pagination 10/page + search invoiceNo/customer + filter status]
```

## 4. Pembelian (prefix auto & pagination)

```mermaid
flowchart TD
    A([Start]) --> B[Pilih Pembelian]
    B --> B1{invoiceNo / prefix?}
    B1 -->|Manual| B2[Validasi invoiceNo 1-50, unique per business]
    B1 -->|Auto| B3[prefix client - default PB - MAX PB+angka per businessId -> {prefix}{001}]
    B2 --> C
    B3 --> C
    C[Pilih / Input Supplier] --> D[Pilih Product]
    D --> E[Input Quantity]
    E --> F[Input Purchase Price]
    F --> G[Hitung Subtotal]
    G --> H[Hitung Discount]
    H --> I[Hitung Tax]
    I --> J[Hitung Total]
    J --> K[Create Purchase Invoice - invoiceNo final]
    K --> L[Create Invoice Lines]
    L --> M[Tambah Stock]
    M --> N[Create Stock Movement - movementType in]
    N --> O{Pembayaran?}
    O -->|Belum| P[Invoice Posted]
    O -->|Sudah| Q[Create Purchase Payment - paymentNo auto/prefix PP atau manual]
    Q --> R[Update Paid Amount]
    R --> S[Update Invoice Status - partially_paid/paid]
    P --> T[Create Journal JU-PURCHASE-{Date.now()}-{businessId}]
    S --> T
    T --> U[Debit Inventory 1500]
    U --> V[Credit AP 2010 - validasi debit==credit]
    V --> W([Selesai])
    W --> X[List / Riwayat Pembelian - GET /purchase-invoices?page=1&limit=10 - pagination 10/page]
```

## 5. Inventory / Stock (pagination 10/page)

```mermaid
flowchart TD
    A([Stock Module]) --> B{Jenis Movement?}
    B -->|Purchase| C[Stock In]
    B -->|Sales| D[Stock Out]
    B -->|Adjustment| E[Stock Adjustment]
    C --> F[Tambah Quantity]
    D --> G[Kurangi Quantity]
    E --> H[Sesuaikan Quantity]
    F --> I[Create Stock Movement]
    G --> I
    H --> I
    I --> J[Update Product Stock]
    J --> K{Stock <= Minimum Stock?}
    K -->|Ya| L[Stock Alert - lowStock count]
    K -->|Tidak| M[Stock Normal]
    L --> N([Selesai])
    M --> N
    N --> O[List Stock - GET /stock-movements?page=1&limit=10, GET /products?page=1&limit=10, GET /reports/stock?page=1&limit=10 - semua 10/page]
```

## 6. Kas & Bank (transfer + riwayat pagination 10/page)

```mermaid
flowchart TD
    A([Kas & Bank]) --> B{Jenis Transaksi?}
    B -->|Pemasukan| C[Cash In via Receipt - receiptNo auto RC / manual]
    B -->|Pengeluaran| D[Cash Out via Purchase Payment - paymentNo auto PP / manual]
    B -->|Transfer| E[Transfer Antar Akun]
    C --> F[Input Amount + prefix client jika auto]
    D --> G[Input Amount + prefix client jika auto]
    E --> H[Pilih Source Account]
    H --> I[Pilih Destination Account]
    I --> J[Input Amount + Validasi source!=dest & amount>0]
    F --> K[Create Journal - JU-RECEIPT-*, JU-PAYMENT-*]
    G --> K
    J --> K2[Create Journal JU-TRF-{Date.now()}-{businessId} - Debit dest.coa, Credit source.coa, validasi debit==credit]
    K2 --> L[Update Cash / Bank Balance via COA]
    K --> L
    L --> M[Create Journal Lines - include coa]
    M --> N([Selesai])
    N --> O[Riwayat Transfer - GET /cash-bank-transfers?page=1&limit=10 - filter journalNo startsWith JU-TRF-, search, from/to, pagination 10/page]
    O --> P[List Cash Bank Accounts - GET /cash-bank-accounts?page=1&limit=10]
```

## 7. Accounting / Jurnal (pagination 10/page)

```mermaid
flowchart TD
    A([Accounting]) --> B{Sumber Transaksi?}
    B -->|Penjualan| C[Sales Journal JU-SALES-*]
    B -->|Pembelian| D[Purchase Journal JU-PURCHASE-*]
    B -->|Penerimaan| E[Receipt Journal JU-RECEIPT-*]
    B -->|Pembayaran| F[Payment Journal JU-PAYMENT-*]
    B -->|Transfer| G2[Transfer Journal JU-TRF-*]
    B -->|Penyusutan| G[Depreciation Journal JU-DEP-*]
    B -->|Manual| H[Manual Journal JU-MANUAL-*]
    C --> I[Create Journal - journalNo auto Date.now()+businessId]
    D --> I
    E --> I
    F --> I
    G2 --> I
    G --> I
    H --> I
    I --> J[Create Journal Lines - debit/credit per COA]
    J --> K{Debit = Credit?}
    K -->|Tidak| L[Journal Error - 400 Journal tidak balance]
    L --> M[Edit Journal]
    M --> J
    K -->|Ya| N[Post Journal - status posted]
    N --> O([Selesai])
    O --> P[List Jurnal - GET /journals?page=1&limit=10 - filter status/search/from/to, pagination 10/page, meta]
```

## 8. Piutang / Receivable (auto prefix RC)

```mermaid
flowchart TD
    A([Sales Invoice - invoiceNo SI...]) --> B{Payment Received?}
    B -->|Tidak| C[Outstanding Receivable - salesTotal - receiptTotal]
    B -->|Ya| D[Create Receipt]
    D --> D1{receiptNo / prefix?}
    D1 -->|Manual receiptNo| D2[Validasi receiptNo 1-50 unique per business]
    D1 -->|Auto| D3[prefix client default RC -> RC001 urut global per businessId di receipts]
    D2 --> E
    D3 --> E
    E[Input Payment Amount] --> F[Select Payment Method - cash/bank_transfer/e_wallet/other]
    F --> G[Select Cash / Bank Account - coaId]
    G --> H[Update Paid Amount + Journal JU-RECEIPT-* Debit Cash Credit AR 1100]
    H --> I{Fully Paid?}
    I -->|Tidak| J[Partially Paid]
    I -->|Ya| K[Paid]
    C --> L([Monitoring AR - GET /reports/ar])
    J --> L
    K --> L
    L --> M[Riwayat Receipt - GET /receipts?page=1&limit=10 pagination 10/page]
```

## 9. Hutang / Payable (auto prefix PP)

```mermaid
flowchart TD
    A([Purchase Invoice - invoiceNo PB...]) --> B{Payment Made?}
    B -->|Tidak| C[Outstanding Payable - purchaseTotal - paymentTotal]
    B -->|Ya| D[Create Purchase Payment]
    D --> D1{paymentNo / prefix?}
    D1 -->|Manual| D2[Validasi paymentNo 1-50 unique per business]
    D1 -->|Auto| D3[prefix client default PP -> PP001 urut global per businessId di purchase_payments]
    D2 --> E
    D3 --> E
    E[Input Payment Amount] --> F[Select Payment Method]
    F --> G[Select Cash / Bank Account]
    G --> H[Update Paid Amount + Journal JU-PAYMENT-* Debit AP 2010 Credit Cash]
    H --> I{Fully Paid?}
    I -->|Tidak| J[Partially Paid]
    I -->|Ya| K[Paid]
    C --> L([Monitoring AP - GET /reports/ap])
    J --> L
    K --> L
    L --> M[Riwayat Payment - GET /purchase-payments?page=1&limit=10 pagination 10/page]
```

## 10. Fixed Asset & Depreciation

```mermaid
flowchart TD
    A([Fixed Asset]) --> B[Input Asset]
    B --> C[Asset Name]
    C --> D[Acquisition Cost]
    D --> E[Acquisition Date]
    E --> F[Useful Life]
    F --> G[Residual Value]
    G --> H[Create Fixed Asset]
    H --> I[Calculate Monthly Depreciation]
    I --> J[Period End]
    J --> K[Create Asset Depreciation]
    K --> L[Update Accumulated Depreciation]
    L --> M[Update Book Value]
    M --> N[Create Depreciation Journal]
    N --> O[Debit Depreciation Expense]
    O --> P[Credit Accumulated Depreciation]
    P --> Q([Selesai])
```

Rumus penyusutan garis lurus:

```text
Depreciation = (Acquisition Cost - Residual Value) / Useful Life
```

## 11. Chart of Accounts

```mermaid
flowchart TD
    A([Chart of Accounts]) --> B[Create Account]
    B --> C[Input Code]
    C --> D[Input Name]
    D --> E[Select Account Type]
    E --> F{Parent Account?}
    F -->|Ya| G[Select Parent Account]
    F -->|Tidak| H[Root Account]
    G --> I[Save Account]
    H --> I
    I --> J[Account Active]
    J --> K([Selesai])
```

## 12. Tax

```mermaid
flowchart TD
    A([Tax Management]) --> B[Create Tax]
    B --> C[Input Tax Code]
    C --> D[Input Tax Name]
    D --> E[Input Tax Rate]
    E --> F[Set Active]
    F --> G[Save Tax]
    G --> H([Selesai])
```

## 13. Dashboard

```mermaid
flowchart TD
    A([Dashboard]) --> B[Select Period]
    B --> C[Load Business Data]
    C --> D[Calculate Omzet]
    C --> E[Calculate Revenue]
    C --> F[Calculate Expense]
    C --> G[Calculate Profit / Loss]
    C --> H[Calculate Cash & Bank]
    C --> I[Calculate Receivable]
    C --> J[Calculate Payable]
    C --> K[Calculate Stock]
    D --> L[Display Dashboard]
    E --> L
    F --> L
    G --> L
    H --> L
    I --> L
    J --> L
    K --> L
    L --> M([Selesai])
```

## 14. Reports (semua riwayat pagination 10/page)

```mermaid
flowchart TD
    A([Reports]) --> B{Pilih Laporan}
    B -->|Laba Rugi| C[Profit & Loss - agregat, no pagination]
    B -->|Neraca| D[Balance Sheet - agregat, no pagination]
    B -->|Arus Kas| E[Cash Flow - agregat, no pagination]
    B -->|Penjualan| F[Sales Report - GET /reports/sales?page=1&limit=10 - items paginated 10/page + meta + total]
    B -->|Pembelian| G[Purchase Report - GET /reports/purchase?page=1&limit=10 - items paginated]
    B -->|Stok| H[Inventory Report - GET /reports/stock?page=1&limit=10 - items paginated]
    B -->|Piutang| I[AR Report - agregat outstanding]
    B -->|Hutang| J[AP Report - agregat outstanding]
    B -->|Aset| K[Fixed Asset Report - GET /reports/fixed-assets?page=1&limit=10 - assets paginated + depreciations paginated + meta]
    C --> L[Filter Period from/to]
    D --> L
    E --> L
    F --> L
    G --> L
    H --> L
    I --> L
    J --> L
    K --> L
    L --> M[Query Business Data - businessId scoped, skip/take dari parsePagination default 10]
    M --> N[Generate Report - aggregate + paginated list]
    N --> O([Selesai - response success data + meta])
```

## 15. Relasi Besar Antar Modul

```mermaid
flowchart LR
    A[Users] --> B[Business Profiles]
    B --> C[Business Members]
    B --> D[Chart of Accounts]
    B --> E[Taxes]
    B --> F[Products]
    B --> G[Customers]
    B --> H[Suppliers]
    B --> I[Cash & Bank Accounts]
    G --> J[Sales Invoices]
    F --> J
    J --> K[Receipts]
    J --> L[Stock Movements]
    J --> M[Journals]
    H --> N[Purchase Invoices]
    F --> N
    N --> O[Purchase Payments]
    N --> L
    N --> M
    I --> K
    I --> O
    M --> P[Journal Lines]
    D --> P
    B --> Q[Fixed Assets]
    Q --> R[Asset Depreciations]
    R --> M
    J --> S[Reports]
    N --> S
    L --> S
    K --> S
    O --> S
    M --> S
    Q --> S
```

## 16. Multi-Tenant / Business Isolation (pagination scoped)

```mermaid
flowchart TD
    A[Authenticated User] --> B[Get Active Business - requireBusiness middleware]
    B --> C[Get business_id]
    C --> D[Business-scoped Query + parsePagination page/limit default 10]
    D --> E[Products - findMany skip/take]
    D --> F[Customers - skip/take]
    D --> G[Suppliers - skip/take]
    D --> H[Sales - sales_invoices skip/take]
    D --> I[Purchases - purchase_invoices skip/take]
    D --> J[Stock - stock_movements skip/take]
    D --> K[Cash & Bank - cash_bank_accounts skip/take + transfer history JU-TRF- skip/take]
    D --> L[Accounting - journals skip/take]
    D --> M[Assets - fixed_assets skip/take]
    E --> N[Response success data + meta page/limit/total/totalPages]
    F --> N
    G --> N
    H --> N
    I --> N
    J --> N
    K --> N
    L --> N
    M --> N
```

Aturan utama:

```text
User
  ↓
Business Membership
  ↓
business_id
  ↓
Business-scoped Query
  ↓
Business Data
```

## 17. Gambaran Arsitektur Keseluruhan

```mermaid
flowchart TB
    A[User] --> B[Authentication]
    B --> C[Business & Role]
    C --> D[Dashboard]
    D --> E[Sales]
    D --> F[Purchase]
    D --> G[Inventory]
    D --> H[Cash & Bank]
    D --> I[Accounting]
    D --> J[Fixed Asset]
    D --> K[Reports]
    E --> L[Customers]
    E --> M[Sales Invoice]
    E --> N[Receipts]
    F --> O[Suppliers]
    F --> P[Purchase Invoice]
    F --> Q[Purchase Payments]
    M --> G
    P --> G
    M --> I
    N --> I
    P --> I
    Q --> I
    H --> I
    J --> I
    I --> R[Journal]
    R --> S[Journal Lines]
    S --> T[Chart of Accounts]
    G --> U[Stock Movements]
    U --> V[Products]
    I --> K
    G --> K
    E --> K
    F --> K
    H --> K
    J --> K
```

## 18. Core Business Flow

```text
REGISTER / LOGIN
       ↓
BUSINESS
       ↓
DASHBOARD
       ↓
┌──────────────┬──────────────┬──────────────┐
│   PENJUALAN  │   PEMBELIAN  │     STOK     │
└──────┬───────┴──────┬───────┴──────┬───────┘
       ↓              ↓              ↓
   RECEIPT         PAYMENT       MOVEMENT
       │              │              │
       └──────────────┼──────────────┘
                      ↓
                  ACCOUNTING
                      ↓
              JOURNAL & LINES
                      ↓
                   REPORTS
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
     LABA RUGI      NERACA       ARUS KAS
```

## 19. Ringkasan Modul (sinkron 2026-09-16)

| Modul | Tabel | Pagination 10/page | Penomoran |
|---|---|---|---|
| Authentication | `users` | `GET /users?page=1&limit=10` | - |
| Business | `business_profiles`, `business_members` | `GET /businesses?page=1&limit=10` (businesses.service `listByUser` + `findByUserIdPaginated`) | - |
| COA | `chart_of_accounts` | `GET /chart-of-accounts?page=1&limit=10` | - |
| Tax | `taxes` | `GET /taxes?page=1&limit=10` | - |
| Accounting | `journals`, `journal_lines` | `GET /journals?page=1&limit=10` | `journalNo` auto `JU-SALES-*`, `JU-PURCHASE-*`, `JU-RECEIPT-*`, `JU-PAYMENT-*`, `JU-MANUAL-*`, `JU-TRF-*`, `JU-DEP-*` |
| Cash & Bank | `cash_bank_accounts` | `GET /cash-bank-accounts?page=1&limit=10` | `JU-TRF-*` untuk transfer |
| Cash Transfer History | `journals` filter `JU-TRF-` | `GET /cash-bank-transfers?page=1&limit=10` (baru) | - |
| Product | `products` | `GET /products?page=1&limit=10` | - |
| Inventory | `stock_movements` | `GET /stock-movements?page=1&limit=10`, `GET /reports/stock?page=1&limit=10` | - |
| Customer | `customers` | `GET /customers?page=1&limit=10` | - |
| Sales | `sales_invoices`, `sales_invoice_lines` | `GET /sales-invoices?page=1&limit=10`, `GET /reports/sales?page=1&limit=10` | `invoiceNo` manual atau `prefix` client (default `SI`) → `{prefix}{001}` urut global per businessId via `getNextNoTx` - `src/common/utils/numbering.js:1` |
| Receivable | `receipts` | `GET /receipts?page=1&limit=10` | `receiptNo` manual atau `prefix` default `RC` → `RC001` |
| Supplier | `suppliers` | `GET /suppliers?page=1&limit=10` | - |
| Purchase | `purchase_invoices`, `purchase_invoice_lines` | `GET /purchase-invoices?page=1&limit=10`, `GET /reports/purchase?page=1&limit=10` | `invoiceNo` manual atau `prefix` default `PB` → `PB001` |
| Payable | `purchase_payments` | `GET /purchase-payments?page=1&limit=10` | `paymentNo` manual atau `prefix` default `PP` → `PP001` |
| Fixed Asset | `fixed_assets`, `asset_depreciations` | `GET /fixed-assets?page=1&limit=10`, `GET /asset-depreciations?page=1&limit=10`, `GET /reports/fixed-assets?page=1&limit=10` | - |
| Reports | Data dari seluruh modul | `sales`, `purchase`, `stock`, `fixed-assets` paginated 10/page dengan `meta` | - |

Catatan pagination: semua list pakai `src/common/utils/pagination.js:1` `parsePagination(query)` default `page 1 limit 10 max 100` + `buildMeta` → `response {data, meta: {page,limit,total,totalPages}}`.
Catatan penomoran: prefix bebas 1-20 char dari client, angka `padStart(3,'0')` sequential per `businessId`+`prefix`+tabel, transaksi manual `invoiceNo` tetap didukung (backward compat).
