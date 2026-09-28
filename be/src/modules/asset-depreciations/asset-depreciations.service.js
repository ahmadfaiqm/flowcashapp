const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./asset-depreciations.repository');

async function list(businessId, query) {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = {
    fixedAssetId: query.fixedAssetId || undefined,
    from: query.from || query.startDate || undefined,
    to: query.to || query.endDate || undefined,
  };
  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, filters), repo.count(businessId, filters)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(businessId, id) {
  const item = await repo.findById(businessId, id);
  if (!item) throw new ApiError(404, 'Asset depreciation not found');
  return item;
}

module.exports = { list, getById };
