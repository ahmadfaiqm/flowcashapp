const { success } = require('../../common/utils/ApiResponse');
const service = require('./cash-bank-accounts.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Cash/Bank accounts fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.businessId, req.params.id);
  return success(res, data, 'Cash/Bank account fetched');
}

async function create(req, res) {
  const data = await service.create(req.businessId, req.body);
  return success(res, data, 'Cash/Bank account created', undefined, 201);
}

async function update(req, res) {
  const data = await service.update(req.businessId, req.params.id, req.body);
  return success(res, data, 'Cash/Bank account updated');
}

async function remove(req, res) {
  await service.remove(req.businessId, req.params.id);
  return success(res, null, 'Cash/Bank account deleted');
}

module.exports = { list, getById, create, update, remove };
