const request = require('supertest');

test('serverless entry serves the API health check', async () => {
  const handler = require('../../api/index');
  const res = await request(handler).get('/api/v1/health');
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});
