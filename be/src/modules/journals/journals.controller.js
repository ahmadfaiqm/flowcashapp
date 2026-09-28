const { success } = require('../../common/utils/ApiResponse');
const service = require('./journals.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Journals fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.businessId, req.params.id);
  return success(res, data, 'Journal fetched');
}

async function createManual(req, res) {
  const data = await service.createManual(req.businessId, req.body);
  return success(res, data, 'Journal created', undefined, 201);
}

async function remove(req, res) {
  await service.remove(req.businessId, req.params.id);
  return success(res, null, 'Journal deleted');
}

module.exports = { list, getById, createManual, remove };
