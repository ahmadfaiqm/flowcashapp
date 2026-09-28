const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const prisma = require('../../config/database');
const repo = require('./reports.repository');

// ========== SAK Worksheet 10 kolom ==========
async function worksheet(businessId, query) {
  const from = query.from || query.startDate || undefined;
  const to = query.to || query.endDate || undefined;

  const coas = await prisma.chartOfAccount.findMany({ where: { businessId, isActive: true }, orderBy: { code: 'asc' } });
  const trialGroups = await repo.journalLineGroupsByCoA(businessId, from, to, false);
  const adjGroups = await repo.journalLineGroupsByCoA(businessId, from, to, true);

  const trialMap = new Map(trialGroups.map((g) => [g.coaId, g]));
  const adjMap = new Map(adjGroups.map((g) => [g.coaId, g]));

  const rows = [];
  let trialDebit = 0;
  let trialCredit = 0;
  let adjDebit = 0;
  let adjCredit = 0;
  let adjustedDebit = 0;
  let adjustedCredit = 0;
  let incomeDebit = 0;
  let incomeCredit = 0;
  let balanceDebit = 0;
  let balanceCredit = 0;

  for (const coa of coas) {
    const t = trialMap.get(coa.id);
    const a = adjMap.get(coa.id);
    const tD = Number(t?._sum.debit || 0);
    const tC = Number(t?._sum.credit || 0);
    const aD = Number(a?._sum.debit || 0);
    const aC = Number(a?._sum.credit || 0);
    const adjD = tD + aD;
    const adjC = tC + aC;

    trialDebit += tD;
    trialCredit += tC;
    adjDebit += aD;
    adjCredit += aC;
    adjustedDebit += adjD;
    adjustedCredit += adjC;

    const isIncome = coa.accountType === 'Revenue' || coa.accountType === 'Expense';
    let incD = 0;
    let incC = 0;
    let balD = 0;
    let balC = 0;
    if (isIncome) {
      incD = adjD;
      incC = adjC;
      incomeDebit += incD;
      incomeCredit += incC;
    } else {
      balD = adjD;
      balC = adjC;
      balanceDebit += balD;
      balanceCredit += balC;
    }

    rows.push({
      coaId: coa.id,
      code: coa.code,
      name: coa.name,
      accountType: coa.accountType,
      isContra: !!coa.isContra,
      normalBalance: coa.normalBalance,
      trial: { debit: tD, credit: tC, balance: tD - tC },
      adjustment: { debit: aD, credit: aC },
      adjusted: { debit: adjD, credit: adjC, balance: adjD - adjC },
      income: { debit: incD, credit: incC },
      balanceSheet: { debit: balD, credit: balC },
    });
  }

  const netIncome = incomeCredit - incomeDebit;
  // For worksheet validation, balanceDebit + incomeDebit should equal balanceCredit + incomeCredit when adjusted balanced
  // totals check already done

  return {
    period: { from: from || null, to: to || null },
    rows,
    totals: {
      trialDebit,
      trialCredit,
      adjustmentDebit: adjDebit,
      adjustmentCredit: adjCredit,
      adjustedDebit,
      adjustedCredit,
      incomeDebit,
      incomeCredit,
      balanceDebit,
      balanceCredit,
      netIncome,
      // aliases for test compatibility
      adjustedDebitAlias: adjustedDebit,
      adjustedCreditAlias: adjustedCredit,
    },
  };
}

async function adjustedTrialBalance(businessId, query) {
  const ws = await worksheet(businessId, query);
  const rows = ws.rows.map((r) => ({ code: r.code, name: r.name, accountType: r.accountType, isContra: r.isContra, debit: r.adjusted.debit, credit: r.adjusted.credit, balance: r.adjusted.balance }));
  return { period: ws.period, rows, totals: { debit: ws.totals.adjustedDebit, credit: ws.totals.adjustedCredit } };
}

