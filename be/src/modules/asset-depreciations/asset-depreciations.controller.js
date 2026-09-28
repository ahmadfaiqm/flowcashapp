const { success } = require('../../common/utils/ApiResponse');
const service = require('./asset-depreciations.service');

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Asset depreciations fetched', meta);
}

async function getById(req, res) {
  const data = await service.getById(req.businessId, req.params.id);
  return success(res, data, 'Asset depreciation fetched');
}

module.exports = { list, getById };
