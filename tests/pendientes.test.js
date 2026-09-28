'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DB_HOST = 'localhost';

const request = require('supertest');
const app = require('../server');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;
const PENDIENTE_MARKER = 'GARCIA LOPEZ PEDRO';
const PLAZA_MARKER = 'TEST1';

function cursoActual() {
  const ahora = new Date();
  const anio = ahora.getMonth() >= 8 ? ahora.getFullYear() : ahora.getFullYear() - 1;
  return `${anio}-${anio + 1}`;
}

const adminToken = jwt.sign(
  { id: 4, nombre: 'Admin', apellidos: 'Sistema IES', correo: 'admin@iesrioarba.es', roles: ['ADMINISTRADOR'] },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const profToken = jwt.sign(
  { id: 1, nombre: 'Elena', apellidos: 'García Martínez', correo: 'elena@iesrioarba.es', roles: ['PROFESOR'] },
  JWT_SECRET,
  { expiresIn: '1h' }
);

let pendienteId;
let plazaId;
const trackedGuardiaIds = [];
const trackedOwnGuardiaIds = [];

async function cleanupPendienteData(conn) {
  if (trackedGuardiaIds.length > 0) {
    await conn.query('DELETE FROM guardia_creada WHERE id_guardia_creada IN (?)', [[...trackedGuardiaIds]]);
    trackedGuardiaIds.length = 0;
  }
  const [existing] = await conn.query(
    'SELECT id FROM profesor_pendiente_login WHERE nombre_normalizado = ?', [PENDIENTE_MARKER]
  );
  if (existing.length > 0) {
    const ids = existing.map(r => r.id);
    await conn.query('DELETE FROM guardia_creada WHERE id_profesor_pendiente IN (?)', [ids]);
  }
  await conn.query('DELETE FROM profesor_pendiente_login WHERE nombre_normalizado = ?', [PENDIENTE_MARKER]);
  await conn.query('DELETE FROM alias_profesor WHERE nombre_normalizado = ?', [PENDIENTE_MARKER]);
}

async function cleanupPlazaData(conn) {
  const curso = cursoActual();
  if (trackedOwnGuardiaIds.length > 0) {
    await conn.query('DELETE FROM guardia_creada WHERE id_guardia_creada IN (?)', [[...trackedOwnGuardiaIds]]);
    trackedOwnGuardiaIds.length = 0;
  }
  const [plazas] = await conn.query(
    'SELECT id FROM plaza_pendiente WHERE codigo = ? AND curso = ?', [PLAZA_MARKER, curso]
  );
  if (plazas.length > 0) {
    const ids = plazas.map(p => p.id);
    await conn.query('DELETE FROM guardia_creada WHERE id_plaza_pendiente IN (?)', [ids]);
    await conn.query('DELETE FROM plaza_pendiente WHERE id IN (?)', [ids]);
  }
}

async function seedPendiente() {
  const curso = cursoActual();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await cleanupPendienteData(conn);

    const [ins] = await conn.query(
      "INSERT INTO profesor_pendiente_login (nombre_normalizado, nombre_original) VALUES (?, 'García López, Pedro')",
      [PENDIENTE_MARKER]
    );
    pendienteId = ins.insertId;

    const [g1] = await conn.query(
      `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_profesor_pendiente, id_edificio, origen)
       VALUES (1, '1a hora (08:30-09:20)', ?, ?, 1, 'EXCEL')`,
      [curso, pendienteId]
    );
    trackedGuardiaIds.push(g1.insertId);

    const [g2] = await conn.query(
      `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_profesor_pendiente, id_edificio, origen)
       VALUES (3, '4a hora (11:45-12:35)', ?, ?, 1, 'EXCEL')`,
      [curso, pendienteId]
    );
    trackedGuardiaIds.push(g2.insertId);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function seedPlazaConPropias() {
  const curso = cursoActual();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await cleanupPlazaData(conn);

    const [ins] = await conn.query(
      'INSERT INTO plaza_pendiente (codigo, curso) VALUES (?, ?)',
      [PLAZA_MARKER, curso]
    );
    plazaId = ins.insertId;

    await conn.query(
      `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_plaza_pendiente, id_edificio, origen)
       VALUES (2, '2a hora (09:25-10:15)', ?, ?, 1, 'EXCEL')`,
      [curso, plazaId]
    );

    const [own1] = await conn.query(
      `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_edificio, origen)
       VALUES (4, '5a hora (13:15-14:05)', ?, 1, 1, 'EXCEL')`,
      [curso]
    );
    trackedOwnGuardiaIds.push(own1.insertId);

    const [own2] = await conn.query(
      `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_edificio, origen)
       VALUES (5, '6a hora (14:10-15:00)', ?, 1, 1, 'EXCEL')`,
      [curso]
    );
    trackedOwnGuardiaIds.push(own2.insertId);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function limpiar() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await cleanupPendienteData(conn);
    await cleanupPlazaData(conn);
    await conn.query(
      "DELETE FROM notificacion WHERE tipo = 'GUARDIA_REASIGNADA' AND referencia_tipo = 'plaza_pendiente' AND id_usuario IN (1, 2)"
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ─── Tests ──────────────────────────────────────────────

describe('GET /api/v1/usuarios/pendientes-login', () => {
  before(seedPendiente);

  it('devuelve la lista de pendientes con conteo de guardias', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios/pendientes-login')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const datos = res.body.datos;
    assert.ok(Array.isArray(datos));
    const p = datos.find(d => d.nombre_normalizado === PENDIENTE_MARKER);
    assert.ok(p, 'Debería contener el pendiente insertado');
    assert.equal(p.guardias, 2);
  });

  it('un PROFESOR no puede acceder', async () => {
    await request(app)
      .get('/api/v1/usuarios/pendientes-login')
      .set('Authorization', `Bearer ${profToken}`)
      .expect(403);
  });
});

describe('POST /api/v1/usuarios/:id/asignar-pendiente', () => {
  before(seedPendiente);

  it('asigna el pendiente al usuario 2 y transfiere 2 guardias', async () => {
    const res = await request(app)
      .post('/api/v1/usuarios/2/asignar-pendiente')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_pendiente: pendienteId })
      .expect(200);

    assert.equal(res.body.datos.guardiasTransferidas, 2);
    assert.equal(res.body.datos.id_usuario, 2);

    const [[{ count }]] = await pool.query(
      "SELECT COUNT(*) AS count FROM guardia_creada WHERE id_usuario = 2 AND origen = 'EXCEL' AND curso_escolar = ?",
      [cursoActual()]
    );
    assert.ok(count >= 2, 'El usuario debería tener al menos 2 guardias');

    const [[pendiente]] = await pool.query(
      'SELECT COUNT(*) AS c FROM profesor_pendiente_login WHERE id = ?',
      [pendienteId]
    );
    assert.equal(pendiente.c, 0, 'El pendiente debería haberse eliminado');

    const [[alias]] = await pool.query(
      'SELECT id_usuario FROM alias_profesor WHERE nombre_normalizado = ?',
      [PENDIENTE_MARKER]
    );
    assert.equal(alias.id_usuario, 2, 'Debería haberse creado el alias');
  });

  it('pendiente inexistente devuelve 404', async () => {
    await request(app)
      .post('/api/v1/usuarios/2/asignar-pendiente')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_pendiente: 999999 })
      .expect(404);
  });

  it('un PROFESOR no puede asignar pendientes', async () => {
    await request(app)
      .post('/api/v1/usuarios/2/asignar-pendiente')
      .set('Authorization', `Bearer ${profToken}`)
      .send({ id_pendiente: 1 })
      .expect(403);
  });
});

