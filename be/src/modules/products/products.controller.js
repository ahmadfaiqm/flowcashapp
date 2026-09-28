const { success } = require('../../common/utils/ApiResponse');
const service = require('./products.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Products fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.businessId, req.params.id);
  return success(res, data, 'Product fetched');
}

async function create(req, res) {
  const data = await service.create(req.businessId, req.body);
  return success(res, data, 'Product created', undefined, 201);
}

async function update(req, res) {
  const data = await service.update(req.businessId, req.params.id, req.body);
  return success(res, data, 'Product updated');
}

async function remove(req, res) {
  await service.remove(req.businessId, req.params.id);
  return success(res, null, 'Product deleted');
}

module.exports = { list, getById, create, update, remove };
