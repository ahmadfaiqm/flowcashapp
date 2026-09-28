const repo = require('./dashboard.repository');

async function getSummary(businessId, query) {
  const from = query.from || query.startDate || query.fromDate || undefined;
  const to = query.to || query.endDate || query.toDate || undefined;

  const [
    sales,
    purchases,
    receipts,
    payments,
    products,
    lowStock,
    customers,
    suppliers,
    cashBank,
    journalsCnt,
    expenseLines,
    revenueLines,
    depreciationAgg,
  ] = await Promise.all([
    repo.salesAggregate(businessId, from, to),
    repo.purchaseAggregate(businessId, from, to),
    repo.receiptsAggregate(businessId, from, to),
    repo.paymentsAggregate(businessId, from, to),
    repo.productsAggregate(businessId),
    repo.lowStockCount(businessId),
    repo.customersCount(businessId),
    repo.suppliersCount(businessId),
    repo.cashBankAggregate(businessId),
    repo.journalsCount(businessId, from, to),
    repo.expenseLinesAggregate(businessId, from, to),
    repo.revenueLinesAggregate(businessId, from, to),
    repo.depreciationAggregate(businessId, from, to),
  ]);

  const salesTotal = Number(sales._sum.totalAmount || 0);
  const purchaseTotal = Number(purchases._sum.totalAmount || 0);
  const receiptTotal = Number(receipts._sum.amount || 0);
  const paymentTotal = Number(payments._sum.amount || 0);

  // Revenue / Omzet (Flowchart #13)
  const revenueJournalCredit = Number(revenueLines._sum.credit || 0);
  const revenueJournalDebit = Number(revenueLines._sum.debit || 0);
  const revenueFromJournals = revenueJournalCredit - revenueJournalDebit;
  const revenue = revenueFromJournals > 0 ? revenueFromJournals : salesTotal;
  const omzet = salesTotal;

  // Expense: journal expense lines + purchases + depreciation
  const expenseJournalDebit = Number(expenseLines._sum.debit || 0);
  const expenseJournalCredit = Number(expenseLines._sum.credit || 0);
  const expenseFromJournals = expenseJournalDebit - expenseJournalCredit;
  const depreciationTotal = Number(depreciationAgg._sum.depreciationAmount || 0);
  const expense = purchaseTotal + (expenseFromJournals > 0 ? expenseFromJournals : 0) + depreciationTotal;

  const profit = revenue - expense;
  const profitLoss = profit;

  const cashBankTotal = Number(cashBank._sum.openingBalance || 0);
  const receivableOutstanding = Math.max(0, salesTotal - receiptTotal);
  const payableOutstanding = Math.max(0, purchaseTotal - paymentTotal);
  const stockTotal = Number(products._sum.stock || 0);

  return {
    period: { from: from || null, to: to || null },
    sales: { total: salesTotal, count: sales._count._all },
    purchases: { total: purchaseTotal, count: purchases._count._all },
    receipts: { total: receiptTotal, count: receipts._count._all },
    payments: { total: paymentTotal, count: payments._count._all },
    products: {
      count: products._count._all,
      totalStock: stockTotal,
      stockTotal,
      lowStock,
    },
    customers,
    suppliers,
    cashBank: { total: cashBankTotal, count: cashBank._count._all, cashBankTotal },
    cashBankTotal,
    journals: { count: journalsCnt },
    // legacy profit (sales - purchases) kept for backward compat
    profit,
    // Fase 2 full fields per flowchart #13
    omzet,
    revenue,
    expense,
    profitLoss,
    grossProfit: profit,
    netProfit: profit,
    receivableOutstanding,
    payableOutstanding,
    stock: { total: stockTotal, lowStock, count: products._count._all },
    depreciationTotal,
    expenseJournalTotal: expenseFromJournals > 0 ? expenseFromJournals : 0,
    revenueJournalTotal: revenueFromJournals > 0 ? revenueFromJournals : 0,
  };
}

module.exports = { getSummary };
