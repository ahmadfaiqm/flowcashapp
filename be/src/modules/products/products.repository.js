const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');

async function findMany(businessId, skip, take, search) {
  const where = { businessId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }
  return prisma.product.findMany({ where, skip, take, orderBy: { id: 'asc' } });
}

async function count(businessId, search) {
  const where = { businessId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }
  return prisma.product.count({ where });
}

async function findById(businessId, id) {
  return prisma.product.findFirst({ where: { businessId, id: Number(id) } });
}

async function create(businessId, data) {
  try {
    return await prisma.product.create({ data: { businessId, ...data } });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'SKU already exists in this business');
    throw e;
  }
}

async function update(businessId, id, data) {
  try {
    return await prisma.product.update({ where: { id: Number(id) }, data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'SKU already exists in this business');
    if (e.code === 'P2025') throw new ApiError(404, 'Product not found');
    throw e;
  }
}

async function remove(businessId, id) {
  try {
    return await prisma.product.delete({ where: { id: Number(id) } });
  } catch (e) {
    if (e.code === 'P2025') throw new ApiError(404, 'Product not found');
    throw e;
  }
}

module.exports = { findMany, count, findById, create, update, remove };
