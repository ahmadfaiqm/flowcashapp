const prisma = require('../../config/database');

async function findMany(businessId, skip, take, filters = {}) {
  const where = { businessId };
  if (filters.type) where.type = filters.type;
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) where.date.lte = new Date(filters.to);
  }
  return prisma.capitalMovement.findMany({ where, skip, take, orderBy: { date: 'desc' } });
}

async function count(businessId, filters = {}) {
  const where = { businessId };
  if (filters.type) where.type = filters.type;
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) where.date.lte = new Date(filters.to);
  }
  return prisma.capitalMovement.count({ where });
}

async function findById(businessId, id) {
  return prisma.capitalMovement.findFirst({ where: { businessId, id: Number(id) } });
}

async function create(businessId, data) {
  return prisma.capitalMovement.create({ data: { businessId, ...data } });
}

module.exports = { findMany, count, findById, create };
