function success(res, data, message = 'OK', meta, statusCode = 200) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}
module.exports = { success };
