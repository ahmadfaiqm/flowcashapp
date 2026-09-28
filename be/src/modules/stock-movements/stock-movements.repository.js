const prisma = require('../../config/database');

async function findMany(businessId, skip, take, productId) {
  const where = { businessId };
  if (productId) where.productId = Number(productId);
  return prisma.stockMovement.findMany({
    where,
    skip,
    take,
    orderBy: { id: 'asc' },
    include: { product: true },
  });
}

async function count(businessId, productId) {
  const where = { businessId };
  if (productId) where.productId = Number(productId);
  return prisma.stockMovement.count({ where });
}

async function findById(businessId, id) {
  return prisma.stockMovement.findFirst({
    where: { businessId, id: Number(id) },
    include: { product: true },
  });
}

async function create(businessId, data) {
  return prisma.stockMovement.create({ data: { businessId, ...data } });
}

module.exports = { findMany, count, findById, create };
