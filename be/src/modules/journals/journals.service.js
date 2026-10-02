const prisma = require('../../config/database');
const logger = require('../../common/logger');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./journals.repository');

async function list(businessId, query) {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = {
    status: query.status,
    search: query.search || query.q || undefined,
    from: query.from || query.startDate || query.fromDate || undefined,
    to: query.to || query.endDate || query.toDate || undefined,
  };
  // also support journalDate from/to via query tricks; allow YYYY-MM-DD
  if (query.journalDateFrom) filters.from = query.journalDateFrom;
  if (query.journalDateTo) filters.to = query.journalDateTo;

  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, filters), repo.count(businessId, filters)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function getById(businessId, id) {
  const item = await repo.findById(businessId, id);
  if (!item) throw new ApiError(404, 'Journal not found');
  return item;
}

async function remove(businessId, id) {
  const existing = await repo.findById(businessId, id);
  if (!existing) throw new ApiError(404, 'Journal not found');
  const dt = new Date(existing.journalDate);
  const closed = await prisma.accountingPeriod.findFirst({
    where: { businessId, year: dt.getFullYear(), month: dt.getMonth() + 1, status: 'closed' },
  });
  if (closed) throw new ApiError(403, 'Periode tertutup, tidak bisa void');
  // Instrumentasi diagnostik (tanpa ubah perilaku): catat konteks sebelum transaksi
  // agar 500 berikutnya langsung ketahuan penyebabnya di Vercel Logs.
  const reversalNo = `VOID-${existing.journalNo}-${Date.now()}`;
  logger.warn({
    ctx: 'journal.remove.pre',
    businessId,
    journalId: Number(id),
    journalNo: existing.journalNo,
    journalNoLen: existing.journalNo.length,
    status: existing.status,
    linesCount: existing.lines.length,
    reversalNo,
    reversalNoLen: reversalNo.length,
  });
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.journal.update({ where: { id: Number(id) }, data: { status: 'void' } });
      const rev = await tx.journal.create({
        data: {
          businessId,
          journalNo: reversalNo,
          journalDate: new Date(),
          description: `Reversal ${existing.journalNo}`,
          status: 'posted',
          isAdjustment: false,
        },
      });
    const revLines = existing.lines.map((l) => ({
      journalId: rev.id,
      coaId: l.coaId,
      debit: l.credit,
      credit: l.debit,
      memo: `Reversal ${existing.journalNo}`,
    }));
    await tx.journalLine.createMany({ data: revLines });
      return rev;
    });
  } catch (e) {
    logger.error({
      ctx: 'journal.remove.fail',
      businessId,
      journalId: Number(id),
      journalNo: existing.journalNo,
      status: existing.status,
      linesCount: existing.lines.length,
      reversalNoLen: reversalNo.length,
      code: e.code,
      message: e.message,
    });
    throw e;
  }
}

async function createManual(businessId, body) {
  const sumDebit = body.lines.reduce((s, l) => s + Number(l.debit), 0);
  const sumCredit = body.lines.reduce((s, l) => s + Number(l.credit), 0);
  if (sumDebit !== sumCredit) {
    throw new ApiError(400, 'Journal tidak balance: debit != credit');
  }

  const dt = new Date(body.journalDate);
  const periodYear = dt.getFullYear();
  const periodMonth = dt.getMonth() + 1;
  const closed = await prisma.accountingPeriod.findFirst({
    where: { businessId, year: periodYear, month: periodMonth, status: 'closed' },
  });
  if (closed) throw new ApiError(403, 'Periode sudah ditutup, jurnal tidak bisa dibuat');

  return prisma.$transaction(async (tx) => {
    // verify each coaId belongs to business
    for (const line of body.lines) {
      const coa = await tx.chartOfAccount.findFirst({ where: { businessId, id: Number(line.coaId) } });
      if (!coa) throw new ApiError(404, `COA ${line.coaId} not found in this business`);
    }

    const journalNo = `JU-MANUAL-${Date.now()}-${businessId}`;
    const journal = await repo.createJournalTx(tx, {
      businessId,
      journalNo,
      journalDate: new Date(body.journalDate),
      description: body.description || null,
      status: body.status || 'posted',
      isAdjustment: body.isAdjustment || false,
      adjustmentType: body.adjustmentType || null,
      periodYear,
      periodMonth,
    });

    const lines = body.lines.map((l) => ({
      journalId: journal.id,
      coaId: Number(l.coaId),
      debit: l.debit,
      credit: l.credit,
      memo: l.memo || null,
    }));

    await repo.createJournalLinesTx(tx, lines);

    const full = await tx.journal.findUnique({
      where: { id: journal.id },
      include: { lines: { include: { coa: true } } },
    });
    return full;
  });
}

module.exports = { list, getById, createManual, remove };
