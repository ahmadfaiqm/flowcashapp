const prisma = require('../../config/database');

function buildDateFilter(field, from, to) {
  if (!from && !to) return {};
  const filter = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return { [field]: filter };
}

function buildDateFilterObj(from, to) {
  if (!from && !to) return undefined;
  const f = {};
  if (from) f.gte = new Date(from);
  if (to) f.lte = new Date(to);
  return f;
}

// Jurnal reversal (journalNo awalan VOID-) adalah artefak void: jurnal asli
// berstatus void sudah excluded, jadi reversal yang tertinggal sendirian harus
// ikut excluded agar void = hilang total dari laporan (tidak dangling).
function nonReversalJournalNo() {
  return { not: { startsWith: 'VOID-' } };
}

async function salesAggregate(businessId, from, to) {
  const where = { businessId, ...buildDateFilter('invoiceDate', from, to) };
  const result = await prisma.salesInvoice.aggregate({
    where,
    _sum: { totalAmount: true, paidAmount: true, subtotal: true, taxAmount: true, discountAmount: true },
    _count: { _all: true },
  });
  return result;
}

async function purchaseAggregate(businessId, from, to) {
  const where = { businessId, ...buildDateFilter('invoiceDate', from, to) };
  const result = await prisma.purchaseInvoice.aggregate({
    where,
    _sum: { totalAmount: true, paidAmount: true, subtotal: true, taxAmount: true, discountAmount: true },
    _count: { _all: true },
  });
  return result;
}

async function receiptsAggregate(businessId, from, to) {
  const where = { businessId, ...buildDateFilter('receiptDate', from, to) };
  const result = await prisma.receipt.aggregate({ where, _sum: { amount: true }, _count: { _all: true } });
  return result;
}

async function paymentsAggregate(businessId, from, to) {
  const where = { businessId, ...buildDateFilter('paymentDate', from, to) };
  const result = await prisma.purchasePayment.aggregate({ where, _sum: { amount: true }, _count: { _all: true } });
  return result;
}

async function stockAggregate(businessId) {
  const products = await prisma.product.findMany({ where: { businessId } });
  const totalStock = products.reduce((s, p) => s + Number(p.stock), 0);
  const lowStock = products.filter((p) => Number(p.stock) <= Number(p.minimumStock)).length;
  return { products, totalStock, lowStock, count: products.length };
}

async function arAggregate(businessId, from, to) {
  // Receivable = sales total - receipts total, and unpaid invoices
  const sales = await salesAggregate(businessId, from, to);
  const receipts = await receiptsAggregate(businessId, from, to);
  const outstandingInvoices = await prisma.salesInvoice.findMany({
    where: { businessId, status: { in: ['posted', 'partially_paid'] }, ...buildDateFilter('invoiceDate', from, to) },
    select: { totalAmount: true, paidAmount: true },
  });
  const outstanding = outstandingInvoices.reduce((s, inv) => s + (Number(inv.totalAmount) - Number(inv.paidAmount)), 0);
  return { sales, receipts, outstanding, outstandingCount: outstandingInvoices.length };
}

async function apAggregate(businessId, from, to) {
  const purchases = await purchaseAggregate(businessId, from, to);
  const payments = await paymentsAggregate(businessId, from, to);
  const outstandingInvoices = await prisma.purchaseInvoice.findMany({
    where: { businessId, status: { in: ['posted', 'partially_paid'] }, ...buildDateFilter('invoiceDate', from, to) },
    select: { totalAmount: true, paidAmount: true },
  });
  const outstanding = outstandingInvoices.reduce((s, inv) => s + (Number(inv.totalAmount) - Number(inv.paidAmount)), 0);
  return { purchases, payments, outstanding, outstandingCount: outstandingInvoices.length };
}

async function salesList(businessId, from, to, skip, take) {
  const where = { businessId, ...buildDateFilter('invoiceDate', from, to) };
  return prisma.salesInvoice.findMany({ where, orderBy: { invoiceDate: 'desc' }, skip, take });
}
async function salesCount(businessId, from, to) {
  const where = { businessId, ...buildDateFilter('invoiceDate', from, to) };
  return prisma.salesInvoice.count({ where });
}

