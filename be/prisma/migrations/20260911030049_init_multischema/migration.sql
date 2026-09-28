-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "accounting";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "asset";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cashbank";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inventory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "purchase";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sales";

-- CreateEnum
CREATE TYPE "accounting"."AccountType" AS ENUM ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense');

-- CreateEnum
CREATE TYPE "accounting"."JournalStatus" AS ENUM ('draft', 'posted', 'void');

-- CreateEnum
CREATE TYPE "accounting"."InvoiceStatus" AS ENUM ('draft', 'unpaid', 'partial', 'paid', 'void');

-- CreateEnum
CREATE TYPE "accounting"."PaymentMethod" AS ENUM ('cash', 'transfer', 'qris', 'giro', 'other');

-- CreateTable
CREATE TABLE "accounting"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "password_hash" VARCHAR NOT NULL,
    "role" VARCHAR NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."business_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "business_name" VARCHAR NOT NULL,
    "address" TEXT,
    "phone" VARCHAR,
    "tax_id" VARCHAR,
    "base_currency" VARCHAR NOT NULL DEFAULT 'IDR',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."chart_of_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "type" "accounting"."AccountType" NOT NULL,
    "parent_id" UUID,
    "is_cash_bank" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."taxes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "coa_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."journals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "journal_no" VARCHAR NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "reference_type" VARCHAR,
    "reference_id" UUID,
    "status" "accounting"."JournalStatus" NOT NULL DEFAULT 'draft',
    "created_by" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."journal_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "journal_id" UUID NOT NULL,
    "coa_id" UUID NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "memo" VARCHAR,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashbank"."cash_bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "coa_id" UUID NOT NULL,
    "bank_name" VARCHAR NOT NULL,
    "account_number" VARCHAR,
    "opening_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cash_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "unit" VARCHAR NOT NULL DEFAULT 'pcs',
    "purchase_price" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sell_price" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "avg_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "stock_qty" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "coa_inventory_id" UUID,
    "coa_sales_id" UUID,
    "coa_cogs_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" VARCHAR NOT NULL,
    "qty" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reference_type" VARCHAR,
    "reference_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "phone" VARCHAR,
    "address" TEXT,
    "receivable_coa_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."sales_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_no" VARCHAR NOT NULL,
    "customer_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "due_date" DATE,
    "tax_id" UUID,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(15,2) NOT NULL,
    "paid_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "accounting"."InvoiceStatus" NOT NULL DEFAULT 'unpaid',
    "journal_id" UUID,
    "cash_bank_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."sales_invoice_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sales_invoice_id" UUID NOT NULL,
    "product_id" UUID,
    "description" VARCHAR NOT NULL,
    "qty" DECIMAL(12,2) NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "sales_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receipt_no" VARCHAR NOT NULL,
    "sales_invoice_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "method" "accounting"."PaymentMethod" NOT NULL DEFAULT 'transfer',
    "cash_bank_id" UUID NOT NULL,
    "journal_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase"."suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "phone" VARCHAR,
    "address" TEXT,
    "payable_coa_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase"."purchase_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_no" VARCHAR NOT NULL,
    "supplier_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "due_date" DATE,
    "tax_id" UUID,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(15,2) NOT NULL,
    "paid_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "accounting"."InvoiceStatus" NOT NULL DEFAULT 'unpaid',
    "journal_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase"."purchase_invoice_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_invoice_id" UUID NOT NULL,
    "product_id" UUID,
    "description" VARCHAR NOT NULL,
    "qty" DECIMAL(12,2) NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "purchase_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase"."purchase_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_no" VARCHAR NOT NULL,
    "purchase_invoice_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "method" "accounting"."PaymentMethod" NOT NULL DEFAULT 'transfer',
    "cash_bank_id" UUID NOT NULL,
    "journal_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset"."fixed_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "purchase_date" DATE NOT NULL,
    "purchase_cost" DECIMAL(15,2) NOT NULL,
    "useful_life_months" INTEGER NOT NULL,
    "salvage_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "coa_asset_id" UUID,
    "coa_depreciation_id" UUID,
    "coa_accumulated_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset"."asset_depreciations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fixed_asset_id" UUID NOT NULL,
    "period" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "journal_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_depreciations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "accounting"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "accounting"."chart_of_accounts"("code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_type_idx" ON "accounting"."chart_of_accounts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "taxes_code_key" ON "accounting"."taxes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "journals_journal_no_key" ON "accounting"."journals"("journal_no");

-- CreateIndex
CREATE INDEX "journals_date_idx" ON "accounting"."journals"("date");

