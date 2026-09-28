const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');

async function findMany(businessId, skip, take, filters) {
  const where = { businessId };
  if (filters.supplierId) where.supplierId = Number(filters.supplierId);
  if (filters.purchaseInvoiceId) where.purchaseInvoiceId = Number(filters.purchaseInvoiceId);
  if (filters.search) {
    where.paymentNo = { contains: filters.search, mode: 'insensitive' };
  }
  return prisma.purchasePayment.findMany({
    where,
    skip,
    take,
    orderBy: { id: 'asc' },
    include: { supplier: true, purchaseInvoice: true, cashBankAccount: true },
  });
}

async function count(businessId, filters) {
  const where = { businessId };
  if (filters.supplierId) where.supplierId = Number(filters.supplierId);
  if (filters.purchaseInvoiceId) where.purchaseInvoiceId = Number(filters.purchaseInvoiceId);
  if (filters.search) {
    where.paymentNo = { contains: filters.search, mode: 'insensitive' };
  }
  return prisma.purchasePayment.count({ where });
}

async function findById(businessId, id) {
  return prisma.purchasePayment.findFirst({
    where: { businessId, id: Number(id) },
    include: { supplier: true, purchaseInvoice: true, cashBankAccount: true },
  });
}

async function createPaymentTx(tx, data) {
  try {
    return await tx.purchasePayment.create({ data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Payment number already exists in this business');
    throw e;
  }
}

async function createJournalTx(tx, data) {
  try {
    return await tx.journal.create({ data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Journal number already exists');
    throw e;
  }
}

async function createJournalLinesTx(tx, lines) {
  return tx.journalLine.createMany({ data: lines });
}

module.exports = { findMany, count, findById, createPaymentTx, createJournalTx, createJournalLinesTx };
