const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');

async function findMany(businessId, skip, take, search) {
  const where = { businessId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { bankName: { contains: search, mode: 'insensitive' } },
    ];
  }
  return prisma.cashBankAccount.findMany({ where, skip, take, orderBy: { id: 'asc' } });
}

async function count(businessId, search) {
  const where = { businessId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { bankName: { contains: search, mode: 'insensitive' } },
    ];
  }
  return prisma.cashBankAccount.count({ where });
}

async function findById(businessId, id) {
  return prisma.cashBankAccount.findFirst({ where: { businessId, id: Number(id) } });
}

async function create(businessId, data) {
  try {
    return await prisma.cashBankAccount.create({ data: { businessId, ...data } });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'COA already linked to another cash/bank account');
    throw e;
  }
}

async function update(businessId, id, data) {
  try {
    return await prisma.cashBankAccount.update({ where: { id: Number(id) }, data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'COA already linked to another cash/bank account');
    if (e.code === 'P2025') throw new ApiError(404, 'Cash/Bank Account not found');
    throw e;
  }
}

async function remove(businessId, id) {
  try {
    return await prisma.cashBankAccount.delete({ where: { id: Number(id) } });
  } catch (e) {
    if (e.code === 'P2025') throw new ApiError(404, 'Cash/Bank Account not found');
    throw e;
  }
}

module.exports = { findMany, count, findById, create, update, remove };
