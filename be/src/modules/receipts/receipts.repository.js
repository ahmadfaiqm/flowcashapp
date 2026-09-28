const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');

async function findMany(businessId, skip, take, filters) {
  const where = { businessId };
  if (filters.customerId) where.customerId = Number(filters.customerId);
  if (filters.salesInvoiceId) where.salesInvoiceId = Number(filters.salesInvoiceId);
  if (filters.search) {
    where.receiptNo = { contains: filters.search, mode: 'insensitive' };
  }
  return prisma.receipt.findMany({
    where,
    skip,
    take,
    orderBy: { id: 'asc' },
    include: { customer: true, salesInvoice: true, cashBankAccount: true },
  });
}

async function count(businessId, filters) {
  const where = { businessId };
  if (filters.customerId) where.customerId = Number(filters.customerId);
  if (filters.salesInvoiceId) where.salesInvoiceId = Number(filters.salesInvoiceId);
  if (filters.search) {
    where.receiptNo = { contains: filters.search, mode: 'insensitive' };
  }
  return prisma.receipt.count({ where });
}

async function findById(businessId, id) {
  return prisma.receipt.findFirst({
    where: { businessId, id: Number(id) },
    include: { customer: true, salesInvoice: true, cashBankAccount: true },
  });
}

async function createReceiptTx(tx, data) {
  try {
    return await tx.receipt.create({ data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Receipt number already exists in this business');
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

module.exports = { findMany, count, findById, createReceiptTx, createJournalTx, createJournalLinesTx };
