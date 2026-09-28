const { success } = require('../../common/utils/ApiResponse');

async function getHealth(req, res) {
  return success(res, { uptime: process.uptime() }, 'OK');
}
module.exports = { getHealth };