async function purchaseList(businessId, from, to, skip, take) {
  const where = { businessId, ...buildDateFilter('invoiceDate', from, to) };
  return prisma.purchaseInvoice.findMany({ where, orderBy: { invoiceDate: 'desc' }, skip, take });
}
async function purchaseCount(businessId, from, to) {
  const where = { businessId, ...buildDateFilter('invoiceDate', from, to) };
  return prisma.purchaseInvoice.count({ where });
}
async function stockList(businessId, skip, take) {
  return prisma.product.findMany({ where: { businessId }, orderBy: { name: 'asc' }, skip, take });
}
async function stockCount(businessId) {
  return prisma.product.count({ where: { businessId } });
}
async function fixedAssetList(businessId, skip, take) {
  return prisma.fixedAsset.findMany({ where: { businessId }, orderBy: { acquisitionDate: 'desc' }, skip, take });
}
async function fixedAssetCount(businessId) {
  return prisma.fixedAsset.count({ where: { businessId } });
}
async function depreciationList(businessId, from, to, skip, take) {
  return prisma.assetDepreciation.findMany({
    where: { businessId, ...buildDateFilter('depreciationDate', from, to) },
    orderBy: { depreciationDate: 'desc' },
    include: { fixedAsset: true, journal: true },
    skip,
    take,
  });
}
async function depreciationCount(businessId, from, to) {
  return prisma.assetDepreciation.count({ where: { businessId, ...buildDateFilter('depreciationDate', from, to) } });
}

// ========== Fase 2: helpers for enhanced profitLoss ==========
async function journalExpenseAggregate(businessId, from, to) {
  const where = {
    coa: { businessId, accountType: 'Expense' },
    journal: { businessId, status: 'posted', journalNo: nonReversalJournalNo() },
  };
  const dateFilter = buildDateFilterObj(from, to);
  if (dateFilter) where.journal.journalDate = dateFilter;
  const result = await prisma.journalLine.aggregate({
    where,
    _sum: { debit: true, credit: true },
  });
  return result;
}

async function journalRevenueAggregate(businessId, from, to) {
  const where = {
    coa: { businessId, accountType: 'Revenue' },
    journal: { businessId, status: 'posted', journalNo: nonReversalJournalNo() },
  };
  const dateFilter = buildDateFilterObj(from, to);
  if (dateFilter) where.journal.journalDate = dateFilter;
  const result = await prisma.journalLine.aggregate({
    where,
    _sum: { debit: true, credit: true },
  });
  return result;
}

async function depreciationAggregate(businessId, from, to) {
  const where = { businessId, ...buildDateFilter('depreciationDate', from, to) };
  const result = await prisma.assetDepreciation.aggregate({
    where,
    _sum: { depreciationAmount: true },
    _count: { _all: true },
  });
  return result;
}

async function cashBankAggregate(businessId) {
  const result = await prisma.cashBankAccount.aggregate({
    where: { businessId },
    _sum: { openingBalance: true },
    _count: { _all: true },
  });
  return result;
}

async function fixedAssetsAggregate(businessId) {
  const result = await prisma.fixedAsset.aggregate({
    where: { businessId },
    _sum: { acquisitionCost: true, accumulatedDepreciation: true, bookValue: true },
    _count: { _all: true },
  });
  return result;
}

async function productsStockValueAggregate(businessId) {
  const products = await prisma.product.findMany({
    where: { businessId },
    select: { stock: true, purchasePrice: true, sellingPrice: true },
  });
  const stockValuePurchase = products.reduce((s, p) => s + Number(p.stock) * Number(p.purchasePrice || 0), 0);
  const stockValueSelling = products.reduce((s, p) => s + Number(p.stock) * Number(p.sellingPrice || 0), 0);
  return { stockValuePurchase, stockValueSelling, count: products.length };
}

// ========== SAK: Worksheet helpers & JournalLine aggregation ==========
async function findCoAs(businessId) {
  return prisma.chartOfAccount.findMany({ where: { businessId, isActive: true }, orderBy: { code: 'asc' } });
}

async function journalLineGroupsByCoA(businessId, from, to, isAdjustment) {
  const where = {
    journal: { businessId, status: 'posted', journalNo: nonReversalJournalNo(), ...buildDateFilter('journalDate', from, to) },
    coa: { businessId },
  };
  if (isAdjustment !== undefined && isAdjustment !== null) where.journal.isAdjustment = isAdjustment;
  return prisma.journalLine.groupBy({ by: ['coaId'], where, _sum: { debit: true, credit: true } });
}

