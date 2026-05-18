const request = require('supertest');
const app = require('../server');

describe('Reservas endpoints', () => {
  it('GET /api/v1/reservas sin auth debe responder 401', async () => {
    const res = await request(app).get('/api/v1/reservas');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/reservas sin auth debe responder 401', async () => {
    const res = await request(app)
      .post('/api/v1/reservas')
      .send({ fecha: '2026-06-01', tramo_horario: '08:25-09:20', id_espacio: 1 });
    expect(res.status).toBe(401);
  });
});
