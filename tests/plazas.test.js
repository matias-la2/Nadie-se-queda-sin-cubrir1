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

let plazaId;

async function restaurarSeedPlazas() {
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
      "INSERT INTO plaza_pendiente (codigo, curso) VALUES ('SIF1', ?)",
      [curso]
    );
    plazaId = ins.insertId;

    await conn.query(
      `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_plaza_pendiente, id_edificio, origen) VALUES
        (1, '1a hora (08:30-09:20)', ?, ?, 1, 'EXCEL'),
        (2, '3a hora (10:20-11:10)', ?, ?, 1, 'EXCEL'),
        (4, '5a hora (12:40-13:30)', ?, ?, 1, 'EXCEL')`,
      [curso, plazaId, curso, plazaId, curso, plazaId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function limpiarRolProfesor(userId) {
  const [[rolProf]] = await pool.query("SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR'");
  await pool.query('DELETE FROM usuario_rol WHERE id_usuario = ? AND id_rol = ?', [userId, rolProf.id_rol]);
  await pool.query('DELETE FROM profesor WHERE id_usuario = ?', [userId]);
}

// ─── Tests ──────────────────────────────────────────────

describe('GET /api/v1/usuarios/plazas-pendientes', () => {
  before(restaurarSeedPlazas);

  it('devuelve SIF1 libre con 3 guardias', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios/plazas-pendientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const plazas = res.body.datos;
    assert.ok(Array.isArray(plazas), 'datos debería ser un array');

    const sif1 = plazas.find(p => p.codigo === 'SIF1');
    assert.ok(sif1, 'SIF1 debería estar en la lista');
    assert.equal(sif1.id_usuario, null, 'SIF1 debería estar libre');
    assert.equal(sif1.guardias, 3, 'SIF1 debería tener 3 guardias');
  });

  it('un PROFESOR no puede acceder', async () => {
    await request(app)
      .get('/api/v1/usuarios/plazas-pendientes')
      .set('Authorization', `Bearer ${profToken}`)
      .expect(403);
  });
});

describe('POST /api/v1/usuarios/:id/asignar-plaza', () => {
  before(restaurarSeedPlazas);

  it('asigna SIF1 al profesor Elena (id=1) y transfiere 3 guardias', async () => {
    const res = await request(app)
      .post('/api/v1/usuarios/1/asignar-plaza')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo: 'SIF1' })
      .expect(200);

    assert.equal(res.body.datos.codigo, 'SIF1');
    assert.equal(res.body.datos.id_usuario, 1);
    assert.equal(res.body.datos.guardiasTransferidas, 3);

    const [[plaza]] = await pool.query(
      "SELECT id_usuario FROM plaza_pendiente WHERE codigo = 'SIF1' AND curso = ?",
      [cursoActual()]
    );
    assert.equal(plaza.id_usuario, 1, 'plaza debería estar asignada a usuario 1');

    const [[{ count }]] = await pool.query(
      "SELECT COUNT(*) AS count FROM guardia_creada WHERE id_usuario = 1 AND id_plaza_pendiente = ? AND origen = 'EXCEL' AND curso_escolar = ?",
      [plazaId, cursoActual()]
    );
    assert.equal(count, 3, 'Las 3 guardias deberían pertenecer al usuario y conservar id_plaza_pendiente');
  });

  it('asignar de nuevo devuelve 409', async () => {
    await request(app)
      .post('/api/v1/usuarios/2/asignar-plaza')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo: 'SIF1' })
      .expect(409);
  });
});

describe('DELETE /api/v1/usuarios/plazas/SIF1/desvincular', () => {
  it('revierte las 3 guardias a la plaza', async () => {
    const res = await request(app)
      .delete('/api/v1/usuarios/plazas/SIF1/desvincular')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.equal(res.body.datos.codigo, 'SIF1');
    assert.equal(res.body.datos.guardiasRevertidas, 3);

    const [[plaza]] = await pool.query(
      "SELECT id_usuario FROM plaza_pendiente WHERE codigo = 'SIF1' AND curso = ?",
      [cursoActual()]
    );
    assert.equal(plaza.id_usuario, null, 'plaza debería estar libre');

    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM guardia_creada
       WHERE id_plaza_pendiente = ? AND id_usuario IS NULL AND curso_escolar = ?`,
      [plazaId, cursoActual()]
    );
    assert.equal(count, 3, 'Las 3 guardias deberían estar en la plaza');
  });
});

describe('POST asignar-plaza añade rol PROFESOR si no lo tiene', () => {
  before(async () => {
    await restaurarSeedPlazas();
    await limpiarRolProfesor(3);
  });

  it('asigna SIF1 a María (id=3, EQUIPO_DIRECTIVO sin PROFESOR) y le añade el rol', async () => {
    const res = await request(app)
      .post('/api/v1/usuarios/3/asignar-plaza')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codigo: 'SIF1' })
      .expect(200);

    assert.equal(res.body.datos.guardiasTransferidas, 3);

    const [[rolProf]] = await pool.query("SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR'");
    const [[tieneRol]] = await pool.query(
      'SELECT 1 AS e FROM usuario_rol WHERE id_usuario = 3 AND id_rol = ?',
      [rolProf.id_rol]
    );
    assert.ok(tieneRol, 'María debería tener ahora el rol PROFESOR');

    const [[esProf]] = await pool.query('SELECT 1 AS e FROM profesor WHERE id_usuario = 3');
    assert.ok(esProf, 'María debería tener fila en tabla profesor');
  });

  after(async () => {
    await restaurarSeedPlazas();
    await limpiarRolProfesor(3);
  });
});

after(async () => {
  await restaurarSeedPlazas();
  await pool.end();
});
