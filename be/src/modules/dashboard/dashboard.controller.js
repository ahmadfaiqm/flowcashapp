const { success } = require('../../common/utils/ApiResponse');
const service = require('./dashboard.service');

async function getSummary(req, res) {
  const data = await service.getSummary(req.businessId, req.query);
  return success(res, data, 'Dashboard summary fetched');
}

module.exports = { getSummary };
