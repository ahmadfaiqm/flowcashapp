const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ApiError = require('../../common/utils/ApiError');
const env = require('../../config/env');
const repo = require('./auth.repository');

function sign(user) {
  return jwt.sign({ email: user.email }, env.JWT_SECRET, { subject: String(user.id), expiresIn: env.JWT_EXPIRES_IN });
}
async function register(body) {
  const exists = await repo.findByEmail(body.email);
  if (exists) throw new ApiError(409, 'Email already exists');
  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await repo.create({ name: body.name, email: body.email, passwordHash });
  return { user, token: sign(user) };
}
async function login(body) {
  const user = await repo.findByEmail(body.email);
  if (!user) throw new ApiError(401, 'Invalid credentials');
  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid credentials');
  return { user: { id: user.id, name: user.name, email: user.email }, token: sign(user) };
}

async function changePassword(userId, body) {
  const prisma = require('../../config/database');
  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user) throw new ApiError(404, 'User not found');
  const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Kata sandi saat ini salah');
  const newHash = await bcrypt.hash(body.newPassword, 10);
  await prisma.user.update({ where: { id: Number(userId) }, data: { passwordHash: newHash } });
  return { ok: true };
}

async function updateProfile(userId, body) {
  const prisma = require('../../config/database');
  const data = {};
  if (body.name) data.name = body.name;
  if (Object.keys(data).length === 0) throw new ApiError(400, 'No fields to update');
  const updated = await prisma.user.update({ where: { id: Number(userId) }, data, select: { id: true, name: true, email: true } });
  return updated;
}
module.exports = { register, login, changePassword, updateProfile };