async function journalLineGroupsBefore(businessId, beforeDate) {
  const where = {
    journal: { businessId, status: 'posted', journalNo: nonReversalJournalNo(), journalDate: { lt: new Date(beforeDate) } },
    coa: { businessId },
  };
  return prisma.journalLine.groupBy({ by: ['coaId'], where, _sum: { debit: true, credit: true } });
}

// ========== Refactored Balance Sheet via JournalLine (single source, handle isContra) ==========
async function balanceSheetAggregate(businessId, from, to) {
  const coas = await findCoAs(businessId);
  // Balance sheet is snapshot at `to` (or now) — not BETWEEN; `from` ignored to include opening balances
  let whereJournal = { businessId, status: 'posted', journalNo: nonReversalJournalNo() };
  if (to) {
    whereJournal.journalDate = { lte: new Date(to) };
  } else if (from && !to) {
    // if only `from` without `to`, snapshot semantics require opening balances included — no date filter
  }
  // If no date filter, we include all; but for period filtered balance sheet we respect from/to
  const groups = await prisma.journalLine.groupBy({
    by: ['coaId'],
    where: { journal: whereJournal, coa: { businessId, accountType: { in: ['Asset', 'Liability', 'Equity'] } } },
    _sum: { debit: true, credit: true },
  });
  const groupMap = new Map(groups.map((g) => [g.coaId, g]));

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquityBase = 0;
  const details = [];

  for (const coa of coas.filter((c) => ['Asset', 'Liability', 'Equity'].includes(c.accountType))) {
    const g = groupMap.get(coa.id);
    const d = Number(g?._sum.debit || 0);
    const c = Number(g?._sum.credit || 0);
    // isContra handling: normal balance determines sign, but contra flag indicates presentation invert
    // We compute net as debit-credit for Asset, credit-debit for Liability/Equity; isContra accounts will naturally be negative when summed
    let net = 0;
    if (coa.accountType === 'Asset') net = d - c;
    else net = c - d; // Liability, Equity credit normal
    // note: isContra does not flip sign here because map already produces negative for contra (e.g., 1520 credit -> -200)
    // Keep isContra in details for FE presentation
    details.push({ coaId: coa.id, code: coa.code, name: coa.name, accountType: coa.accountType, isContra: !!coa.isContra, normalBalance: coa.normalBalance, debit: d, credit: c, net });
    if (coa.accountType === 'Asset') totalAssets += net;
    else if (coa.accountType === 'Liability') totalLiabilities += net;
    else if (coa.accountType === 'Equity') totalEquityBase += net;
  }

  // Compute netIncome for period to add to equity (laba berjalan) for snapshot
  let netIncome = 0;
  if (from || to) {
    const revAgg = await prisma.journalLine.aggregate({
      where: { journal: { businessId, status: 'posted', journalNo: nonReversalJournalNo(), ...buildDateFilter('journalDate', from, to) }, coa: { businessId, accountType: 'Revenue' } },
      _sum: { debit: true, credit: true },
    });
    const expAgg = await prisma.journalLine.aggregate({
      where: { journal: { businessId, status: 'posted', journalNo: nonReversalJournalNo(), ...buildDateFilter('journalDate', from, to) }, coa: { businessId, accountType: 'Expense' } },
      _sum: { debit: true, credit: true },
    });
    const rev = Number(revAgg._sum.credit || 0) - Number(revAgg._sum.debit || 0);
    const exp = Number(expAgg._sum.debit || 0) - Number(expAgg._sum.credit || 0);
    netIncome = rev - exp;
  } else {
    // if no period, netIncome 0 (balance sheet as of now includes all closed periods already in 3120)
    netIncome = 0;
  }

  const totalEquity = totalEquityBase + netIncome;
  const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  return {
    assets: { total: totalAssets, details: details.filter((d) => d.accountType === 'Asset') },
    liabilities: { total: totalLiabilities, details: details.filter((d) => d.accountType === 'Liability') },
    equity: { total: totalEquity, base: totalEquityBase, netIncome, details: details.filter((d) => d.accountType === 'Equity') },
    totals: { assets: totalAssets, liabilities: totalLiabilities, equity: totalEquity, netIncome, balanced },
    details,
    breakdown: { groups, coas },
  };
}

