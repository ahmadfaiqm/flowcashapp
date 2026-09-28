const rateLimit = require('express-rate-limit');
const env = require('../../config/env');

const apiLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
  max: parseInt(env.RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
});
module.exports = apiLimiter;
