const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const env = require('../../config/env');

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new ApiError(401, 'Missing or invalid token'));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: parseInt(payload.sub, 10), email: payload.email };
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};
