const { success } = require('../../common/utils/ApiResponse');
const service = require('./stock-movements.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Stock movements fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.businessId, req.params.id);
  return success(res, data, 'Stock movement fetched');
}

async function createAdjustment(req, res) {
  const data = await service.createAdjustment(req.businessId, req.body);
  return success(res, data, 'Stock movement created', undefined, 201);
}

module.exports = { list, getById, createAdjustment };
