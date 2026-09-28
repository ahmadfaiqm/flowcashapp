const request = require('supertest');
const app = require('../src/app');

describe('Auth module', () => {
  it('POST /api/v1/auth/register invalid returns 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'bad' });
    expect(res.status).toBe(400);
  });
  it('GET /api/v1/auth/me without token returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
