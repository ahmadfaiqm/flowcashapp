const prisma = require('../../config/database');

async function findMany(businessId, skip, take, filters = {}) {
  const where = { businessId, journalNo: { startsWith: 'JU-TRF-' } };
  if (filters.from || filters.to) {
    where.journalDate = {};
    if (filters.from) where.journalDate.gte = new Date(filters.from);
    if (filters.to) where.journalDate.lte = new Date(filters.to);
  }
  if (filters.search) {
    where.OR = [
      { journalNo: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  return prisma.journal.findMany({
    where,
    skip,
    take,
    orderBy: { journalDate: 'desc' },
    include: { lines: { include: { coa: true } } },
  });
}

async function count(businessId, filters = {}) {
  const where = { businessId, journalNo: { startsWith: 'JU-TRF-' } };
  if (filters.from || filters.to) {
    where.journalDate = {};
    if (filters.from) where.journalDate.gte = new Date(filters.from);
    if (filters.to) where.journalDate.lte = new Date(filters.to);
  }
  if (filters.search) {
    where.OR = [
      { journalNo: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  return prisma.journal.count({ where });
}

module.exports = { findMany, count };