async function capitalChange(businessId, query) {
  const from = query.from || query.startDate || undefined;
  const to = query.to || query.endDate || undefined;
  const ws = await worksheet(businessId, query);
  const labaBersih = ws.totals.netIncome;

  // modalAwal = saldo Equity (3110+3120) sebelum from
  let modalAwal = 0;
  if (from) {
    const beforeGroups = await repo.journalLineGroupsBefore(businessId, from);
    const coas = await prisma.chartOfAccount.findMany({ where: { businessId, isActive: true } });
    const coaMap = new Map(coas.map((c) => [c.id, c]));
    for (const g of beforeGroups) {
      const coa = coaMap.get(g.coaId);
      if (!coa || coa.accountType !== 'Equity') continue;
      const d = Number(g._sum.debit || 0);
      const c = Number(g._sum.credit || 0);
      // Equity net = credit - debit (contra will be negative)
      const net = c - d;
      modalAwal += net;
    }
    // also if no journals before, check CapitalMovement initial may already be in journals but we include anyway
  } else {
    modalAwal = 0;
  }

  // setoran / prive from CapitalMovement between from-to
  const dateFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);
  const movementWhere = { businessId };
  if (from || to) movementWhere.date = dateFilter;
  const movements = await prisma.capitalMovement.findMany({ where: movementWhere, orderBy: { date: 'asc' } });
  let setoran = 0;
  let prive = 0;
  for (const m of movements) {
    const amt = Number(m.amount || 0);
    if (m.type === 'prive') prive += amt;
    else if (m.type === 'additional' || m.type === 'initial') setoran += amt;
  }

  const modalAkhir = modalAwal + setoran - prive + labaBersih;

  return {
    period: { from: from || null, to: to || null },
    modalAwal,
    setoran,
    prive,
    labaBersih,
    modalAkhir,
    movements,
  };
}

// Refactored profitLoss to use JournalLine aggregation (single source)
async function profitLoss(businessId, query) {
  const from = query.from || query.startDate || query.fromDate || undefined;
  const to = query.to || query.endDate || query.toDate || undefined;

  const [revenueLines, expenseLines] = await Promise.all([
    repo.journalRevenueAggregate(businessId, from, to),
    repo.journalExpenseAggregate(businessId, from, to),
  ]);

  const revenue = Number(revenueLines._sum.credit || 0) - Number(revenueLines._sum.debit || 0);
  const expenseFromJournals = Number(expenseLines._sum.debit || 0) - Number(expenseLines._sum.credit || 0);
  const expenseTotal = Math.max(0, expenseFromJournals);
  const netProfit = revenue - expenseTotal;
  const grossProfit = revenue - expenseTotal;

  // Keep compatibility fields but sales/purchase totals zeroed (since single source)
  const salesTotal = revenue > 0 ? revenue : 0;
  const purchaseTotal = 0;

  return {
    period: { from: from || null, to: to || null },
    salesTotal,
    purchaseTotal,
    grossProfit,
    netProfit,
    profit: netProfit,
    revenue,
    revenueJournalTotal: revenue,
    expenseTotal,
    expenseJournalTotal: expenseFromJournals,
    depreciationTotal: 0,
    receiptTotal: 0,
    paymentTotal: 0,
    salesCount: 0,
    purchaseCount: 0,
    receiptsCount: 0,
    paymentsCount: 0,
    depreciationsCount: 0,
  };
}

async function salesReport(businessId, query) {
  const from = query.from || query.startDate || undefined;
  const to = query.to || query.endDate || undefined;
  const { page, limit, skip, take } = parsePagination(query);
  const [agg, list, total] = await Promise.all([
    repo.salesAggregate(businessId, from, to),
    repo.salesList(businessId, from, to, skip, take),
    repo.salesCount(businessId, from, to),
  ]);
  return {
    period: { from: from || null, to: to || null },
    total: Number(agg._sum.totalAmount || 0),
    count: agg._count._all,
    paidAmount: Number(agg._sum.paidAmount || 0),
    subtotal: Number(agg._sum.subtotal || 0),
    items: list,
    meta: buildMeta(page, limit, total),
  };
}

async function purchaseReport(businessId, query) {
  const from = query.from || query.startDate || undefined;
  const to = query.to || query.endDate || undefined;
  const { page, limit, skip, take } = parsePagination(query);
  const [agg, list, total] = await Promise.all([
    repo.purchaseAggregate(businessId, from, to),
    repo.purchaseList(businessId, from, to, skip, take),
    repo.purchaseCount(businessId, from, to),
  ]);
  return {
    period: { from: from || null, to: to || null },
    total: Number(agg._sum.totalAmount || 0),
    count: agg._count._all,
    paidAmount: Number(agg._sum.paidAmount || 0),
    subtotal: Number(agg._sum.subtotal || 0),
    items: list,
    meta: buildMeta(page, limit, total),
  };
}

async function stockReport(businessId, query = {}) {
  const { page, limit, skip, take } = parsePagination(query);
  const [data, items, total] = await Promise.all([
    repo.stockAggregate(businessId),
    repo.stockList(businessId, skip, take),
    repo.stockCount(businessId),
  ]);
  return {
    count: data.count,
    totalStock: data.totalStock,
    lowStock: data.lowStock,
    items,
    meta: buildMeta(page, limit, total),
  };
}

