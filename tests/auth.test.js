const request = require('supertest');
const app = require('../server');

describe('Auth endpoints', () => {
  it('GET /api/v1/auth/me sin cookie debe responder 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/logout sin cookie debe responder 401', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});
