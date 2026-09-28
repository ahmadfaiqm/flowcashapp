const bcrypt = require('bcryptjs');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./users.repository');

async function list(query) {
  const { page, limit, skip, take } = parsePagination(query);
  const [items, total] = await Promise.all([repo.findMany(skip, take), repo.count()]);
  return { items, meta: buildMeta(page, limit, total) };
}
async function getById(id) {
  const user = await repo.findById(String(id));
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}
async function create(body) {
  const passwordHash = await bcrypt.hash(body.password, 10);
  try {
    return await repo.create({ name: body.name, email: body.email, passwordHash, role: body.role });
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Email already exists');
    throw e;
  }
}
module.exports = { list, getById, create };
