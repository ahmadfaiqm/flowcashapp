function parsePagination(query) {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
function buildMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
module.exports = { parsePagination, buildMeta };
