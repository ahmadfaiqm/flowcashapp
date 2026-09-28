const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./capital-movements.repository');

async function list(businessId, query = {}) {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = {
    type: query.type,
    from: query.from || query.startDate || query.fromDate || undefined,
    to: query.to || query.endDate || query.toDate || undefined,
  };
  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, filters), repo.count(businessId, filters)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function create(businessId, body) {
  const amount = Number(body.amount);
  if (!amount || amount <= 0) throw new ApiError(400, 'amount must be > 0');

  return prisma.$transaction(async (tx) => {
    let journalId = null;

    if (body.type === 'prive') {
      // create journal Prive 3111 D -> Kas 1010 K
      const priveCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '3111' } });
      const kasCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '1010' } });
      if (!priveCoa) throw new ApiError(404, 'COA 3111 Prive tidak ditemukan');
      if (!kasCoa) throw new ApiError(404, 'COA 1010 Kas tidak ditemukan');

      const dt = new Date(body.date);
      const periodYear = dt.getFullYear();
      const periodMonth = dt.getMonth() + 1;

      // check period closed
      const closed = await tx.accountingPeriod.findFirst({ where: { businessId, year: periodYear, month: periodMonth, status: 'closed' } });
      if (closed) throw new ApiError(403, 'Periode sudah ditutup, prive tidak bisa dibuat');

      const journalNo = `JU-PRIVE-${Date.now()}-${businessId}`;
      const journal = await tx.journal.create({
        data: {
          businessId,
          journalNo,
          journalDate: dt,
          description: body.description ? `Prive: ${body.description}` : 'Prive',
          status: 'posted',
          isAdjustment: false,
          periodYear,
          periodMonth,
        },
      });
      journalId = journal.id;
      await tx.journalLine.createMany({
        data: [
          { journalId: journal.id, coaId: priveCoa.id, debit: amount, credit: 0, memo: body.description || 'Prive' },
          { journalId: journal.id, coaId: kasCoa.id, debit: 0, credit: amount, memo: body.description || 'Prive - Kas' },
        ],
      });
    } else if (body.type === 'additional') {
      // create journal Kas 1010 D -> Modal 3110 K (mirror prive opposite)
      const modalCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '3110' } });
      const kasCoa = await tx.chartOfAccount.findFirst({ where: { businessId, code: '1010' } });
      if (!modalCoa) throw new ApiError(404, 'COA 3110 Modal tidak ditemukan');
      if (!kasCoa) throw new ApiError(404, 'COA 1010 Kas tidak ditemukan');

      const dt = new Date(body.date);
      const periodYear = dt.getFullYear();
      const periodMonth = dt.getMonth() + 1;

      const closed = await tx.accountingPeriod.findFirst({ where: { businessId, year: periodYear, month: periodMonth, status: 'closed' } });
      if (closed) throw new ApiError(403, 'Periode sudah ditutup, setoran modal tidak bisa dibuat');

      const journalNo = `JU-MODAL-ADDITIONAL-${Date.now()}-${businessId}`;
      const journal = await tx.journal.create({
        data: {
          businessId,
          journalNo,
          journalDate: dt,
          description: body.description ? `Setoran Modal: ${body.description}` : 'Setoran Modal',
          status: 'posted',
          isAdjustment: false,
          periodYear,
          periodMonth,
        },
      });
      journalId = journal.id;
      await tx.journalLine.createMany({
        data: [
          { journalId: journal.id, coaId: kasCoa.id, debit: amount, credit: 0, memo: body.description || 'Setoran Modal - Kas' },
          { journalId: journal.id, coaId: modalCoa.id, debit: 0, credit: amount, memo: body.description || 'Setoran Modal' },
        ],
      });
    }

    const movement = await tx.capitalMovement.create({
      data: {
        businessId,
        date: new Date(body.date),
        type: body.type,
        amount: amount,
        description: body.description || null,
        journalId: journalId,
      },
    });
    return movement;
  });
}

async function getById(businessId, id) {
  const item = await repo.findById(businessId, id);
  if (!item) throw new ApiError(404, 'Capital movement not found');
  return item;
}

module.exports = { list, create, getById };
