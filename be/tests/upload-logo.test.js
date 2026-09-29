process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
jest.mock('../src/config/database', () => ({
  businessMember: { findFirst: jest.fn() },
  businessProfile: { findUnique: jest.fn(), update: jest.fn() },
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

  it('uploads a png and stores the secure_url', async () => {
    const db = require('../src/config/database');
    const cloudinary = require('cloudinary').v2;
    db.businessProfile.findUnique.mockResolvedValue({ id: 1 });
    db.businessMember.findFirst.mockResolvedValue({ role: 'owner' });
    db.businessProfile.update.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    cloudinary.uploader.upload_stream.mockImplementation((opts, cb) => {
      const { Writable } = require('stream');
      const sink = new Writable({ write(chunk, enc, done) { done(); } });
      sink.on('finish', () => cb(null, { secure_url: 'https://res.cloudinary.com/x/logo.png' }));
      return sink;
    });
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const res = await request(app)
      .post('/api/v1/businesses/1/logo')
      .set('Authorization', authHeader())
      .attach('logo', png, { filename: 'logo.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.data.logoUrl).toBe('https://res.cloudinary.com/x/logo.png');
  });

  it('removes the logo and clears the column', async () => {
    const db = require('../src/config/database');
    const cloudinary = require('cloudinary').v2;
    db.businessProfile.findUnique.mockResolvedValue({ id: 1 });
    db.businessMember.findFirst.mockResolvedValue({ role: 'owner' });
    db.businessProfile.update.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
    const res = await request(app)
      .delete('/api/v1/businesses/1/logo')
      .set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.logoUrl).toBeNull();
  });
});
