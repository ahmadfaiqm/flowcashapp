const ApiError = require('../utils/ApiError');

module.exports =
  (...allowed) =>
  (req, res, next) => {
    if (!req.memberRole) return next(new ApiError(403, 'Missing role'));
    if (!allowed.includes(req.memberRole)) return next(new ApiError(403, `Forbidden: role ${req.memberRole} not allowed`));
    return next();
  };
