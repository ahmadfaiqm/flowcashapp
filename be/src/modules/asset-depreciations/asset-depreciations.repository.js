const prisma = require('../../config/database');

async function findMany(businessId, skip, take, filters) {
  const where = { businessId };
  if (filters.fixedAssetId) where.fixedAssetId = Number(filters.fixedAssetId);
  if (filters.from || filters.to) {
    where.depreciationDate = {};
    if (filters.from) where.depreciationDate.gte = new Date(filters.from);
    if (filters.to) where.depreciationDate.lte = new Date(filters.to);
  }
  return prisma.assetDepreciation.findMany({
    where,
    skip,
    take,
    orderBy: { depreciationDate: 'desc' },
    include: { fixedAsset: true, journal: true },
  });
}

async function count(businessId, filters) {
  const where = { businessId };
  if (filters.fixedAssetId) where.fixedAssetId = Number(filters.fixedAssetId);
  if (filters.from || filters.to) {
    where.depreciationDate = {};
    if (filters.from) where.depreciationDate.gte = new Date(filters.from);
    if (filters.to) where.depreciationDate.lte = new Date(filters.to);
  }
  return prisma.assetDepreciation.count({ where });
}

async function findById(businessId, id) {
  return prisma.assetDepreciation.findFirst({
    where: { businessId, id: Number(id) },
    include: { fixedAsset: true, journal: { include: { lines: { include: { coa: true } } } } },
  });
}

module.exports = { findMany, count, findById };