async function arReport(businessId, query) {
  const from = query.from || query.startDate || undefined;
  const to = query.to || query.endDate || undefined;
  const data = await repo.arAggregate(businessId, from, to);
  return {
    period: { from: from || null, to: to || null },
    salesTotal: Number(data.sales._sum.totalAmount || 0),
    receiptTotal: Number(data.receipts._sum.amount || 0),
    outstanding: data.outstanding,
    outstandingCount: data.outstandingCount,
    receivable: data.outstanding,
  };
}

async function apReport(businessId, query) {
  const from = query.from || query.startDate || undefined;
  const to = query.to || query.endDate || undefined;
  const data = await repo.apAggregate(businessId, from, to);
  return {
    period: { from: from || null, to: to || null },
    purchaseTotal: Number(data.purchases._sum.totalAmount || 0),
    paymentTotal: Number(data.payments._sum.amount || 0),
    outstanding: data.outstanding,
    outstandingCount: data.outstandingCount,
    payable: data.outstanding,
  };
}

async function balanceSheet(businessId, query) {
  const from = query.from || query.startDate || undefined;
  const to = query.to || query.endDate || query.toDate || undefined;
  const data = await repo.balanceSheetAggregate(businessId, from, to);
  return {
    period: { from: from || null, to: to || null },
    assets: data.assets,
    liabilities: data.liabilities,
    equity: data.equity,
    totals: data.totals,
    // flat aliases for convenience
    totalAssets: data.totals.assets,
    totalLiabilities: data.totals.liabilities,
    totalEquity: data.totals.equity,
    details: data,
  };
}

async function cashFlow(businessId, query) {
  const from = query.from || query.startDate || undefined;
  const to = query.to || query.endDate || undefined;
  const data = await repo.cashFlowAggregate(businessId, from, to);
  return {
    period: { from: from || null, to: to || null },
    cashIn: data.cashIn,
    cashOut: data.cashOut,
    netCashFlow: data.netCashFlow,
    net: data.net,
    receiptTotal: data.cashIn,
    paymentTotal: data.cashOut,
    receiptsCount: data.receipts._count._all,
    paymentsCount: data.payments._count._all,
    journalsCashCount: data.journalsCash,
    journalCashIn: data.journalCashIn,
    journalCashOut: data.journalCashOut,
    details: data,
  };
}

async function fixedAssetReport(businessId, query) {
  const from = query.from || query.startDate || undefined;
  const to = query.to || query.endDate || undefined;
  const { page, limit, skip, take } = parsePagination(query);
  const [data, paginatedAssets, total, paginatedDepr, deprTotal] = await Promise.all([
    repo.fixedAssetReportAggregate(businessId, from, to),
    repo.fixedAssetList(businessId, skip, take),
    repo.fixedAssetCount(businessId),
    repo.depreciationList(businessId, from, to, skip, take),
    repo.depreciationCount(businessId, from, to),
  ]);
  const totalAcquisitionCost = Number(data.assetsAgg._sum.acquisitionCost || 0);
  const totalAccumulatedDepreciation = Number(data.assetsAgg._sum.accumulatedDepreciation || 0);
  const totalBookValue = Number(data.assetsAgg._sum.bookValue || 0);
  const totalResidualValue = Number(data.assetsAgg._sum.residualValue || 0);
  const periodDepreciationTotal = Number(data.depreciationsAgg._sum.depreciationAmount || 0);

  return {
    period: { from: from || null, to: to || null },
    totals: {
      count: data.assetsAgg._count._all,
      totalAcquisitionCost,
      totalAccumulatedDepreciation,
      totalBookValue,
      totalResidualValue,
      periodDepreciationTotal,
      depreciationsCount: data.depreciationsAgg._count._all,
    },
    count: data.assetsAgg._count._all,
    totalAcquisitionCost,
    totalAccumulatedDepreciation,
    totalBookValue,
    periodDepreciationTotal,
    assets: paginatedAssets,
    depreciations: paginatedDepr,
    items: paginatedAssets,
    meta: buildMeta(page, limit, total),
    depreciationMeta: buildMeta(page, limit, deprTotal),
  };
}

module.exports = { profitLoss, salesReport, purchaseReport, stockReport, arReport, apReport, balanceSheet, cashFlow, fixedAssetReport, worksheet, adjustedTrialBalance, capitalChange };
