const request = require('supertest');
const app = require('../src/app');

describe('GET /api/v1/health', () => {
  it('responds 200 with success:true', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
