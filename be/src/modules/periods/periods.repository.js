const prisma = require('../../config/database');

async function findByBusiness(businessId, skip, take, filters = {}) {
  const where = { businessId };
  if (filters.year) where.year = filters.year;
  if (filters.month !== undefined) where.month = filters.month;
  return prisma.accountingPeriod.findMany({ where, skip, take, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
}

async function count(businessId, filters = {}) {
  const where = { businessId };
  if (filters.year) where.year = filters.year;
  if (filters.month !== undefined) where.month = filters.month;
  return prisma.accountingPeriod.count({ where });
}

async function findOne(businessId, year, month) {
  return prisma.accountingPeriod.findFirst({ where: { businessId, year, month } });
}

async function create(businessId, data) {
  return prisma.accountingPeriod.create({ data: { businessId, ...data } });
}

async function updateStatus(businessId, id, status) {
  return prisma.accountingPeriod.update({ where: { id: Number(id) }, data: { status } });
}

module.exports = { findByBusiness, count, findOne, create, updateStatus };
