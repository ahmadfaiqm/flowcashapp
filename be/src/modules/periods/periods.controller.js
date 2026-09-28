const { success } = require('../../common/utils/ApiResponse');
const service = require('./periods.service');

async function list(req, res) {
  const data = await service.list(req.businessId, req.query);
  return success(res, data.items, 'Periods fetched', data.meta);
}

async function closePeriod(req, res) {
  const data = await service.close(req.businessId, req.body);
  return success(res, data, 'Period closed', undefined, 201);
}

module.exports = { list, closePeriod };