describe('DELETE /api/v1/usuarios/pendientes-login/:id', () => {
  before(seedPendiente);

  it('elimina el pendiente y sus guardias', async () => {
    const res = await request(app)
      .delete(`/api/v1/usuarios/pendientes-login/${pendienteId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.equal(res.body.datos.guardiasEliminadas, 2);

    const [[{ c }]] = await pool.query(
      'SELECT COUNT(*) AS c FROM profesor_pendiente_login WHERE id = ?',
      [pendienteId]
    );
    assert.equal(c, 0);
  });

  it('pendiente inexistente devuelve 404', async () => {
    await request(app)
      .delete('/api/v1/usuarios/pendientes-login/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('un PROFESOR no puede eliminar pendientes', async () => {
    await request(app)
      .delete('/api/v1/usuarios/pendientes-login/999999')
      .set('Authorization', `Bearer ${profToken}`)
      .expect(403);
  });
});

describe('POST /api/v1/usuarios/:id/reasignar-plaza', () => {
  before(seedPlazaConPropias);

  it('asigna plaza libre al usuario 1, transfiere 1 guardia y notifica (H3)', async () => {
    await pool.query(
      "DELETE FROM notificacion WHERE tipo = 'GUARDIA_REASIGNADA' AND id_usuario = 1 AND referencia_tipo = 'plaza_pendiente'"
    );

    const res = await request(app)
      .post('/api/v1/usuarios/1/reasignar-plaza')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_plaza: plazaId })
      .expect(200);

    assert.equal(res.body.datos.codigo, PLAZA_MARKER);
    assert.equal(res.body.datos.guardiasTransferidas, 1);

    const [[notif]] = await pool.query(
      "SELECT mensaje FROM notificacion WHERE tipo = 'GUARDIA_REASIGNADA' AND id_usuario = 1 AND referencia_tipo = 'plaza_pendiente' ORDER BY id_notificacion DESC LIMIT 1"
    );
    assert.ok(notif, 'Debería existir notificación para el profesor');
    assert.ok(notif.mensaje.includes(PLAZA_MARKER), 'El mensaje debería mencionar el código de plaza');
  });

  it('reasigna la misma plaza al usuario 2 (desvincula de 1)', async () => {
    const res = await request(app)
      .post('/api/v1/usuarios/2/reasignar-plaza')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_plaza: plazaId })
      .expect(200);

    assert.equal(res.body.datos.id_usuario, 2);

    const [[plaza]] = await pool.query(
      'SELECT id_usuario FROM plaza_pendiente WHERE id = ?',
      [plazaId]
    );
    assert.equal(plaza.id_usuario, 2);
  });

  it('el usuario 1 conserva sus guardias propias tras la reasignación', async () => {
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM guardia_creada WHERE id_guardia_creada IN (?) AND id_usuario = 1',
      [trackedOwnGuardiaIds]
    );
    assert.equal(count, 2, 'Las 2 guardias propias del usuario 1 deben permanecer');
  });

  it('un PROFESOR no puede reasignar plazas', async () => {
    await request(app)
      .post('/api/v1/usuarios/1/reasignar-plaza')
      .set('Authorization', `Bearer ${profToken}`)
      .send({ id_plaza: 1 })
      .expect(403);
  });
});

describe('Desvincular solo devuelve guardias de esa plaza', () => {
  before(seedPlazaConPropias);

  it('asigna plaza al usuario 1, desvincula, y conserva guardias propias', async () => {
    await request(app)
      .post('/api/v1/usuarios/1/reasignar-plaza')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_plaza: plazaId })
      .expect(200);

    const [[{ totalBefore }]] = await pool.query(
      "SELECT COUNT(*) AS totalBefore FROM guardia_creada WHERE id_usuario = 1 AND origen = 'EXCEL' AND curso_escolar = ?",
      [cursoActual()]
    );
    assert.ok(totalBefore >= 3, 'Usuario 1 debería tener al menos 3 guardias (1 plaza + 2 propias)');

    const res = await request(app)
      .delete(`/api/v1/usuarios/plazas/${PLAZA_MARKER}/desvincular`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.equal(res.body.datos.guardiasRevertidas, 1, 'Solo 1 guardia de plaza debería revertirse');

    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM guardia_creada WHERE id_guardia_creada IN (?) AND id_usuario = 1',
      [trackedOwnGuardiaIds]
    );
    assert.equal(count, 2, 'Las 2 guardias propias del usuario 1 deben permanecer');

    const [[{ plazaCount }]] = await pool.query(
      'SELECT COUNT(*) AS plazaCount FROM guardia_creada WHERE id_plaza_pendiente = ? AND id_usuario IS NULL',
      [plazaId]
    );
    assert.equal(plazaCount, 1, 'La guardia de plaza debería volver a la plaza');
  });
});

describe('GET /api/v1/usuarios?sin_guardias=true', () => {
  it('devuelve usuarios sin guardias en el curso actual', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios?sin_guardias=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const registros = res.body.datos.registros;
    assert.ok(Array.isArray(registros));
    for (const u of registros) {
      const [[{ count }]] = await pool.query(
        'SELECT COUNT(*) AS count FROM guardia_creada WHERE id_usuario = ? AND curso_escolar = ?',
        [u.id_usuario, cursoActual()]
      );
      assert.equal(count, 0, `Usuario ${u.id_usuario} no debería tener guardias`);
    }
  });
});

after(async () => {
  await limpiar();
  await pool.end();
});
