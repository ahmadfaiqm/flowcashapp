const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./cash-bank-transfers.repository');

async function transfer(businessId, body) {
  const { sourceAccountId, destinationAccountId, amount, transferDate, notes } = body;

  if (Number(amount) <= 0) throw new ApiError(400, 'Amount must be greater than 0');
  if (sourceAccountId === destinationAccountId) throw new ApiError(400, 'Source and destination must be different');

  return prisma.$transaction(async (tx) => {
    const source = await tx.cashBankAccount.findFirst({
      where: { businessId, id: Number(sourceAccountId) },
      include: { coa: true },
    });
    if (!source) throw new ApiError(404, 'Source Cash/Bank Account not found');

    const dest = await tx.cashBankAccount.findFirst({
      where: { businessId, id: Number(destinationAccountId) },
      include: { coa: true },
    });
    if (!dest) throw new ApiError(404, 'Destination Cash/Bank Account not found');

    if (source.id === dest.id) throw new ApiError(400, 'Source and destination must be different');

    // Validate COAs exist (they should via include, but extra check)
    const sourceCoa = source.coa || (await tx.chartOfAccount.findFirst({ where: { businessId, id: source.coaId } }));
    const destCoa = dest.coa || (await tx.chartOfAccount.findFirst({ where: { businessId, id: dest.coaId } }));
    if (!sourceCoa) throw new ApiError(404, `COA ${source.coaId} not found`);
    if (!destCoa) throw new ApiError(404, `COA ${dest.coaId} not found`);

    const journalNo = `JU-TRF-${Date.now()}-${businessId}`;
    const journalDate = new Date(transferDate);
    const description = `Transfer ${source.name} -> ${dest.name}` + (notes ? ` - ${notes}` : '');

    const journal = await tx.journal.create({
      data: {
        businessId,
        journalNo,
        journalDate,
        description,
        status: 'posted',
      },
    });

    const numAmount = Number(amount);
    // Validate balance: debit == credit
    const lines = [
      { journalId: journal.id, coaId: dest.coaId, debit: numAmount, credit: 0, memo: `Transfer in from ${source.name}` },
      { journalId: journal.id, coaId: source.coaId, debit: 0, credit: numAmount, memo: `Transfer out to ${dest.name}` },
    ];

    const sumDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
    const sumCredit = lines.reduce((s, l) => s + Number(l.credit), 0);
    if (sumDebit !== sumCredit) throw new ApiError(400, 'Journal tidak balance: debit != credit');

    await tx.journalLine.createMany({ data: lines });

    const fullJournal = await tx.journal.findUnique({
      where: { id: journal.id },
      include: { lines: { include: { coa: true } } },
    });

    return { journal: fullJournal, source, dest, amount: numAmount };
  });
}

async function list(businessId, query) {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = {
    search: query.search || query.q || undefined,
    from: query.from || query.startDate || query.fromDate || query.journalDateFrom || undefined,
    to: query.to || query.endDate || query.toDate || query.journalDateTo || undefined,
  };
  const [items, total] = await Promise.all([repo.findMany(businessId, skip, take, filters), repo.count(businessId, filters)]);
  return { items, meta: buildMeta(page, limit, total) };
}

module.exports = { transfer, list };
