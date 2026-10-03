const { createManualJournalSchema } = require('../src/modules/journals/journals.validation');

// Mock prisma - must be hoisted before requiring service
jest.mock('../src/config/database', () => ({
  accountingPeriod: { findFirst: jest.fn() },
  chartOfAccount: { findFirst: jest.fn() },
  journal: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  journalLine: { createMany: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/database');
const repo = require('../src/modules/journals/journals.repository');
const svc = require('../src/modules/journals/journals.service');
const fixedSvc = require('../src/modules/fixed-assets/fixed-assets.service');

describe('Jurnal Penyesuaian & Void Reversal + Period Guard', () => {
  afterEach(() => jest.resetAllMocks());

  test('validation: isAdjustment true requires adjustmentType', () => {
    const bad = {
      journalDate: '2026-08-31',
      description: 'Adj perlengkapan',
      isAdjustment: true,
      lines: [
        { coaId: 1, debit: 500000, credit: 0 },
        { coaId: 2, debit: 0, credit: 500000 },
      ],
    };
    const res = createManualJournalSchema.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      const issues = res.error.issues;
      expect(issues.some((i) => String(i.path).includes('adjustmentType'))).toBe(true);
    }
  });

  test('validation: creates adjustment journal with type supplies parses', () => {
    const good = {
      journalDate: '2026-08-31',
      description: 'Adj perlengkapan',
      isAdjustment: true,
      adjustmentType: 'supplies',
      status: 'posted',
      lines: [
        { coaId: 1, debit: 500000, credit: 0 },
        { coaId: 2, debit: 0, credit: 500000 },
      ],
    };
    const res = createManualJournalSchema.safeParse(good);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.isAdjustment).toBe(true);
      expect(res.data.adjustmentType).toBe('supplies');
    }
  });

  test('validation: adjustmentType enum invalid should fail', () => {
    const bad = {
      journalDate: '2026-08-31',
      isAdjustment: true,
      adjustmentType: 'invalidType',
      lines: [
        { coaId: 1, debit: 100, credit: 0 },
        { coaId: 2, debit: 0, credit: 100 },
      ],
    };
    const res = createManualJournalSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  test('creates adjustment journal persists isAdjustment and periodYear/Month', async () => {
    prisma.accountingPeriod.findFirst.mockResolvedValue(null); // not closed
    const fakeTx = {
      chartOfAccount: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
      journal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 10,
          businessId: 1,
          journalNo: 'JU-MANUAL-123',
          isAdjustment: true,
          adjustmentType: 'supplies',
          periodYear: 2026,
          periodMonth: 8,
          status: 'posted',
          lines: [],
        }),
      },
    };
    let capturedCreateData = null;
    fakeTx.journal.create = jest.fn(async (opts) => {
      capturedCreateData = opts.data;
      return { id: 10, ...opts.data };
    });
    // mock repo helpers to use fakeTx
    const repoCreateJournalTx = jest.spyOn(repo, 'createJournalTx').mockImplementation(async (tx, data) => {
      capturedCreateData = data;
      return { id: 10, ...data };
    });
    const repoCreateLines = jest.spyOn(repo, 'createJournalLinesTx').mockResolvedValue({ count: 2 });

    prisma.$transaction.mockImplementation(async (fn) => fn(fakeTx));

    // Need to also mock chartOfAccount for each line inside tx - already done
    // Ensure findFirst resolves
    fakeTx.chartOfAccount.findFirst.mockResolvedValue({ id: 1, businessId: 1 });

    const j = await svc.createManual(1, {
      journalDate: '2026-08-31',
      description: 'Adj perlengkapan',
      isAdjustment: true,
      adjustmentType: 'supplies',
      status: 'posted',
      lines: [
        { coaId: 101, debit: 500000, credit: 0 },
        { coaId: 102, debit: 0, credit: 500000 },
      ],
    });

    expect(capturedCreateData).toBeTruthy();
    expect(capturedCreateData.isAdjustment).toBe(true);
    expect(capturedCreateData.adjustmentType).toBe('supplies');
    expect(capturedCreateData.periodYear).toBe(2026);
    expect(capturedCreateData.periodMonth).toBe(8);
    expect(j.isAdjustment).toBe(true);

    repoCreateJournalTx.mockRestore();
    repoCreateLines.mockRestore();
  });

  test('createManual blocked when period closed (403)', async () => {
    prisma.accountingPeriod.findFirst.mockResolvedValue({ id: 1, status: 'closed' });
    await expect(
      svc.createManual(1, {
        journalDate: '2026-08-15',
        description: 'Should block',
        lines: [
          { coaId: 1, debit: 100, credit: 0 },
          { coaId: 2, debit: 0, credit: 100 },
        ],
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('void creates reversal not delete and checks period closed', async () => {
    const existing = {
      id: 1,
      businessId: 1,
      journalNo: 'JU-MANUAL-1',
      journalDate: new Date('2026-08-10'),
      status: 'posted',
      lines: [
        { coaId: 101, debit: 500000, credit: 0 },
        { coaId: 102, debit: 0, credit: 500000 },
      ],
    };
    jest.spyOn(repo, 'findById').mockResolvedValue(existing);
    prisma.accountingPeriod.findFirst.mockResolvedValue(null); // open

    let updatedToVoid = null;
    let reversalData = null;
    let revLines = null;
    const fakeTx = {
      journal: {
        update: jest.fn(async (opts) => {
          updatedToVoid = opts;
          return { ...existing, status: 'void' };
        }),
        create: jest.fn(async (opts) => {
          reversalData = opts.data;
          return { id: 99, ...opts.data };
        }),
      },
      journalLine: {
        createMany: jest.fn(async (opts) => {
          revLines = opts.data;
          return { count: 2 };
        }),
      },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(fakeTx));

    const rev = await svc.remove(1, 1);

    expect(updatedToVoid.data.status).toBe('void');
    expect(reversalData.journalNo).toMatch(/^VOID-/);
    expect(reversalData.journalNo.length).toBeLessThanOrEqual(50);
    expect(reversalData.description).toContain('JU-MANUAL-1');
    expect(revLines).toBeTruthy();
    expect(revLines[0].debit).toBe(0);
    expect(revLines[0].credit).toBe(500000);
    expect(revLines[1].debit).toBe(500000);
    expect(revLines[1].credit).toBe(0);
    expect(rev.id).toBe(99);

    repo.findById.mockRestore();
  });

  test('void blocked when period closed', async () => {
    const existing = {
      id: 2,
      businessId: 1,
      journalNo: 'JU-MANUAL-2',
      journalDate: new Date('2026-08-10'),
      lines: [{ coaId: 1, debit: 100, credit: 0 }, { coaId: 2, debit: 0, credit: 100 }],
    };
    jest.spyOn(repo, 'findById').mockResolvedValue(existing);
    prisma.accountingPeriod.findFirst.mockResolvedValue({ id: 1, status: 'closed' });
    await expect(svc.remove(1, 2)).rejects.toMatchObject({ statusCode: 403 });
    repo.findById.mockRestore();
  });

  test('fixed-assets depreciation creates adjustment journal', async () => {
    const fakeTx = {
      fixedAsset: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          businessId: 1,
          code: 'AST-001',
          name: 'Laptop',
          acquisitionCost: 12000000,
          residualValue: 0,
          usefulLifeMonths: 24,
          accumulatedDepreciation: 0,
          isActive: true,
        }),
        update: jest.fn(async () => ({ id: 1 })),
      },
      chartOfAccount: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          if (where.code === '6010' || where.code === '5150') return { id: 10, code: where.code };
          if (where.code === '1520') return { id: 20, code: '1520' };
          return null;
        }),
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: 99, ...data })),
      },
      journal: {
        create: jest.fn(async ({ data }) => ({ id: 50, ...data })),
        findUnique: jest.fn(async () => ({ id: 50, isAdjustment: true, adjustmentType: 'depreciation', lines: [] })),
      },
      journalLine: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      assetDepreciation: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(fakeTx));

    await fixedSvc.depreciate(1, 1, { depreciationDate: '2026-08-31' });
    const journalCreateCall = fakeTx.journal.create.mock.calls[0][0];
    expect(journalCreateCall.data.isAdjustment).toBe(true);
    expect(journalCreateCall.data.adjustmentType).toBe('depreciation');
    expect(journalCreateCall.data.periodYear).toBe(2026);
    expect(journalCreateCall.data.periodMonth).toBe(8);
  });
});
