const request = require('supertest');
const app = require('../server');

describe('GET /api/v1/health', () => {
  it('debe responder con status 200 y ok true', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
