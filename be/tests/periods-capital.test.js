jest.mock('../src/config/database', () => ({
  accountingPeriod: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  capitalMovement: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  chartOfAccount: { findFirst: jest.fn(), findMany: jest.fn() },
  journal: { create: jest.fn(), findFirst: jest.fn() },
  journalLine: { aggregate: jest.fn(), createMany: jest.fn(), groupBy: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/database');

describe('Periods & Capital Movements - Task 3', () => {
  afterEach(() => jest.resetAllMocks());

  test('close period creates closed status - route exists', async () => {
    // before implementation this will fail because module missing
    const periodsService = require('../src/modules/periods/periods.service');
    expect(typeof periodsService.close).toBe('function');
  });

  test('close monthly checks NS balanced then creates period', async () => {
    const svc = require('../src/modules/periods/periods.service');
    prisma.accountingPeriod.findFirst.mockResolvedValue(null);
    prisma.journalLine.aggregate.mockResolvedValue({ _sum: { debit: 1000000, credit: 1000000 } });
    prisma.accountingPeriod.create.mockResolvedValue({ id: 1, businessId: 1, year: 2026, month: 8, status: 'closed' });
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        accountingPeriod: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 1, businessId: 1, year: 2026, month: 8, status: 'closed', closedAt: new Date() }) },
        journalLine: { aggregate: jest.fn().mockResolvedValue({ _sum: { debit: 1000000, credit: 1000000 } }) },
        journal: { create: jest.fn() },
        journalLine2: { createMany: jest.fn() },
        chartOfAccount: { findFirst: jest.fn() },
      };
      return fn(tx);
    });
    // mock direct prisma aggregation for service that does not use tx for monthly
    // service will use prisma.journalLine.aggregate directly or via tx
    const result = await svc.close(1, { year: 2026, month: 8 });
    expect(prisma.accountingPeriod.findFirst).toHaveBeenCalled();
    expect(result.status).toBe('closed');
  });

  test('close already closed throws 409', async () => {
    const svc = require('../src/modules/periods/periods.service');
    prisma.accountingPeriod.findFirst.mockResolvedValue({ id: 1, status: 'closed' });
    await expect(svc.close(1, { year: 2026, month: 8 })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('close tahunan month 0 creates closing journals Revenue->3130, 3130->Expense, 3130->3120', async () => {
    const svc = require('../src/modules/periods/periods.service');
    prisma.accountingPeriod.findFirst.mockResolvedValue(null);
    const fakeTx = {
      accountingPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 2, businessId: 1, year: 2026, month: 0, status: 'closed' }),
      },
      chartOfAccount: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          if (where.code === '3130') return { id: 70, code: '3130' };
          if (where.code === '3120') return { id: 71, code: '3120' };
          return null;
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 10, code: '4010', accountType: 'Revenue' },
          { id: 20, code: '5010', accountType: 'Expense' },
        ]),
      },
      journalLine: {
        groupBy: jest.fn().mockImplementation(async (opts) => {
          // detect revenue vs expense by where filter
          const isRevenue = opts.where && opts.where.coa && opts.where.coa.accountType === 'Revenue';
          if (isRevenue) return [{ coaId: 10, _sum: { debit: 0, credit: 5000000 } }];
          return [{ coaId: 20, _sum: { debit: 3000000, credit: 0 } }];
        }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { debit: 3000000, credit: 5000000 } }),
      },
      journal: {
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: Math.floor(Math.random() * 1000), ...data })),
      },
      journalLine2: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    // For our service, it uses tx.journalLine.groupBy and tx.journal.create
    // Need to map journalLine.createMany to tx
    fakeTx.journalLine.createMany = jest.fn().mockResolvedValue({ count: 2 });
    prisma.$transaction.mockImplementation(async (fn) => fn(fakeTx));

    const result = await svc.close(1, { year: 2026, month: 0 });
    expect(fakeTx.journal.create).toHaveBeenCalled();
    // should create at least 3 journals: Revenue->3130, 3130->Expense, 3130->3120
    expect(fakeTx.journal.create.mock.calls.length).toBeGreaterThanOrEqual(3);
    const descriptions = fakeTx.journal.create.mock.calls.map(c => c[0].data.description);
    expect(descriptions.some(d => d.includes('Closing Revenue') || d.includes('Revenue'))).toBe(true);
    expect(result.status).toBe('closed');
  });

  test('capital movement prive creates journal Prive 3111 D -> Kas 1010 K', async () => {
    const svc = require('../src/modules/capital-movements/capital-movements.service');
    expect(typeof svc.create).toBe('function');
    const fakeTx = {
      accountingPeriod: { findFirst: jest.fn().mockResolvedValue(null) },
      chartOfAccount: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          if (where.code === '3111') return { id: 31, code: '3111' };
          if (where.code === '1010') return { id: 10, code: '1010' };
          return null;
        }),
      },
      capitalMovement: { create: jest.fn().mockResolvedValue({ id: 1, businessId: 1, type: 'prive', amount: 1000000 }) },
      journal: { create: jest.fn().mockResolvedValue({ id: 100, journalNo: 'JU-PRIVE-1' }) },
      journalLine: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(fakeTx));
    const result = await svc.create(1, { date: '2026-08-15', type: 'prive', amount: 1000000, description: 'Prive test' });
    expect(result).toBeDefined();
    expect(fakeTx.journal.create).toHaveBeenCalled();
    const jData = fakeTx.journal.create.mock.calls[0][0].data;
    expect(jData.description).toMatch(/Prive/);
    expect(fakeTx.journalLine.createMany).toHaveBeenCalled();
    const lines = fakeTx.journalLine.createMany.mock.calls[0][0].data;
    expect(lines[0].coaId).toBe(31);
    expect(lines[0].debit).toBe(1000000);
    expect(lines[1].coaId).toBe(10);
    expect(lines[1].credit).toBe(1000000);
  });

  test('capital movement additional creates journal Kas 1010 D -> Modal 3110 K', async () => {
    const svc = require('../src/modules/capital-movements/capital-movements.service');
    const fakeTx = {
      accountingPeriod: { findFirst: jest.fn().mockResolvedValue(null) },
      chartOfAccount: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          if (where.code === '3110') return { id: 30, code: '3110' };
          if (where.code === '1010') return { id: 10, code: '1010' };
          return null;
        }),
      },
      capitalMovement: { create: jest.fn().mockResolvedValue({ id: 2, businessId: 1, type: 'additional', amount: 500000 }) },
      journal: { create: jest.fn().mockResolvedValue({ id: 101, journalNo: 'JU-MODAL-ADDITIONAL-1' }) },
      journalLine: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(fakeTx));
    prisma.capitalMovement.create = jest.fn().mockResolvedValue({ id: 2 });
    const result = await svc.create(1, { date: '2026-08-15', type: 'additional', amount: 500000, description: 'Setoran' });
    expect(result).toBeDefined();
    expect(fakeTx.capitalMovement.create).toHaveBeenCalled();
    expect(fakeTx.journal.create).toHaveBeenCalled();
    const jData = fakeTx.journal.create.mock.calls[0][0].data;
    expect(jData.journalNo).toMatch(/JU-MODAL-ADDITIONAL/);
    const lines = fakeTx.journalLine.createMany.mock.calls[0][0].data;
    expect(lines[0].coaId).toBe(10);
    expect(lines[0].debit).toBe(500000);
    expect(lines[1].coaId).toBe(30);
    expect(lines[1].credit).toBe(500000);
  });

  test('supertest route periods/close exists (not 404)', async () => {
    const request = require('supertest');
    const app = require('../src/app');
    const res = await request(app).post('/api/v1/periods/close').set('Authorization', 'Bearer invalid').set('X-Business-Id', '1').send({ year: 2026, month: 8 });
    // should not be 404; should be 401 due to invalid token, proving route mounted
    expect(res.status).not.toBe(404);
  }, 10000);

  test('supertest route capital-movements exists (not 404)', async () => {
    const request = require('supertest');
    const app = require('../src/app');
    const res = await request(app).get('/api/v1/capital-movements').set('Authorization', 'Bearer invalid').set('X-Business-Id', '1');
    expect(res.status).not.toBe(404);
  }, 10000);
});
