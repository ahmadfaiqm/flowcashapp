const prisma = require('../../config/database');

function buildDateFilter(from, to) {
  if (!from && !to) return undefined;
  const f = {};
  if (from) f.gte = new Date(from);
  if (to) f.lte = new Date(to);
  return f;
}

async function salesAggregate(businessId, from, to) {
  const where = { businessId };
  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) where.invoiceDate = dateFilter;
  const result = await prisma.salesInvoice.aggregate({
    where,
    _sum: { totalAmount: true },
    _count: { _all: true },
  });
  return result;
}

async function purchaseAggregate(businessId, from, to) {
  const where = { businessId };
  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) where.invoiceDate = dateFilter;
  const result = await prisma.purchaseInvoice.aggregate({
    where,
    _sum: { totalAmount: true },
    _count: { _all: true },
  });
  return result;
}

async function receiptsAggregate(businessId, from, to) {
  const where = { businessId };
  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) where.receiptDate = dateFilter;
  const result = await prisma.receipt.aggregate({
    where,
    _sum: { amount: true },
    _count: { _all: true },
  });
  return result;
}

async function paymentsAggregate(businessId, from, to) {
  const where = { businessId };
  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) where.paymentDate = dateFilter;
  const result = await prisma.purchasePayment.aggregate({
    where,
    _sum: { amount: true },
    _count: { _all: true },
  });
  return result;
}

async function productsAggregate(businessId) {
  const result = await prisma.product.aggregate({
    where: { businessId },
    _sum: { stock: true },
    _count: { _all: true },
  });
  return result;
}

async function lowStockCount(businessId) {
  // Fetch and compute low stock since comparison between two columns not directly via count
  const products = await prisma.product.findMany({
    where: { businessId },
    select: { stock: true, minimumStock: true },
  });
  let low = 0;
  for (const p of products) {
    if (Number(p.stock) <= Number(p.minimumStock)) low += 1;
  }
  return low;
}

async function customersCount(businessId) {
  return prisma.customer.count({ where: { businessId } });
}

async function suppliersCount(businessId) {
  return prisma.supplier.count({ where: { businessId } });
}

async function cashBankAggregate(businessId) {
  const result = await prisma.cashBankAccount.aggregate({
    where: { businessId },
    _sum: { openingBalance: true },
    _count: { _all: true },
  });
  return result;
}

async function journalsCount(businessId, from, to) {
  const where = { businessId };
  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) where.journalDate = dateFilter;
  return prisma.journal.count({ where });
}

async function expenseLinesAggregate(businessId, from, to) {
  const where = {
    coa: { businessId, accountType: 'Expense' },
    journal: { businessId },
  };
  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) where.journal.journalDate = dateFilter;
  // only posted journals count for expense
  where.journal.status = 'posted';
  const result = await prisma.journalLine.aggregate({
    where,
    _sum: { debit: true, credit: true },
  });
  return result;
}

async function revenueLinesAggregate(businessId, from, to) {
  const where = {
    coa: { businessId, accountType: 'Revenue' },
    journal: { businessId },
  };
  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) where.journal.journalDate = dateFilter;
  where.journal.status = 'posted';
  const result = await prisma.journalLine.aggregate({
    where,
    _sum: { debit: true, credit: true },
  });
  return result;
}

async function depreciationAggregate(businessId, from, to) {
  const where = { businessId };
  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) where.depreciationDate = dateFilter;
  const result = await prisma.assetDepreciation.aggregate({
    where,
    _sum: { depreciationAmount: true },
    _count: { _all: true },
  });
  return result;
}

async function outstandingReceivable(businessId, from, to) {
  const salesWhere = { businessId };
  const receiptWhere = { businessId };
  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) {
    salesWhere.invoiceDate = dateFilter;
    receiptWhere.receiptDate = dateFilter;
  }
  const [sales, receipts] = await Promise.all([
    prisma.salesInvoice.aggregate({ where: salesWhere, _sum: { totalAmount: true, paidAmount: true } }),
    prisma.receipt.aggregate({ where: receiptWhere, _sum: { amount: true } }),
  ]);
  const outstanding = Number(sales._sum.totalAmount || 0) - Number(sales._sum.paidAmount || 0);
  // fallback to receipt diff if paidAmount not maintained
  const diff = Number(sales._sum.totalAmount || 0) - Number(receipts._sum.amount || 0);
  return { sales, receipts, outstanding: Math.max(outstanding, diff < 0 ? 0 : diff) };
}

async function outstandingPayable(businessId, from, to) {
  const purchaseWhere = { businessId };
  const paymentWhere = { businessId };
  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) {
    purchaseWhere.invoiceDate = dateFilter;
    paymentWhere.paymentDate = dateFilter;
  }
  const [purchases, payments] = await Promise.all([
    prisma.purchaseInvoice.aggregate({ where: purchaseWhere, _sum: { totalAmount: true, paidAmount: true } }),
    prisma.purchasePayment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
  ]);
  const outstanding = Number(purchases._sum.totalAmount || 0) - Number(purchases._sum.paidAmount || 0);
  const diff = Number(purchases._sum.totalAmount || 0) - Number(payments._sum.amount || 0);
  return { purchases, payments, outstanding: Math.max(outstanding, diff < 0 ? 0 : diff) };
}

module.exports = {
  salesAggregate,
  purchaseAggregate,
  receiptsAggregate,
  paymentsAggregate,
  productsAggregate,
  lowStockCount,
  customersCount,
  suppliersCount,
  cashBankAggregate,
  journalsCount,
  expenseLinesAggregate,
  revenueLinesAggregate,
  depreciationAggregate,
  outstandingReceivable,
  outstandingPayable,
};
