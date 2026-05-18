const request = require('supertest');
const app = require('../server');

describe('Guardias endpoints', () => {
  it('GET /api/v1/guardias/hoy sin auth debe responder 401', async () => {
    const res = await request(app).get('/api/v1/guardias/hoy');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/guardias/creadas sin auth debe responder 401', async () => {
    const res = await request(app).get('/api/v1/guardias/creadas');
    expect(res.status).toBe(401);
  });
});
