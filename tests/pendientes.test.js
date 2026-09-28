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

async function seedPendiente() {
  const curso = cursoActual();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query("DELETE FROM guardia_creada WHERE id_profesor_pendiente IS NOT NULL");
    await conn.query('DELETE FROM profesor_pendiente_login');

    const [ins] = await conn.query(
      "INSERT INTO profesor_pendiente_login (nombre_normalizado, nombre_original) VALUES ('GARCIA LOPEZ PEDRO', 'García López, Pedro')"
    );
    pendienteId = ins.insertId;

    await conn.query(
      `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_profesor_pendiente, id_edificio, origen) VALUES
        (1, '1a hora (08:30-09:20)', ?, ?, 1, 'EXCEL'),
        (3, '4a hora (11:45-12:35)', ?, ?, 1, 'EXCEL')`,
      [curso, pendienteId, curso, pendienteId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function seedPlazaParaReasignar() {
  const curso = cursoActual();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "DELETE FROM guardia_creada WHERE id_plaza_pendiente IS NOT NULL AND curso_escolar = ?",
      [curso]
    );
    await conn.query('DELETE FROM plaza_pendiente WHERE curso = ?', [curso]);

    const [ins] = await conn.query(
      "INSERT INTO plaza_pendiente (codigo, curso) VALUES ('TEST1', ?)",
      [curso]
    );
    plazaId = ins.insertId;

    await conn.query(
      `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_plaza_pendiente, id_edificio, origen) VALUES
        (2, '2a hora (09:25-10:15)', ?, ?, 1, 'EXCEL')`,
      [curso, plazaId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function limpiar() {
  const curso = cursoActual();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM guardia_creada WHERE id_profesor_pendiente IS NOT NULL");
    await conn.query('DELETE FROM profesor_pendiente_login');

    // Revert TEST1 plaza if assigned, then delete all test plazas
    const [testPlazas] = await conn.query(
      "SELECT id, id_usuario FROM plaza_pendiente WHERE curso = ? AND codigo = 'TEST1' AND id_usuario IS NOT NULL",
      [curso]
    );
    for (const pp of testPlazas) {
      await conn.query(
        `UPDATE guardia_creada SET id_plaza_pendiente = ?, id_usuario = NULL
         WHERE id_usuario = ? AND origen = 'EXCEL' AND curso_escolar = ? AND id_plaza_pendiente IS NULL`,
        [pp.id, pp.id_usuario, curso]
      );
    }

    await conn.query("DELETE FROM guardia_creada WHERE id_plaza_pendiente IS NOT NULL AND curso_escolar = ?", [curso]);
    await conn.query("DELETE FROM plaza_pendiente WHERE curso = ? AND codigo = 'TEST1'", [curso]);
    await conn.query('DELETE FROM alias_profesor WHERE nombre_normalizado = ?', ['GARCIA LOPEZ PEDRO']);
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
    const p = datos.find(d => d.nombre_normalizado === 'GARCIA LOPEZ PEDRO');
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
      "SELECT id_usuario FROM alias_profesor WHERE nombre_normalizado = 'GARCIA LOPEZ PEDRO'"
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
});

describe('POST /api/v1/usuarios/:id/reasignar-plaza', () => {
  before(seedPlazaParaReasignar);

  it('asigna plaza libre al usuario 1, transfiere 1 guardia y notifica (H3)', async () => {
    await pool.query(
      "DELETE FROM notificacion WHERE tipo = 'GUARDIA_REASIGNADA' AND id_usuario = 1 AND referencia_tipo = 'plaza_pendiente'"
    );

    const res = await request(app)
      .post('/api/v1/usuarios/1/reasignar-plaza')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id_plaza: plazaId })
      .expect(200);

    assert.equal(res.body.datos.codigo, 'TEST1');
    assert.equal(res.body.datos.guardiasTransferidas, 1);

    const [[notif]] = await pool.query(
      "SELECT mensaje FROM notificacion WHERE tipo = 'GUARDIA_REASIGNADA' AND id_usuario = 1 AND referencia_tipo = 'plaza_pendiente' ORDER BY id_notificacion DESC LIMIT 1"
    );
    assert.ok(notif, 'Debería existir notificación para el profesor');
    assert.ok(notif.mensaje.includes('TEST1'), 'El mensaje debería mencionar el código de plaza');
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
