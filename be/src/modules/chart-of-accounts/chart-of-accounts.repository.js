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
  return prisma.chartOfAccount.findMany({
    where,
    skip,
    take,
    orderBy: { id: 'asc' },
  });
}

async function count(businessId, search) {
  const where = { businessId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }
  return prisma.chartOfAccount.count({ where });
}

async function findById(businessId, id) {
  return prisma.chartOfAccount.findFirst({ where: { businessId, id: Number(id) } });
}

async function create(businessId, data) {
  try {
    return await prisma.chartOfAccount.create({ data: { businessId, ...data } });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Code already exists in this business');
    throw e;
  }
}

async function update(businessId, id, data) {
  try {
    return await prisma.chartOfAccount.update({ where: { id: Number(id) }, data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Code already exists in this business');
    if (e.code === 'P2025') throw new ApiError(404, 'Chart of Account not found');
    throw e;
  }
}

async function remove(businessId, id) {
  try {
    return await prisma.chartOfAccount.delete({ where: { id: Number(id) } });
  } catch (e) {
    if (e.code === 'P2025') throw new ApiError(404, 'Chart of Account not found');
    throw e;
  }
}

module.exports = { findMany, count, findById, create, update, remove };
