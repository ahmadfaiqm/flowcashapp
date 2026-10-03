jest.mock('../src/config/database', () => ({
  journalLine: { groupBy: jest.fn(), aggregate: jest.fn() },
  chartOfAccount: { findMany: jest.fn() },
}));

const prisma = require('../src/config/database');
const repo = require('../src/modules/reports/reports.repository');

function journalFilterOf(callArgs) {
  const where = callArgs[0].where;
  return where.journal || where;
}

describe('Laporan kecualikan jurnal reversal VOID-', () => {
  afterEach(() => jest.resetAllMocks());

  test('journalLineGroupsByCoA memfilter journalNo VOID-', async () => {
    prisma.journalLine.groupBy.mockResolvedValue([]);
    await repo.journalLineGroupsByCoA(1, undefined, undefined, false);
    const jf = journalFilterOf(prisma.journalLine.groupBy.mock.calls[0]);
    expect(jf.status).toBe('posted');
    expect(jf.journalNo).toBeDefined();
    expect(JSON.stringify(jf.journalNo)).toContain('VOID-');
  });

  test('journalExpenseAggregate memfilter journalNo VOID-', async () => {
    prisma.journalLine.aggregate.mockResolvedValue({ _sum: { debit: 0, credit: 0 } });
    await repo.journalExpenseAggregate(1, undefined, undefined);
    const jf = journalFilterOf(prisma.journalLine.aggregate.mock.calls[0]);
    expect(JSON.stringify(jf.journalNo)).toContain('VOID-');
  });

  test('journalRevenueAggregate memfilter journalNo VOID-', async () => {
    prisma.journalLine.aggregate.mockResolvedValue({ _sum: { debit: 0, credit: 0 } });
    await repo.journalRevenueAggregate(1, undefined, undefined);
    const jf = journalFilterOf(prisma.journalLine.aggregate.mock.calls[0]);
    expect(JSON.stringify(jf.journalNo)).toContain('VOID-');
  });

  test('journalLineGroupsBefore memfilter journalNo VOID-', async () => {
    prisma.journalLine.groupBy.mockResolvedValue([]);
    await repo.journalLineGroupsBefore(1, '2026-08-01');
    const jf = journalFilterOf(prisma.journalLine.groupBy.mock.calls[0]);
    expect(JSON.stringify(jf.journalNo)).toContain('VOID-');
  });
});
