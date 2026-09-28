const { success } = require('../../common/utils/ApiResponse');
const service = require('./businesses.service');

async function create(req, res) {
  const result = await service.create(req.user.id, req.body);
  return success(res, result, 'Business created', undefined, 201);
}
async function list(req, res) {
  const { items, meta } = await service.listByUser(req.user.id, req.query);
  return success(res, items, 'Businesses fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.user.id, req.params.id);
  return success(res, data, 'Business fetched');
}

async function update(req, res) {
  const data = await service.update(req.user.id, req.params.id, req.body);
  return success(res, data, 'Business updated');
}

async function myRole(req, res) {
  const data = await service.getMyRole(req.user.id, req.params.id);
  return success(res, data, 'Role fetched');
}

module.exports = { create, list, getById, update, myRole };
