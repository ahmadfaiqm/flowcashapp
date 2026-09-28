jest.mock('../src/config/database', () => ({
  businessMember: { findFirst: jest.fn() },
  businessProfile: { create: jest.fn(), findMany: jest.fn() },
  chartOfAccount: { createMany: jest.fn() },
  $transaction: jest.fn((fn) =>
    fn({
      businessProfile: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      businessMember: { create: jest.fn().mockResolvedValue({}) },
      chartOfAccount: { createMany: jest.fn().mockResolvedValue({ count: 8 }) },
    })
  ),
}));
const request = require('supertest');
const app = require('../src/app');

describe('Businesses + requireBusiness', () => {
  it('POST /api/v1/businesses without auth → 401', async () => {
    const res = await request(app).post('/api/v1/businesses').send({ businessName: 'Toko A' });
    expect(res.status).toBe(401);
  });
  it('GET /api/v1/businesses without auth → 401', async () => {
    const token = 'Bearer fake';
    const res = await request(app).get('/api/v1/businesses').set('Authorization', token);
    expect(res.status).toBe(401);
  });
});
