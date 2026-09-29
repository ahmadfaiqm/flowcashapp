jest.mock('../src/config/database', () => ({
  businessMember: { findFirst: jest.fn() },
  businessProfile: { update: jest.fn() },
}));
jest.mock('cloudinary', () => ({
  v2: { config: jest.fn(), uploader: { upload_stream: jest.fn(), destroy: jest.fn() } },
}));
const request = require('supertest');
const app = require('../src/app');

function authHeader() {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ sub: '1', email: 'a@b.c' }, require('../src/config/env').JWT_SECRET);
  return `Bearer ${token}`;
}

describe('logo upload validation', () => {
  it('rejects non-image files with 400', async () => {
    const res = await request(app)
      .post('/api/v1/businesses/1/logo')
      .set('Authorization', authHeader())
      .attach('logo', Buffer.from('not-an-image'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });
});
