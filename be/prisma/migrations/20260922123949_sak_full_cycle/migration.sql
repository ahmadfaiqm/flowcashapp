-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('supplies', 'depreciation', 'prepaidExpense', 'unearnedRevenue', 'accruedExpense', 'accruedRevenue', 'other');

-- AlterTable
ALTER TABLE "chart_of_accounts" ADD COLUMN     "is_contra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "normal_balance" TEXT;

-- AlterTable
ALTER TABLE "journals" ADD COLUMN     "adjustment_type" "AdjustmentType",
ADD COLUMN     "is_adjustment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "period_month" INTEGER,
ADD COLUMN     "period_year" INTEGER;

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capital_movements" (
    "id" SERIAL NOT NULL,
    "business_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "journal_id" INTEGER,

    CONSTRAINT "capital_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_business_id_year_month_key" ON "accounting_periods"("business_id", "year", "month");

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_movements" ADD CONSTRAINT "capital_movements_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill periodYear/periodMonth for existing journals
UPDATE "journals" SET "period_year" = EXTRACT(YEAR FROM "journal_date")::int, "period_month" = EXTRACT(MONTH FROM "journal_date")::int WHERE "period_year" IS NULL;

-- Backfill isContra/normalBalance for SAK contra accounts
UPDATE "chart_of_accounts" SET "is_contra" = true, "normal_balance" = 'credit' WHERE "code" = '1520';
UPDATE "chart_of_accounts" SET "is_contra" = true, "normal_balance" = 'debit' WHERE "code" = '3111';
