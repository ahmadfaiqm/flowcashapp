jest.mock('../src/config/database', () => ({
  accountingPeriod: { findFirst: jest.fn() },
  journal: { update: jest.fn(), create: jest.fn() },
  journalLine: { createMany: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/database');
const repo = require('../src/modules/journals/journals.repository');
const svc = require('../src/modules/journals/journals.service');

describe('Journal remove P2000 regression', () => {
  afterEach(() => jest.resetAllMocks());

  test('jurnal posted biasa: reversalNo pendek <=50', async () => {
    const existing = {
      id: 5,
      businessId: 1,
      journalNo: 'JU-MANUAL-1790779548712-1',
      journalDate: new Date('2026-09-30'),
      status: 'posted',
      description: 'Transaksi biasa',
      lines: [
        { coaId: 101, debit: 100, credit: 0 },
        { coaId: 102, debit: 0, credit: 100 },
      ],
    };
    jest.spyOn(repo, 'findById').mockResolvedValue(existing);
    prisma.accountingPeriod.findFirst.mockResolvedValue(null);

    let reversalNo = null;
    const fakeTx = {
      journal: {
        update: jest.fn(async () => ({ ...existing, status: 'void' })),
        create: jest.fn(async (opts) => {
          reversalNo = opts.data.journalNo;
          return { id: 99, ...opts.data };
        }),
      },
      journalLine: { createMany: jest.fn(async () => ({ count: 2 })) },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(fakeTx));

    await svc.remove(1, 5);

    expect(reversalNo).toBeTruthy();
    expect(reversalNo.length).toBeLessThanOrEqual(50);

    repo.findById.mockRestore();
  });

  test('guard: jurnal berstatus void tidak bisa di-void lagi (400)', async () => {
    const existing = {
      id: 4,
      businessId: 1,
      journalNo: 'JU-MANUAL-123',
      journalDate: new Date('2026-09-30'),
      status: 'void',
      lines: [{ coaId: 1, debit: 100, credit: 0 }],
    };
    jest.spyOn(repo, 'findById').mockResolvedValue(existing);
    prisma.accountingPeriod.findFirst.mockResolvedValue(null);

    await expect(svc.remove(1, 4)).rejects.toMatchObject({ statusCode: 400 });

    repo.findById.mockRestore();
  });

  test('guard: jurnal reversal (VOID-) tidak bisa dihapus lagi (400, repro prod id 3)', async () => {
    const existing = {
      id: 3,
      businessId: 1,
      journalNo: 'VOID-JU-MANUAL-1790779548712-1-1790779890159',
      journalDate: new Date('2026-09-30'),
      status: 'posted',
      description: 'Reversal JU-MANUAL-1790779548712-1',
      lines: [
        { coaId: 101, debit: 100, credit: 0 },
        { coaId: 102, debit: 0, credit: 100 },
      ],
    };
    jest.spyOn(repo, 'findById').mockResolvedValue(existing);
    prisma.accountingPeriod.findFirst.mockResolvedValue(null);

    await expect(svc.remove(1, 3)).rejects.toMatchObject({ statusCode: 400 });

    repo.findById.mockRestore();
  });
});
