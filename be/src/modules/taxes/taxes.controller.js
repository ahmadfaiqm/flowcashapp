const { success } = require('../../common/utils/ApiResponse');
const service = require('./taxes.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Taxes fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.businessId, req.params.id);
  return success(res, data, 'Tax fetched');
}

async function create(req, res) {
  const data = await service.create(req.businessId, req.body);
  return success(res, data, 'Tax created', undefined, 201);
}

async function update(req, res) {
  const data = await service.update(req.businessId, req.params.id, req.body);
  return success(res, data, 'Tax updated');
}

async function remove(req, res) {
  await service.remove(req.businessId, req.params.id);
  return success(res, null, 'Tax deleted');
}

module.exports = { list, getById, create, update, remove };
