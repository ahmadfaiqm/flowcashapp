const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');

async function findMany(businessId, skip, take, filters) {
  const where = { businessId };
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { journalNo: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.from || filters.to) {
    where.journalDate = {};
    if (filters.from) where.journalDate.gte = new Date(filters.from);
    if (filters.to) where.journalDate.lte = new Date(filters.to);
  }
  return prisma.journal.findMany({
    where,
    skip,
    take,
    orderBy: { journalDate: 'desc' },
    include: { lines: { include: { coa: true } } },
  });
}

async function count(businessId, filters) {
  const where = { businessId };
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { journalNo: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.from || filters.to) {
    where.journalDate = {};
    if (filters.from) where.journalDate.gte = new Date(filters.from);
    if (filters.to) where.journalDate.lte = new Date(filters.to);
  }
  return prisma.journal.count({ where });
}

async function findById(businessId, id) {
  return prisma.journal.findFirst({
    where: { businessId, id: Number(id) },
    include: { lines: { include: { coa: true } } },
  });
}

async function createJournalTx(tx, data) {
  try {
    return await tx.journal.create({ data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Journal number already exists in this business');
    throw e;
  }
}

async function createJournalLinesTx(tx, lines) {
  return tx.journalLine.createMany({ data: lines });
}

async function updateStatus(businessId, id, status) {
  try {
    return await prisma.journal.update({
      where: { id: Number(id) },
      data: { status },
    });
  } catch (e) {
    if (e.code === 'P2025') throw new ApiError(404, 'Journal not found');
    throw e;
  }
}

module.exports = { findMany, count, findById, createJournalTx, createJournalLinesTx, updateStatus };
