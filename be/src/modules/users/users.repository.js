const prisma = require('../../config/database');

async function findMany(skip, take) {
  return prisma.user.findMany({ skip, take, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
}
async function count() { return prisma.user.count(); }
async function findById(id) {
  return prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
}
async function create(data) {
  return prisma.user.create({ data, select: { id: true, name: true, email: true, role: true, createdAt: true } });
}
module.exports = { findMany, count, findById, create };