-- CreateIndex
CREATE INDEX "journals_reference_type_reference_id_idx" ON "accounting"."journals"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "journal_lines_journal_id_idx" ON "accounting"."journal_lines"("journal_id");

-- CreateIndex
CREATE INDEX "journal_lines_coa_id_idx" ON "accounting"."journal_lines"("coa_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_bank_accounts_coa_id_key" ON "cashbank"."cash_bank_accounts"("coa_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "inventory"."products"("sku");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "inventory"."stock_movements"("product_id");

-- CreateIndex
CREATE INDEX "stock_movements_date_idx" ON "inventory"."stock_movements"("date");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "sales"."customers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_invoice_no_key" ON "sales"."sales_invoices"("invoice_no");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receipt_no_key" ON "sales"."receipts"("receipt_no");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "purchase"."suppliers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_invoice_no_key" ON "purchase"."purchase_invoices"("invoice_no");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_payments_payment_no_key" ON "purchase"."purchase_payments"("payment_no");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_code_key" ON "asset"."fixed_assets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "asset_depreciations_fixed_asset_id_period_key" ON "asset"."asset_depreciations"("fixed_asset_id", "period");

-- AddForeignKey
ALTER TABLE "accounting"."business_profiles" ADD CONSTRAINT "business_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "accounting"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."taxes" ADD CONSTRAINT "taxes_coa_id_fkey" FOREIGN KEY ("coa_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."journals" ADD CONSTRAINT "journals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounting"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."journal_lines" ADD CONSTRAINT "journal_lines_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "accounting"."journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."journal_lines" ADD CONSTRAINT "journal_lines_coa_id_fkey" FOREIGN KEY ("coa_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashbank"."cash_bank_accounts" ADD CONSTRAINT "cash_bank_accounts_coa_id_fkey" FOREIGN KEY ("coa_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."products" ADD CONSTRAINT "products_coa_inventory_id_fkey" FOREIGN KEY ("coa_inventory_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."products" ADD CONSTRAINT "products_coa_sales_id_fkey" FOREIGN KEY ("coa_sales_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."products" ADD CONSTRAINT "products_coa_cogs_id_fkey" FOREIGN KEY ("coa_cogs_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."customers" ADD CONSTRAINT "customers_receivable_coa_id_fkey" FOREIGN KEY ("receivable_coa_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "sales"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales_invoices" ADD CONSTRAINT "sales_invoices_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "accounting"."taxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales_invoices" ADD CONSTRAINT "sales_invoices_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "accounting"."journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales_invoices" ADD CONSTRAINT "sales_invoices_cash_bank_id_fkey" FOREIGN KEY ("cash_bank_id") REFERENCES "cashbank"."cash_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales"."sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."receipts" ADD CONSTRAINT "receipts_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales"."sales_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."receipts" ADD CONSTRAINT "receipts_cash_bank_id_fkey" FOREIGN KEY ("cash_bank_id") REFERENCES "cashbank"."cash_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."receipts" ADD CONSTRAINT "receipts_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "accounting"."journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase"."suppliers" ADD CONSTRAINT "suppliers_payable_coa_id_fkey" FOREIGN KEY ("payable_coa_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "purchase"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "accounting"."taxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "accounting"."journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase"."purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "purchase"."purchase_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase"."purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase"."purchase_payments" ADD CONSTRAINT "purchase_payments_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "purchase"."purchase_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase"."purchase_payments" ADD CONSTRAINT "purchase_payments_cash_bank_id_fkey" FOREIGN KEY ("cash_bank_id") REFERENCES "cashbank"."cash_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase"."purchase_payments" ADD CONSTRAINT "purchase_payments_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "accounting"."journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset"."fixed_assets" ADD CONSTRAINT "fixed_assets_coa_asset_id_fkey" FOREIGN KEY ("coa_asset_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset"."fixed_assets" ADD CONSTRAINT "fixed_assets_coa_depreciation_id_fkey" FOREIGN KEY ("coa_depreciation_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset"."fixed_assets" ADD CONSTRAINT "fixed_assets_coa_accumulated_id_fkey" FOREIGN KEY ("coa_accumulated_id") REFERENCES "accounting"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset"."asset_depreciations" ADD CONSTRAINT "asset_depreciations_fixed_asset_id_fkey" FOREIGN KEY ("fixed_asset_id") REFERENCES "asset"."fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset"."asset_depreciations" ADD CONSTRAINT "asset_depreciations_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "accounting"."journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
