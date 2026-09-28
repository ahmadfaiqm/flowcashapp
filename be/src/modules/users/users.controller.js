const { success } = require('../../common/utils/ApiResponse');
const service = require('./users.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.query);
  return success(res, items, 'Users fetched', meta);
}
async function getById(req, res) {
  const user = await service.getById(req.params.id);
  return success(res, user, 'User fetched');
}
async function create(req, res) {
  const user = await service.create(req.body);
  return success(res, user, 'User created', undefined, 201);
}
module.exports = { list, getById, create };
