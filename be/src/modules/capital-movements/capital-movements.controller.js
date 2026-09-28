const { success } = require('../../common/utils/ApiResponse');
const service = require('./capital-movements.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Capital movements fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.businessId, req.params.id);
  return success(res, data, 'Capital movement fetched');
}

async function create(req, res) {
  const data = await service.create(req.businessId, req.body);
  return success(res, data, 'Capital movement created', undefined, 201);
}

module.exports = { list, getById, create };
