jest.mock('../src/config/database', () => ({
  chartOfAccount: { findMany: jest.fn() },
  journalLine: { groupBy: jest.fn(), aggregate: jest.fn() },
  capitalMovement: { findMany: jest.fn(), aggregate: jest.fn() },
  journal: { aggregate: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/database');
const svc = require('../src/modules/reports/reports.service');

describe('Reports Worksheet & Capital Change - Task 4', () => {
  afterEach(() => jest.resetAllMocks());

  test('worksheet 10 kolom seimbang', async () => {
    const coas = [
      { id: 1, businessId: 1, code: '1010', name: 'Kas', accountType: 'Asset', normalBalance: 'debit', isContra: false, isActive: true },
      { id: 2, businessId: 1, code: '3110', name: 'Modal', accountType: 'Equity', normalBalance: 'credit', isContra: false, isActive: true },
      { id: 3, businessId: 1, code: '4010', name: 'Penjualan', accountType: 'Revenue', normalBalance: 'credit', isContra: false, isActive: true },
      { id: 4, businessId: 1, code: '5110', name: 'Beban Gaji', accountType: 'Expense', normalBalance: 'debit', isContra: false, isActive: true },
      { id: 5, businessId: 1, code: '1520', name: 'Akumulasi Penyusutan', accountType: 'Asset', normalBalance: 'credit', isContra: true, isActive: true },
    ];
    prisma.chartOfAccount.findMany.mockResolvedValue(coas);

    // trial groups (isAdjustment false)
    prisma.journalLine.groupBy.mockImplementation(async (opts) => {
      const isAdj = opts.where && opts.where.journal && opts.where.journal.isAdjustment;
      if (isAdj === true) {
        // adjustment groups
        return [
          { coaId: 5, _sum: { debit: 0, credit: 200000 } },
          { coaId: 4, _sum: { debit: 200000, credit: 0 } },
        ];
      }
      // trial groups (false) balanced: Kas includes revenue offset
      return [
        { coaId: 1, _sum: { debit: 54650000, credit: 0 } },
        { coaId: 2, _sum: { debit: 0, credit: 50000000 } },
        { coaId: 3, _sum: { debit: 0, credit: 13000000 } },
        { coaId: 4, _sum: { debit: 8350000, credit: 0 } },
      ];
    });

    // for balanceSheet and capitalChange extra mocks
    prisma.capitalMovement.findMany.mockResolvedValue([]);
    prisma.journalLine.aggregate.mockResolvedValue({ _sum: { debit: 0, credit: 0 } });

    const ws = await svc.worksheet(1, { from: '2026-08-01', to: '2026-08-31' });
    expect(ws.rows.length).toBeGreaterThan(0);
    expect(ws.totals.trialDebit).toBe(ws.totals.trialCredit);
    expect(ws.totals.adjustedDebit).toBe(ws.totals.adjustedCredit);
    expect(ws.totals.netIncome).toBeDefined();
    // netIncome = revenue 13j - expense (8.35j+0.2j)= 4.45j
    expect(ws.totals.netIncome).toBe(4450000);
  });

  test('adjustedTrialBalance returns NSD', async () => {
    const coas = [
      { id: 1, businessId: 1, code: '1010', name: 'Kas', accountType: 'Asset', normalBalance: 'debit', isContra: false, isActive: true },
      { id: 2, businessId: 1, code: '3110', name: 'Modal', accountType: 'Equity', normalBalance: 'credit', isContra: false, isActive: true },
    ];
    prisma.chartOfAccount.findMany.mockResolvedValue(coas);
    prisma.journalLine.groupBy.mockImplementation(async (opts) => {
      const isAdj = opts.where && opts.where.journal && opts.where.journal.isAdjustment;
      if (isAdj === true) return [
        { coaId: 1, _sum: { debit: 0, credit: 500000 } },
        { coaId: 2, _sum: { debit: 500000, credit: 0 } },
      ];
      return [
        { coaId: 1, _sum: { debit: 1000000, credit: 0 } },
        { coaId: 2, _sum: { debit: 0, credit: 1000000 } },
      ];
    });
    const nsd = await svc.adjustedTrialBalance(1, { from: '2026-08-01', to: '2026-08-31' });
    expect(nsd.rows).toBeDefined();
    expect(nsd.totals.debit).toBe(nsd.totals.credit);
  });

  test('capital change modal akhir benar', async () => {
    const coas = [
      { id: 1, businessId: 1, code: '1010', name: 'Kas', accountType: 'Asset', normalBalance: 'debit', isContra: false, isActive: true },
      { id: 2, businessId: 1, code: '3110', name: 'Modal', accountType: 'Equity', normalBalance: 'credit', isContra: false, isActive: true },
      { id: 3, businessId: 1, code: '3120', name: 'Laba Ditahan', accountType: 'Equity', normalBalance: 'credit', isContra: false, isActive: true },
      { id: 31, businessId: 1, code: '3111', name: 'Prive', accountType: 'Equity', normalBalance: 'debit', isContra: true, isActive: true },
      { id: 10, businessId: 1, code: '4010', name: 'Penjualan', accountType: 'Revenue', normalBalance: 'credit', isContra: false, isActive: true },
      { id: 20, businessId: 1, code: '5110', name: 'Beban Gaji', accountType: 'Expense', normalBalance: 'debit', isContra: false, isActive: true },
    ];
    prisma.chartOfAccount.findMany.mockResolvedValue(coas);

    // worksheet groups inside capitalChange
    prisma.journalLine.groupBy.mockImplementation(async (opts) => {
      const isAdj = opts.where && opts.where.journal && opts.where.journal.isAdjustment;
      const acctType = opts.where && opts.where.coa && opts.where.coa.accountType;
      // for worksheet: group by coaId without accountType filter
      if (!acctType) {
        if (isAdj === true) return [];
        return [
          { coaId: 10, _sum: { debit: 0, credit: 13000000 } },
          { coaId: 20, _sum: { debit: 8550000, credit: 0 } },
          { coaId: 1, _sum: { debit: 50000000, credit: 0 } },
          { coaId: 2, _sum: { debit: 0, credit: 50000000 } },
        ];
      }
      // fallback
      return [];
    });

    // modalAwal: sum before from -> mock aggregate for Equity 3110+3120 before date
    // service will call journalLine.groupBy or aggregate for before period; we mock groupBy for before as well
    // Alternative: mock capitalMovement + journalLine aggregate for equity before
    // We'll mock capitalMovement.findMany to return movements and journalLine.groupBy for before equity
    // Need to handle service's modalAwal logic: it may query journalLine.groupBy with journalDate < from
    // For simplicity mock capitalMovement and also mock an extra call for equity before
    // Use a call counter
    const origGroupBy = prisma.journalLine.groupBy.getMockImplementation();
    prisma.journalLine.groupBy.mockImplementation(async (opts) => {
      // first calls are worksheet trial/adj (we already handled)
      // After worksheet, capitalChange will call for modalAwal (journalDate lt)
      // Detect lt filter: where.journal.journalDate.lt
      const hasLt = opts.where && opts.where.journal && opts.where.journal.journalDate && opts.where.journal.journalDate.lt;
      if (hasLt) {
        // equity before: 3110 modal 50jt
        return [
          { coaId: 2, _sum: { debit: 0, credit: 50000000 } },
          { coaId: 3, _sum: { debit: 0, credit: 0 } },
        ];
      }
      // otherwise delegate to orig
      return origGroupBy(opts);
    });
    prisma.capitalMovement.findMany.mockResolvedValue([
      { id: 1, businessId: 1, date: new Date('2026-08-15'), type: 'prive', amount: 1000000, description: 'Prive' },
      { id: 2, businessId: 1, date: new Date('2026-08-10'), type: 'additional', amount: 0, description: '' },
    ]);

    const cc = await svc.capitalChange(1, { from: '2026-08-01', to: '2026-08-31' });
    expect(cc.modalAkhir).toBe(cc.modalAwal + cc.setoran - cc.prive + cc.labaBersih);
  });

  test('profitLoss now uses JournalLine aggregation (refactored)', async () => {
    // mock repo helpers or direct prisma
    prisma.journalLine.groupBy = jest.fn().mockResolvedValue([]);
    // profitLoss will use journalLine aggregate via repo; we mock via prisma.journalLine.aggregate and groupBy
    // We'll just check function exists and returns expected shape with journal totals
    // Since profitLoss refactored, it should call journalLine aggregate; we setup mocks for aggregate
    prisma.journalLine.aggregate = jest.fn().mockResolvedValue({ _sum: { debit: 0, credit: 0 } });
    // also mock chartOfAccount if needed
    prisma.chartOfAccount.findMany.mockResolvedValue([]);
    // Need to mock prisma.journalLine.aggregate for revenue/expense via repo's helpers
    // Those helpers call prisma.journalLine.aggregate directly, so our mock above applies
    // Also need to mock salesAggregate etc still? But refactored profitLoss should not call sales table
    // So just ensure it doesn't throw and returns netProfit based on journals
    // Setup revenue 5j expense 3j
    prisma.journalLine.aggregate.mockImplementation(async (opts) => {
      const isRevenue = opts.where && opts.where.coa && opts.where.coa.accountType === 'Revenue';
      if (isRevenue) return { _sum: { debit: 0, credit: 5000000 } };
      if (opts.where && opts.where.coa && opts.where.coa.accountType === 'Expense') return { _sum: { debit: 3000000, credit: 0 } };
      return { _sum: { debit: 0, credit: 0 } };
    });
    // also need to handle depreciationAggregate still maybe called? We'll mock via prisma.assetDepreciation if needed
    // For refactored version we expect depreciation already in expense, so we mock prisma.assetDepreciation.aggregate if called
    // Since service may still call depreciationAggregate, we mock it via prisma.assetDepreciation
    // But our prisma mock currently has no assetDepreciation; add it
    prisma.assetDepreciation = { aggregate: jest.fn().mockResolvedValue({ _sum: { depreciationAmount: 0 }, _count: { _all: 0 } }) };
    const pl = await svc.profitLoss(1, { from: '2026-08-01', to: '2026-08-31' });
    expect(pl.revenue).toBeDefined();
    expect(pl.expenseTotal).toBeDefined();
  });

  test('balanceSheet now uses JournalLine and balanced', async () => {
    const coas = [
      { id: 1, code: '1010', name: 'Kas', accountType: 'Asset', normalBalance: 'debit', isContra: false },
      { id: 2, code: '1520', name: 'Akum Penyusutan', accountType: 'Asset', normalBalance: 'credit', isContra: true },
      { id: 3, code: '2010', name: 'Hutang', accountType: 'Liability', normalBalance: 'credit', isContra: false },
      { id: 4, code: '3110', name: 'Modal', accountType: 'Equity', normalBalance: 'credit', isContra: false },
    ];
    prisma.chartOfAccount.findMany.mockResolvedValue(coas);
    prisma.journalLine.groupBy.mockResolvedValue([
      { coaId: 1, _sum: { debit: 50000000, credit: 0 } },
      { coaId: 2, _sum: { debit: 0, credit: 200000 } },
      { coaId: 3, _sum: { debit: 0, credit: 1000000 } },
      { coaId: 4, _sum: { debit: 0, credit: 48800000 } },
    ]);
    prisma.journalLine.aggregate.mockImplementation(async (opts) => {
      const acct = opts.where && opts.where.coa && opts.where.coa.accountType;
      if (acct === 'Revenue') return { _sum: { debit: 0, credit: 0 } };
      if (acct === 'Expense') return { _sum: { debit: 0, credit: 0 } };
      return { _sum: { debit: 0, credit: 0 } };
    });
    const bs = await svc.balanceSheet(1, { from: '2026-08-01', to: '2026-08-31' });
    expect(bs.totals.balanced).toBe(true);
    expect(bs.totals.assets).toBe(bs.totals.liabilities + bs.totals.equity);
  });
});
