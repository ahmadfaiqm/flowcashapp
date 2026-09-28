const prisma = require('../../config/database');

async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}
async function create(data) {
  return prisma.user.create({ data, select: { id: true, name: true, email: true, createdAt: true } });
}
async function findById(id) {
  return prisma.user.findUnique({ where: { id: Number(id) }, select: { id: true, name: true, email: true } });
}
module.exports = { findByEmail, create, findById };
