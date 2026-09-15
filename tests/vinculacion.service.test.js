'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DB_HOST = 'localhost';

const pool = require('../config/db');
const { vincularNuevoUsuario } = require('../services/vinculacion.service');

const TEST_CORREO_SUFFIX = '@test.vinculacion.es';

async function limpiarTestVinculacion() {
  const [testUsers] = await pool.query(
    'SELECT id_usuario FROM usuario WHERE correo LIKE ?',
    [`%${TEST_CORREO_SUFFIX}`]
  );
  const ids = testUsers.map(u => u.id_usuario);

  if (ids.length > 0) {
    await pool.query('DELETE FROM guardia_creada WHERE id_usuario IN (?)', [ids]);
    await pool.query('DELETE FROM alias_profesor WHERE id_usuario IN (?)', [ids]);
    await pool.query('DELETE FROM usuario WHERE id_usuario IN (?)', [ids]);
  }

  await pool.query("DELETE FROM notificacion WHERE tipo = 'PLAZA_SIN_ASIGNAR'");
  await pool.query("DELETE FROM guardia_creada WHERE origen = 'EXCEL' AND id_profesor_pendiente IS NOT NULL");
  await pool.query('DELETE FROM profesor_pendiente_login');
}

async function insertarPendienteAmaya() {
  await pool.query(
    "INSERT INTO profesor_pendiente_login (nombre_normalizado, nombre_original) VALUES ('DARIO JACINTO ESTANDARINA', 'DARIO JACINTO ESTANDARINA')"
  );
  const [[{ id }]] = await pool.query(
    "SELECT id FROM profesor_pendiente_login WHERE nombre_normalizado = 'DARIO JACINTO ESTANDARINA'"
  );
  await pool.query(
    `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_profesor_pendiente, id_edificio, origen)
     VALUES (3, '2a hora (09:25-10:15)', '2026-2027', ?, 2, 'EXCEL'),
            (5, '4a hora (11:45-12:35)', '2026-2027', ?, 2, 'EXCEL')`,
    [id, id]
  );
  return id;
}

async function crearUsuarioTest(nombre, apellidos, correo, googleId) {
  const [result] = await pool.query(
    'INSERT INTO usuario (nombre, apellidos, correo, google_id) VALUES (?, ?, ?, ?)',
    [nombre, apellidos, correo, googleId]
  );
  const userId = result.insertId;
  const [[{ id_rol }]] = await pool.query("SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR'");
  await pool.query('INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)', [userId, id_rol]);
  await pool.query('INSERT IGNORE INTO profesor (id_usuario) VALUES (?)', [userId]);
  return userId;
}

// ─── Tests ──────────────────────────────────────────────

describe('vincularNuevoUsuario — coincidencia con pendiente', () => {
  before(async () => {
    await limpiarTestVinculacion();
    await insertarPendienteAmaya();
  });

  it('vincula usuario cuyo nombre coincide con pendiente DARIO y hereda 2 guardias', async () => {
    const userId = await crearUsuarioTest(
      'Dario', 'Jacinto Estandarina',
      `dario${TEST_CORREO_SUFFIX}`, 'google_test_amaya'
    );

    const conn = await pool.getConnection();
    try {
      const result = await vincularNuevoUsuario(conn, {
        id: userId,
        nombre: 'Dario',
        apellidos: 'Jacinto Estandarina',
        correo: `dario${TEST_CORREO_SUFFIX}`,
      });

      assert.equal(result.vinculado, true);

      const [[{ count }]] = await pool.query(
        'SELECT COUNT(*) AS count FROM guardia_creada WHERE id_usuario = ? AND id_profesor_pendiente IS NULL',
        [userId]
      );
      assert.equal(count, 2, 'DARIO debería tener 2 guardias transferidas');

      const [pendiente] = await pool.query(
        "SELECT id FROM profesor_pendiente_login WHERE nombre_normalizado = 'DARIO JACINTO ESTANDARINA'"
      );
      assert.equal(pendiente.length, 0, 'El pendiente debería haber sido eliminado');

      const [[alias]] = await pool.query(
        "SELECT id_usuario FROM alias_profesor WHERE nombre_normalizado = 'DARIO JACINTO ESTANDARINA'"
      );
      assert.equal(alias.id_usuario, userId, 'Debería existir un alias apuntando al usuario');
    } finally {
      conn.release();
    }
  });
});

describe('vincularNuevoUsuario — sin coincidencia genera notificaciones', () => {
  before(async () => {
    await limpiarTestVinculacion();
  });

  it('genera notificaciones PLAZA_SIN_ASIGNAR para directivos y admins', async () => {
    const userId = await crearUsuarioTest(
      'Nuevo', 'Profesor Desconocido',
      `nuevo${TEST_CORREO_SUFFIX}`, 'google_test_nuevo'
    );

    const conn = await pool.getConnection();
    try {
      const result = await vincularNuevoUsuario(conn, {
        id: userId,
        nombre: 'Nuevo',
        apellidos: 'Profesor Desconocido',
        correo: `nuevo${TEST_CORREO_SUFFIX}`,
      });

      assert.equal(result.vinculado, false);
      assert.ok(result.notificados >= 3, `Debería notificar al menos a 3 directivos/admins, notificó a ${result.notificados}`);

      const [notifs] = await pool.query(
        "SELECT * FROM notificacion WHERE tipo = 'PLAZA_SIN_ASIGNAR' AND referencia_id = ?",
        [userId]
      );
      assert.ok(notifs.length >= 3, `Debería haber al menos 3 notificaciones, hay ${notifs.length}`);
      assert.ok(notifs[0].mensaje.includes('Nuevo Profesor Desconocido'));
      assert.ok(notifs[0].mensaje.includes('no tiene guardias asignadas'));
    } finally {
      conn.release();
    }
  });
});

after(async () => {
  await limpiarTestVinculacion();
  await pool.end();
});
