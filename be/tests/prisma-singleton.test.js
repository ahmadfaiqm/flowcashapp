test('database module exports a single shared PrismaClient', () => {
  const a = require('../src/config/database');
  const b = require('../src/config/database');
  expect(a).toBe(b);
  expect(typeof a.businessProfile.findUnique).toBe('function');
});
