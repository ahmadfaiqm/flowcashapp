const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');

async function findMany(businessId, skip, take, search) {
  const where = { businessId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }
  return prisma.supplier.findMany({ where, skip, take, orderBy: { id: 'asc' } });
}

async function count(businessId, search) {
  const where = { businessId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }
  return prisma.supplier.count({ where });
}

async function findById(businessId, id) {
  return prisma.supplier.findFirst({ where: { businessId, id: Number(id) } });
}

async function create(businessId, data) {
  try {
    return await prisma.supplier.create({ data: { businessId, ...data } });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Code already exists in this business');
    throw e;
  }
}

async function update(businessId, id, data) {
  try {
    return await prisma.supplier.update({ where: { id: Number(id) }, data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Code already exists in this business');
    if (e.code === 'P2025') throw new ApiError(404, 'Supplier not found');
    throw e;
  }
}

async function remove(businessId, id) {
  try {
    return await prisma.supplier.delete({ where: { id: Number(id) } });
  } catch (e) {
    if (e.code === 'P2025') throw new ApiError(404, 'Supplier not found');
    throw e;
  }
}

module.exports = { findMany, count, findById, create, update, remove };