// ========== Fase 2: Cash Flow ==========
async function cashFlowAggregate(businessId, from, to) {
  const [receipts, payments, journalsCash] = await Promise.all([
    receiptsAggregate(businessId, from, to),
    paymentsAggregate(businessId, from, to),
    // also count cash transfer journals in period for info
    prisma.journal.count({
      where: {
        businessId,
        status: 'posted',
        journalNo: nonReversalJournalNo(),
        ...buildDateFilter('journalDate', from, to),
        // transfer journals contain TRF in journalNo or have cash COA lines; simplified: count all posted journals in period
      },
    }),
  ]);

  const cashIn = Number(receipts._sum.amount || 0);
  const cashOut = Number(payments._sum.amount || 0);
  const net = cashIn - cashOut;

  // Try to include cash journal lines for completeness (inflows via debit cash, outflows via credit cash)
  // Find cash-type COAs (Asset type that are cash/bank: heuristic code starts with 1)
  // For simplicity aggregate journal lines where coa is Asset and journal in period
  let journalCashIn = 0;
  let journalCashOut = 0;
  try {
    const cashLines = await prisma.journalLine.aggregate({
      where: {
        journal: { businessId, status: 'posted', journalNo: nonReversalJournalNo(), ...buildDateFilter('journalDate', from, to) },
        coa: { businessId, accountType: 'Asset' },
      },
      _sum: { debit: true, credit: true },
    });
    // Note: this aggregates all asset debits/credits, not strictly cash; kept for reference
    journalCashIn = Number(cashLines._sum.debit || 0);
    journalCashOut = Number(cashLines._sum.credit || 0);
  } catch (_) {
    // ignore if fails
  }

  return {
    receipts,
    payments,
    cashIn,
    cashOut,
    netCashFlow: net,
    net,
    journalsCash,
    journalCashIn,
    journalCashOut,
  };
}

// ========== Fase 2: Fixed Asset Report ==========
async function fixedAssetReportAggregate(businessId, from, to) {
  const [assetsAgg, depreciationsAgg, assets, depreciations] = await Promise.all([
    prisma.fixedAsset.aggregate({
      where: { businessId },
      _sum: { acquisitionCost: true, accumulatedDepreciation: true, bookValue: true, residualValue: true },
      _count: { _all: true },
    }),
    prisma.assetDepreciation.aggregate({
      where: { businessId, ...buildDateFilter('depreciationDate', from, to) },
      _sum: { depreciationAmount: true, accumulatedAmount: true },
      _count: { _all: true },
    }),
    prisma.fixedAsset.findMany({
      where: { businessId },
      orderBy: { acquisitionDate: 'desc' },
      include: {
        depreciations: {
          where: { ...buildDateFilter('depreciationDate', from, to) },
          orderBy: { depreciationDate: 'desc' },
        },
      },
    }),
    prisma.assetDepreciation.findMany({
      where: { businessId, ...buildDateFilter('depreciationDate', from, to) },
      orderBy: { depreciationDate: 'desc' },
      include: { fixedAsset: true, journal: true },
    }),
  ]);

  return {
    assetsAgg,
    depreciationsAgg,
    assets,
    depreciations,
  };
}

// alias required by spec: fixedAssetReport
const fixedAssetReport = fixedAssetReportAggregate;

module.exports = {
  salesAggregate,
  purchaseAggregate,
  receiptsAggregate,
  paymentsAggregate,
  stockAggregate,
  arAggregate,
  apAggregate,
  salesList,
  salesCount,
  purchaseList,
  purchaseCount,
  stockList,
  stockCount,
  fixedAssetList,
  fixedAssetCount,
  depreciationList,
  depreciationCount,
  // Fase 2 helpers
  journalExpenseAggregate,
  journalRevenueAggregate,
  depreciationAggregate,
  cashBankAggregate,
  fixedAssetsAggregate,
  productsStockValueAggregate,
  balanceSheetAggregate,
  cashFlowAggregate,
  fixedAssetReportAggregate,
  fixedAssetReport,
  // SAK helpers
  findCoAs,
  journalLineGroupsByCoA,
  journalLineGroupsBefore,
};
