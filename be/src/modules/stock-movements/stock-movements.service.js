const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./stock-movements.repository');
const logger = require('../../common/logger');

async function list(businessId, query) {
  const { page, limit, skip, take } = parsePagination(query);
  const productId = query.productId ? Number(query.productId) : undefined;
  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, productId), repo.count(businessId, productId)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(businessId, id) {
  const item = await repo.findById(businessId, id);
  if (!item) throw new ApiError(404, 'Stock movement not found');
  return item;
}

async function createAdjustment(businessId, body) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({ where: { businessId, id: Number(body.productId) } });
    if (!product) throw new ApiError(404, 'Product not found');

    const quantity = Number(body.quantity);
    const currentStock = Number(product.stock);
    const newStock = currentStock + quantity;

    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { stock: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: {
        businessId,
        productId: product.id,
        quantity,
        unitCost: body.unitCost != null ? body.unitCost : 0,
        movementType: 'adjustment',
        notes: body.notes || null,
      },
    });

    const minimumStock = Number(updatedProduct.minimumStock || 0);
    if (Number(updatedProduct.stock) <= minimumStock) {
      logger.warn(`Stock alert: product ${updatedProduct.name} (id=${updatedProduct.id}) stock ${updatedProduct.stock} <= minimumStock ${minimumStock}`);
    }

    return movement;
  });
}

module.exports = { list, getById, createAdjustment };
