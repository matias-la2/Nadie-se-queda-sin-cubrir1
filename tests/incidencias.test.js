const request = require('supertest');
const app = require('../server');

describe('Incidencias endpoints', () => {
  it('GET /api/v1/incidencias sin auth debe responder 401', async () => {
    const res = await request(app).get('/api/v1/incidencias');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/incidencias sin auth debe responder 401', async () => {
    const res = await request(app)
      .post('/api/v1/incidencias')
      .send({ titulo: 'Test', tipo: 'MATERIAL' });
    expect(res.status).toBe(401);
  });
});
