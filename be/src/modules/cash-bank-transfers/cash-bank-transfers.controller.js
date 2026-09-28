const { success } = require('../../common/utils/ApiResponse');
const service = require('./cash-bank-transfers.service');

async function transfer(req, res) {
  const data = await service.transfer(req.businessId, req.body);
  return success(res, data, 'Transfer completed', undefined, 201);
}

async function list(req, res) {
  const { items, meta } = await service.list(req.businessId, req.query);
  return success(res, items, 'Transfer history fetched', meta);
}

module.exports = { transfer, list };
