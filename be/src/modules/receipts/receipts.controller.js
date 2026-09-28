const { success } = require('../../common/utils/ApiResponse');
const service = require('./receipts.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Receipts fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.businessId, req.params.id);
  return success(res, data, 'Receipt fetched');
}

async function create(req, res) {
  const data = await service.create(req.businessId, req.body);
  return success(res, data, 'Receipt created', undefined, 201);
}

module.exports = { list, getById, create };
