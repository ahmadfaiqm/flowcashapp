const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./chart-of-accounts.repository');

async function list(businessId, query) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = query.search || query.q || undefined;
  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, search), repo.count(businessId, search)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(businessId, id) {
  const item = await repo.findById(businessId, id);
  if (!item) throw new ApiError(404, 'Chart of Account not found');
  return item;
}

async function create(businessId, data) {
  return repo.create(businessId, data);
}

async function update(businessId, id, data) {
  const existing = await repo.findById(businessId, id);
  if (!existing) throw new ApiError(404, 'Chart of Account not found');
  return repo.update(businessId, id, data);
}

async function remove(businessId, id) {
  const existing = await repo.findById(businessId, id);
  if (!existing) throw new ApiError(404, 'Chart of Account not found');
  const prisma = require('../../config/database');
  const used = await prisma.journalLine.count({ where: { coaId: Number(id) } });
  if (used > 0) throw new ApiError(409, 'Akun tidak bisa dihapus karena sudah dipakai di jurnal');
  return repo.remove(businessId, id);
}

module.exports = { list, getById, create, update, remove };
