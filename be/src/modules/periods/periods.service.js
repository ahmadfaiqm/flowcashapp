const prisma = require('../../config/database');
const ApiError = require('../../common/utils/ApiError');
const { parsePagination, buildMeta } = require('../../common/utils/pagination');
const repo = require('./periods.repository');

async function list(businessId, query = {}) {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = {};
  if (query.year) filters.year = Number(query.year);
  if (query.month !== undefined && query.month !== '') filters.month = Number(query.month);
  const [items, total] = await Promise.all([repo.findByBusiness(businessId, skip, take, filters), repo.count(businessId, filters)]);
  return { items, meta: buildMeta(page, limit, total) };
}

async function close(businessId, { year, month }) {
  const existing = await prisma.accountingPeriod.findFirst({ where: { businessId, year, month } });
  if (existing && existing.status === 'closed') {
    throw new ApiError(409, 'Periode sudah ditutup');
  }

  if (month === 0) {
    // closing tahunan: aggregate Revenue vs Expense, create journals Revenue->3130, 3130->Expense, 3130->3120
    return prisma.$transaction(async (tx) => {
      const dup = await tx.accountingPeriod.findFirst({ where: { businessId, year, month } });
      if (dup && dup.status === 'closed') throw new ApiError(409, 'Periode sudah ditutup');

      const ikhtisar = await tx.chartOfAccount.findFirst({ where: { businessId, code: '3130' } });
      const labaDitahan = await tx.chartOfAccount.findFirst({ where: { businessId, code: '3120' } });
      if (!ikhtisar) throw new ApiError(404, 'COA 3130 Ikhtisar Laba Rugi tidak ditemukan');
      if (!labaDitahan) throw new ApiError(404, 'COA 3120 Laba Ditahan tidak ditemukan');

      // aggregate Revenue vs Expense via groupBy on JournalLine
      // Revenue groups
      const revGroups = await tx.journalLine.groupBy({
        by: ['coaId'],
        where: {
          journal: { businessId, status: 'posted', periodYear: year },
          coa: { businessId, accountType: 'Revenue' },
        },
        _sum: { debit: true, credit: true },
      });

      const expGroups = await tx.journalLine.groupBy({
        by: ['coaId'],
        where: {
          journal: { businessId, status: 'posted', periodYear: year },
          coa: { businessId, accountType: 'Expense' },
        },
        _sum: { debit: true, credit: true },
      });

      let totalRevenue = 0;
      const revLines = [];
      for (const g of revGroups) {
        const bal = Number(g._sum.credit || 0) - Number(g._sum.debit || 0);
        if (bal !== 0) {
          totalRevenue += bal;
          revLines.push({ coaId: g.coaId, balance: bal });
        }
      }
      let totalExpense = 0;
      const expLines = [];
      for (const g of expGroups) {
        const bal = Number(g._sum.debit || 0) - Number(g._sum.credit || 0);
        if (bal !== 0) {
          totalExpense += bal;
          expLines.push({ coaId: g.coaId, balance: bal });
        }
      }

      // Journal 1: Revenue -> 3130 (debit Revenue, credit Ikhtisar)
      if (totalRevenue > 0) {
        const jNo1 = `CLS-REV-${year}-${Date.now()}`;
        const j1 = await tx.journal.create({
          data: {
            businessId,
            journalNo: jNo1,
            journalDate: new Date(year, 11, 31),
            description: `Closing Revenue ${year} -> 3130`,
            status: 'posted',
            isAdjustment: false,
            periodYear: year,
            periodMonth: 12,
          },
        });
        const lines1 = [];
        for (const r of revLines) {
          lines1.push({ journalId: j1.id, coaId: r.coaId, debit: r.balance, credit: 0, memo: `Closing Revenue ${year}` });
        }
        lines1.push({ journalId: j1.id, coaId: ikhtisar.id, debit: 0, credit: totalRevenue, memo: `Ikhtisar Revenue ${year}` });
        await tx.journalLine.createMany({ data: lines1 });
      }

      // Journal 2: 3130 -> Expense (debit Ikhtisar, credit Expense)
      if (totalExpense > 0) {
        const jNo2 = `CLS-EXP-${year}-${Date.now() + 1}`;
        const j2 = await tx.journal.create({
          data: {
            businessId,
            journalNo: jNo2,
            journalDate: new Date(year, 11, 31),
            description: `Closing Expense ${year} 3130 -> Expense`,
            status: 'posted',
            isAdjustment: false,
            periodYear: year,
            periodMonth: 12,
          },
        });
        const lines2 = [{ journalId: j2.id, coaId: ikhtisar.id, debit: totalExpense, credit: 0, memo: `Ikhtisar Expense ${year}` }];
        for (const e of expLines) {
          lines2.push({ journalId: j2.id, coaId: e.coaId, debit: 0, credit: e.balance, memo: `Closing Expense ${year}` });
        }
        await tx.journalLine.createMany({ data: lines2 });
      }

      const netIncome = totalRevenue - totalExpense;
      // Journal 3: 3130 -> 3120 (saldo Ikhtisar ke Laba Ditahan)
      if (netIncome !== 0) {
        const jNo3 = `CLS-NET-${year}-${Date.now() + 2}`;
        const isProfit = netIncome > 0;
        const absNet = Math.abs(netIncome);
        const j3 = await tx.journal.create({
          data: {
            businessId,
            journalNo: jNo3,
            journalDate: new Date(year, 11, 31),
            description: isProfit ? `Closing Net Profit ${year} 3130 -> 3120` : `Closing Net Loss ${year} 3120 -> 3130`,
            status: 'posted',
            isAdjustment: false,
            periodYear: year,
            periodMonth: 12,
          },
        });
        const lines3 = isProfit
          ? [
              { journalId: j3.id, coaId: ikhtisar.id, debit: absNet, credit: 0, memo: `Net profit ${year}` },
              { journalId: j3.id, coaId: labaDitahan.id, debit: 0, credit: absNet, memo: `Laba Ditahan ${year}` },
            ]
          : [
              { journalId: j3.id, coaId: labaDitahan.id, debit: absNet, credit: 0, memo: `Rugi ${year}` },
              { journalId: j3.id, coaId: ikhtisar.id, debit: 0, credit: absNet, memo: `Ikhtisar loss ${year}` },
            ];
        await tx.journalLine.createMany({ data: lines3 });
      }

      const period = await tx.accountingPeriod.create({
        data: { businessId, year, month, status: 'closed', closedAt: new Date() },
      });
      return period;
    });
  }

  // Month close: check NS balanced via trial balance query then create AccountingPeriod closed
  const agg = await prisma.journalLine.aggregate({
    where: { journal: { businessId, status: 'posted', periodYear: year, periodMonth: month } },
    _sum: { debit: true, credit: true },
  });
  const sumDebit = Number(agg._sum.debit || 0);
  const sumCredit = Number(agg._sum.credit || 0);
  // If no journals, considered balanced (allow close) or treat as 0=0 balanced. But spec says check NS balanced.
  // If imbalance, throw 400
  if (sumDebit !== sumCredit) {
    throw new ApiError(400, 'Neraca Saldo tidak seimbang, periode tidak bisa ditutup');
  }

  return prisma.$transaction(async (tx) => {
    const dup2 = await tx.accountingPeriod.findFirst({ where: { businessId, year, month } });
    if (dup2 && dup2.status === 'closed') throw new ApiError(409, 'Periode sudah ditutup');
    // double-check balance inside tx
    const aggTx = await tx.journalLine.aggregate({
      where: { journal: { businessId, status: 'posted', periodYear: year, periodMonth: month } },
      _sum: { debit: true, credit: true },
    });
    const d = Number(aggTx._sum.debit || 0);
    const c = Number(aggTx._sum.credit || 0);
    if (d !== c) throw new ApiError(400, 'Neraca Saldo tidak seimbang, periode tidak bisa ditutup');
    const period = await tx.accountingPeriod.create({
      data: { businessId, year, month, status: 'closed', closedAt: new Date() },
    });
    return period;
  });
}

module.exports = { list, close };
