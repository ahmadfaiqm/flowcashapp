const { success } = require('../../common/utils/ApiResponse');
const service = require('./fixed-assets.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Fixed assets fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.businessId, req.params.id);
  return success(res, data, 'Fixed asset fetched');
}

async function create(req, res) {
  const data = await service.create(req.businessId, req.body);
  return success(res, data, 'Fixed asset created', undefined, 201);
}

async function update(req, res) {
  const data = await service.update(req.businessId, req.params.id, req.body);
  return success(res, data, 'Fixed asset updated');
}

async function remove(req, res) {
  await service.remove(req.businessId, req.params.id);
  return success(res, null, 'Fixed asset deleted');
}

async function depreciate(req, res) {
  const data = await service.depreciate(req.businessId, req.params.id, req.body);
  return success(res, data, 'Depreciation created', undefined, 201);
}

async function listDepreciations(req, res) {
  const { items, meta } = await service.listDepreciations(req.businessId, req.params.id, req.query);
  return success(res, items, 'Depreciations fetched', meta);
}

module.exports = { list, getById, create, update, remove, depreciate, listDepreciations };
