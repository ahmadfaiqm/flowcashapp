const prisma = require('../../config/database');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./businesses.repository');
const cloudinary = require('../../common/cloudinary');
const ApiError = require('../../common/utils/ApiError');

async function create(userId, body) {
  return prisma.$transaction(async (tx) => {
    const business = await repo.createBusinessTx(tx, {
      ownerUserId: userId,
      businessName: body.businessName,
      address: body.address,
      phone: body.phone,
      taxId: body.taxId,
      baseCurrency: body.baseCurrency || 'IDR',
    });
    await repo.createMemberTx(tx, { businessId: business.id, userId, role: 'owner' });
    // seed first then journal for modal awal
    const seeded = await repo.seedCoATx(tx, business.id);
    if (body.initialCapital && Number(body.initialCapital) > 0) {
      const amount = Number(body.initialCapital);
      const kasCoa = await tx.chartOfAccount.findFirst({ where: { businessId: business.id, code: '1010' } });
      const modalCoa = await tx.chartOfAccount.findFirst({ where: { businessId: business.id, code: '3110' } });
      if (kasCoa && modalCoa) {
        const now = new Date();
        const periodYear = now.getFullYear();
        const periodMonth = now.getMonth() + 1;
        const journalNo = `JU-MODAL-${business.id}`;
        const journal = await tx.journal.create({
          data: {
            businessId: business.id,
            journalNo,
            journalDate: now,
            description: 'Modal Awal',
            status: 'posted',
            isAdjustment: false,
            periodYear,
            periodMonth,
          },
        });
        await tx.journalLine.createMany({
          data: [
            { journalId: journal.id, coaId: kasCoa.id, debit: amount, credit: 0, memo: 'Modal Awal - Kas' },
            { journalId: journal.id, coaId: modalCoa.id, debit: 0, credit: amount, memo: 'Modal Awal - Modal' },
          ],
        });
        await tx.capitalMovement.create({
          data: {
            businessId: business.id,
            date: now,
            type: 'initial',
            amount: amount,
            description: 'Modal Awal',
            journalId: journal.id,
          },
        });
      }
    }
    return { business, seededCount: seeded.count };
  });
}
async function listByUser(userId, query = {}) {
  const { page, limit, skip, take } = parsePagination(query);
  const [items, total] = await Promise.all([repo.findByUserIdPaginated(userId, skip, take), repo.countByUserId(userId)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(userId, businessId) {
  const biz = await repo.findById(businessId);
  if (!biz) throw new (require('../../common/utils/ApiError'))(404, 'Business not found');
  const member = await require('../../config/database').businessMember.findFirst({ where: { businessId: Number(businessId), userId } });
  if (!member) throw new (require('../../common/utils/ApiError'))(403, 'Not a member of this business');
  return { ...biz, role: member.role };
}

async function update(userId, businessId, body) {
  const existing = await repo.findById(businessId);
  if (!existing) throw new (require('../../common/utils/ApiError'))(404, 'Business not found');
  const prisma = require('../../config/database');
  const member = await prisma.businessMember.findFirst({ where: { businessId: Number(businessId), userId } });
  if (!member) throw new (require('../../common/utils/ApiError'))(403, 'Not a member of this business');
  if (member.role !== 'owner') throw new (require('../../common/utils/ApiError'))(403, 'Only owner can update business');
  return repo.updateById(businessId, body);
}

async function getMyRole(userId, businessId) {
  const prisma = require('../../config/database');
  const member = await prisma.businessMember.findFirst({ where: { businessId: Number(businessId), userId } });
  if (!member) throw new (require('../../common/utils/ApiError'))(403, 'Not a member of this business');
  return { businessId: Number(businessId), role: member.role };
}

function uploadBufferToCloudinary(buffer, businessId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'akuntansi/logos', public_id: `business-${businessId}`, overwrite: true, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

async function assertOwner(userId, businessId) {
  const db = require('../../config/database');
  const existing = await repo.findById(businessId);
  if (!existing) throw new ApiError(404, 'Business not found');
  const member = await db.businessMember.findFirst({ where: { businessId: Number(businessId), userId } });
  if (!member) throw new ApiError(403, 'Not a member of this business');
  if (member.role !== 'owner') throw new ApiError(403, 'Only owner can change business logo');
  return existing;
}

async function uploadLogo(userId, businessId, file) {
  if (!file) throw new ApiError(400, 'Logo file is required');
  if (!require('../../config/env').CLOUDINARY_CLOUD_NAME) throw new ApiError(503, 'Logo upload is not configured');
  await assertOwner(userId, businessId);
  let result;
  try {
    result = await uploadBufferToCloudinary(file.buffer, businessId);
  } catch {
    throw new ApiError(502, 'Logo upload failed');
  }
  return repo.updateById(businessId, { logoUrl: result.secure_url });
}

async function deleteLogo(userId, businessId) {
  await assertOwner(userId, businessId);
  try {
    await cloudinary.uploader.destroy(`akuntansi/logos/business-${businessId}`);
  } catch {
    // asset already gone — still clear the column
  }
  return repo.updateById(businessId, { logoUrl: null });
}

module.exports = { create, listByUser, getById, update, getMyRole, uploadLogo, deleteLogo };
