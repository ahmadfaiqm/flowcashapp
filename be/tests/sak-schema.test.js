const prisma = require('../src/config/database');

describe('SAK schema', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('schema has new SAK tables', async () => {
    const fields = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name='journals' AND column_name='is_adjustment'`;
    expect(fields.length).toBe(1);
  });

  test('chart_of_accounts has is_contra and normal_balance', async () => {
    const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name='chart_of_accounts' AND column_name IN ('is_contra','normal_balance')`;
    const names = cols.map(c => c.column_name);
    expect(names).toContain('is_contra');
    expect(names).toContain('normal_balance');
  });

  test('accounting_periods table exists', async () => {
    const t = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_name='accounting_periods'`;
    expect(t.length).toBe(1);
  });

  test('capital_movements table exists', async () => {
    const t = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_name='capital_movements'`;
    expect(t.length).toBe(1);
  });

  test('AdjustmentType enum exists', async () => {
    const e = await prisma.$queryRaw`SELECT typname FROM pg_type WHERE typname='AdjustmentType'`;
    expect(e.length).toBe(1);
  });
});
