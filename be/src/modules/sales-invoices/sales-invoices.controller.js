const { success } = require('../../common/utils/ApiResponse');
const service = require('./sales-invoices.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Sales invoices fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.businessId, req.params.id);
  return success(res, data, 'Sales invoice fetched');
}

async function create(req, res) {
  const data = await service.create(req.businessId, req.body);
  return success(res, data, 'Sales invoice created', undefined, 201);
}

module.exports = { list, getById, create };
