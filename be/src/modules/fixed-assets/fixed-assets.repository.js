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
  return prisma.fixedAsset.findMany({ where, skip, take, orderBy: { id: 'asc' } });
}

async function count(businessId, search) {
  const where = { businessId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }
  return prisma.fixedAsset.count({ where });
}

async function findById(businessId, id) {
  return prisma.fixedAsset.findFirst({ where: { businessId, id: Number(id) } });
}

async function create(businessId, data) {
  try {
    return await prisma.fixedAsset.create({ data: { businessId, ...data } });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Fixed asset code already exists in this business');
    throw e;
  }
}

async function update(businessId, id, data) {
  try {
    return await prisma.fixedAsset.update({ where: { id: Number(id) }, data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Fixed asset code already exists in this business');
    if (e.code === 'P2025') throw new ApiError(404, 'Fixed asset not found');
    throw e;
  }
}

async function remove(businessId, id) {
  try {
    return await prisma.fixedAsset.delete({ where: { id: Number(id) } });
  } catch (e) {
    if (e.code === 'P2025') throw new ApiError(404, 'Fixed asset not found');
    throw e;
  }
}

// Depreciation helpers for Tx-less listing
async function findDepreciations(businessId, fixedAssetId, skip, take) {
  const where = { businessId, fixedAssetId: Number(fixedAssetId) };
  return prisma.assetDepreciation.findMany({
    where,
    skip,
    take,
    orderBy: { depreciationDate: 'asc' },
    include: { journal: true },
  });
}

async function countDepreciations(businessId, fixedAssetId) {
  return prisma.assetDepreciation.count({ where: { businessId, fixedAssetId: Number(fixedAssetId) } });
}

module.exports = { findMany, count, findById, create, update, remove, findDepreciations, countDepreciations };
