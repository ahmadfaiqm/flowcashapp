const ApiError = require('../utils/ApiError');

function validate(source, schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(new ApiError(400, 'Validation failed', parsed.error.flatten()));
    }
    req[source] = parsed.data;
    return next();
  };
}
module.exports = validate;
