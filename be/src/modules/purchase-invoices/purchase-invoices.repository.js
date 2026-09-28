const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');

// Tx helpers
async function findProductForUpdate(tx, businessId, productId) {
  return tx.product.findFirst({ where: { businessId, id: Number(productId) } });
}

async function createInvoiceTx(tx, data) {
  try {
    return await tx.purchaseInvoice.create({ data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Invoice number already exists in this business');
    throw e;
  }
}

async function createLinesTx(tx, data) {
  return tx.purchaseInvoiceLine.create({ data });
}

async function updateStockTx(tx, productId, delta) {
  const product = await tx.product.findUnique({ where: { id: Number(productId) } });
  if (!product) throw new ApiError(404, 'Product not found');
  const newStock = Number(product.stock) + Number(delta);
  return tx.product.update({ where: { id: Number(productId) }, data: { stock: newStock } });
}

async function createMovementTx(tx, data) {
  return tx.stockMovement.create({ data });
}

async function createJournalTx(tx, data) {
  try {
    return await tx.journal.create({ data });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Journal number already exists');
    throw e;
  }
}

async function createJournalLinesTx(tx, lines) {
  return tx.journalLine.createMany({ data: lines });
}

// Non-tx helpers for list/get
async function findMany(businessId, skip, take, filters) {
  const where = { businessId };
  if (filters.supplierId) where.supplierId = Number(filters.supplierId);
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.invoiceNo = { contains: filters.search, mode: 'insensitive' };
  }
  return prisma.purchaseInvoice.findMany({
    where,
    skip,
    take,
    orderBy: { id: 'asc' },
    include: { lines: { include: { product: true } }, supplier: true },
  });
}

async function count(businessId, filters) {
  const where = { businessId };
  if (filters.supplierId) where.supplierId = Number(filters.supplierId);
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.invoiceNo = { contains: filters.search, mode: 'insensitive' };
  }
  return prisma.purchaseInvoice.count({ where });
}

async function findById(businessId, id) {
  return prisma.purchaseInvoice.findFirst({
    where: { businessId, id: Number(id) },
    include: { lines: { include: { product: true } }, supplier: true, payments: true },
  });
}

module.exports = {
  findProductForUpdate,
  createInvoiceTx,
  createLinesTx,
  updateStockTx,
  createMovementTx,
  createJournalTx,
  createJournalLinesTx,
  findMany,
  count,
  findById,
};
