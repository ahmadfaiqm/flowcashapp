const logger = require('../logger');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const status = err.statusCode || 500;
  if (status >= 500) logger.error(err.stack || err.message);
  const body = { success: false, message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message || 'Internal Server Error' };
  if (err.details) body.details = err.details;
  if (process.env.NODE_ENV === 'development' && err.stack) body.stack = err.stack;
  return res.status(status).json(body);
};
