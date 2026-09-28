'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.DB_HOST = 'localhost';

const pool = require('../config/db');
const { edificioDeGuardias } = require('../helpers/edificio-guardias.helper');
const { cursoActual, inicioCursoActual } = require('../helpers/curso.helper');

const curso = cursoActual();

var idEdificioCiclos;
var idEspacioCiclos;
var idProfesorBach;
var idGuardiaBach;
var idAusenciaCiclos;

var createdUserIds = [];
var createdGuardiaCreada = [];
var createdGuardiaAsignada = [];
var createdAusencias = [];

async function limpiar() {
  var conn = await pool.getConnection();
  try {
    if (createdGuardiaAsignada.length > 0) {
      await conn.query('DELETE FROM notificacion WHERE referencia_id IN (?) AND referencia_tipo = ?', [createdGuardiaAsignada, 'guardia_asignada']);
      await conn.query('DELETE FROM guardia_asignada WHERE id_guardia_asignada IN (?)', [createdGuardiaAsignada]);
    }
    if (createdAusencias.length > 0) {
      await conn.query('DELETE FROM ausencia_espacio WHERE id_ausencia IN (?)', [createdAusencias]);
      await conn.query('DELETE FROM ausencia WHERE id_ausencia IN (?)', [createdAusencias]);
    }
    if (createdGuardiaCreada.length > 0) {
      await conn.query('DELETE FROM guardia_creada WHERE id_guardia_creada IN (?)', [createdGuardiaCreada]);
    }
    if (createdUserIds.length > 0) {
      await conn.query('DELETE FROM profesor_edificio WHERE id_usuario IN (?)', [createdUserIds]);
      await conn.query('DELETE FROM profesor WHERE id_usuario IN (?)', [createdUserIds]);
      await conn.query('DELETE FROM usuario_rol WHERE id_usuario IN (?)', [createdUserIds]);
      await conn.query('DELETE FROM usuario WHERE id_usuario IN (?)', [createdUserIds]);
    }
    if (idEspacioCiclos) {
      await conn.query('DELETE FROM espacio WHERE id_espacio = ?', [idEspacioCiclos]);
    }
    if (idEdificioCiclos) {
      await conn.query('DELETE FROM edificio WHERE id_edificio = ?', [idEdificioCiclos]);
    }
  } finally {
    conn.release();
  }
}

before(async () => {
  var conn = await pool.getConnection();
  try {
    var [bach] = await conn.query(
      "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%BACHILLERATO%'"
    );
    assert.ok(bach.length > 0, 'Debe existir un edificio Bachillerato en el seed');
    var idBach = bach[0].id_edificio;

    var [res] = await conn.query(
      "INSERT INTO edificio (nombre, piso, id_edificio_guardias) VALUES ('Ciclos Formativos', '3 plantas', ?)",
      [idBach]
    );
    idEdificioCiclos = res.insertId;

    var [resEsp] = await conn.query(
      "INSERT INTO espacio (nombre, estado_disponibilidad, capacidad, id_edificio) VALUES ('Taller Ciclos T1', 'DISPONIBLE', 25, ?)",
      [idEdificioCiclos]
    );
    idEspacioCiclos = resEsp.insertId;

    var [resUser] = await conn.query(
      "INSERT INTO usuario (nombre, apellidos, correo, google_id) VALUES ('Test', 'Profesor Bach', 'testbacheg@test.es', 'google_test_eg_001')"
    );
    idProfesorBach = resUser.insertId;
    createdUserIds.push(idProfesorBach);

    var [rolProf] = await conn.query("SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR'");
    await conn.query('INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)', [idProfesorBach, rolProf[0].id_rol]);
    await conn.query('INSERT INTO profesor (id_usuario, departamento) VALUES (?, ?)', [idProfesorBach, 'Informática']);
    await conn.query('INSERT INTO profesor_edificio (id_usuario, id_edificio) VALUES (?, ?)', [idProfesorBach, idBach]);

    var [resGc] = await conn.query(
      "INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_edificio) VALUES (1, '1a hora (08:30-09:20)', ?, ?, ?)",
      [curso, idProfesorBach, idBach]
    );
    idGuardiaBach = resGc.insertId;
    createdGuardiaCreada.push(idGuardiaBach);
  } finally {
    conn.release();
  }
});

after(async () => {
  await limpiar();
  await pool.end();
});

describe('edificioDeGuardias', function () {
  it('devuelve id_edificio_guardias cuando está configurado', async function () {
    var conn = await pool.getConnection();
    try {
      var result = await edificioDeGuardias(conn, idEdificioCiclos);
      var [bach] = await conn.query(
        "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%BACHILLERATO%'"
      );
      assert.equal(result, bach[0].id_edificio);
    } finally {
      conn.release();
    }
  });

  it('devuelve el propio id cuando id_edificio_guardias es NULL', async function () {
    var conn = await pool.getConnection();
    try {
      var [bach] = await conn.query(
        "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%BACHILLERATO%'"
      );
      var result = await edificioDeGuardias(conn, bach[0].id_edificio);
      assert.equal(result, bach[0].id_edificio);
    } finally {
      conn.release();
    }
  });

  it('devuelve null/undefined para entrada null/undefined', async function () {
    var conn = await pool.getConnection();
    try {
      var result = await edificioDeGuardias(conn, null);
      assert.equal(result, null);
    } finally {
      conn.release();
    }
  });
});

describe('Ausencia en Ciclos encuentra candidato de Bachillerato', function () {
  it('buscarCandidatos con edificioDeGuardias encuentra al profesor de Bach', async function () {
    var conn = await pool.getConnection();
    try {
      var proximoLunes = new Date();
      while (proximoLunes.getDay() !== 1) {
        proximoLunes.setDate(proximoLunes.getDate() + 1);
      }
      var fechaStr = proximoLunes.getFullYear() + '-' +
        String(proximoLunes.getMonth() + 1).padStart(2, '0') + '-' +
        String(proximoLunes.getDate()).padStart(2, '0');

      var [resAus] = await conn.query(
        "INSERT INTO ausencia (tramo_horario, fecha, estado, hay_tarea, id_profesor, id_usuario_creador) VALUES ('1a hora (08:30-09:20)', ?, 'PENDIENTE', 0, ?, ?)",
        [fechaStr, createdUserIds[0] || 1, createdUserIds[0] || 1]
      );

      var ausUseProf1 = false;
      if (!createdUserIds[0] || createdUserIds[0] === idProfesorBach) {
        var [resAusUser] = await conn.query(
          "INSERT INTO usuario (nombre, apellidos, correo, google_id) VALUES ('Test', 'Ausente Ciclos', 'testausenteciclos@test.es', 'google_test_eg_002')"
        );
        var ausenteId = resAusUser.insertId;
        createdUserIds.push(ausenteId);
        var [rolProf] = await conn.query("SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR'");
        await conn.query('INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)', [ausenteId, rolProf[0].id_rol]);
        await conn.query('INSERT INTO profesor (id_usuario, departamento) VALUES (?, ?)', [ausenteId, 'Mecánica']);
        await conn.query('INSERT INTO profesor_edificio (id_usuario, id_edificio) VALUES (?, ?)', [ausenteId, idEdificioCiclos]);

        await conn.query('DELETE FROM ausencia WHERE id_ausencia = ?', [resAus.insertId]);

        var [resAus2] = await conn.query(
          "INSERT INTO ausencia (tramo_horario, fecha, estado, hay_tarea, id_profesor, id_usuario_creador) VALUES ('1a hora (08:30-09:20)', ?, 'PENDIENTE', 0, ?, ?)",
          [fechaStr, ausenteId, ausenteId]
        );
        idAusenciaCiclos = resAus2.insertId;
      } else {
        idAusenciaCiclos = resAus.insertId;
      }
      createdAusencias.push(idAusenciaCiclos);

      await conn.query(
        'INSERT INTO ausencia_espacio (id_ausencia, id_espacio) VALUES (?, ?)',
        [idAusenciaCiclos, idEspacioCiclos]
      );

      var [espaciosAus] = await conn.query(
        'SELECT DISTINCT es.id_edificio FROM ausencia_espacio ae JOIN espacio es ON ae.id_espacio = es.id_espacio WHERE ae.id_ausencia = ?',
        [idAusenciaCiclos]
      );
      assert.equal(espaciosAus[0].id_edificio, idEdificioCiclos);

      var idEdBusqueda = await edificioDeGuardias(conn, espaciosAus[0].id_edificio);
      var [bach] = await conn.query(
        "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%BACHILLERATO%'"
      );
      assert.equal(idEdBusqueda, bach[0].id_edificio, 'edificioDeGuardias debe devolver Bachillerato');

      var inicioCurso = inicioCursoActual();
      var ausenteId2 = createdUserIds.length > 1 ? createdUserIds[1] : createdUserIds[0];
      var [candidatos] = await conn.query(
        `SELECT gc.id_usuario, u.nombre AS profesor_nombre
         FROM guardia_creada gc
         JOIN usuario u ON gc.id_usuario = u.id_usuario
         WHERE gc.id_usuario IS NOT NULL
         AND gc.dia_semana = 1
         AND gc.tramo_horario = '1a hora (08:30-09:20)'
         AND gc.id_usuario != ?
         AND (gc.id_edificio IS NULL OR gc.id_edificio = ?)
         AND NOT EXISTS (
           SELECT 1 FROM guardia_asignada ga2
           WHERE ga2.id_profesor_sustituto = gc.id_usuario
           AND ga2.fecha = ? AND ga2.tramo_horario = '1a hora (08:30-09:20)'
           AND ga2.estado IN ('PENDIENTE', 'ACEPTADA')
         )
         GROUP BY gc.id_usuario, u.nombre`,
        [ausenteId2, idEdBusqueda, fechaStr]
      );

      var encontrado = candidatos.some(function (c) { return c.id_usuario === idProfesorBach; });
      assert.ok(encontrado, 'El profesor de Bachillerato debe aparecer como candidato para ausencia en Ciclos');
    } finally {
      conn.release();
    }
  });
});

describe('Ausencia en ESO NO encuentra candidato solo de Bachillerato', function () {
  it('sin edificio_guardias configurado, el profesor de Bach no es candidato en ESO', async function () {
    var conn = await pool.getConnection();
    try {
      var [eso] = await conn.query(
        "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%ESO%' AND UPPER(REPLACE(nombre, ' ', '')) NOT LIKE '%CICLOS%'"
      );
      assert.ok(eso.length > 0, 'Debe existir edificio ESO');

      var edGuardias = await edificioDeGuardias(conn, eso[0].id_edificio);
      assert.equal(edGuardias, eso[0].id_edificio, 'ESO no tiene edificio_guardias, devuelve el propio');

      var [bach] = await conn.query(
        "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%BACHILLERATO%'"
      );
      assert.notEqual(edGuardias, bach[0].id_edificio, 'ESO y Bachillerato son edificios distintos');

      var proximoLunes = new Date();
      while (proximoLunes.getDay() !== 1) {
        proximoLunes.setDate(proximoLunes.getDate() + 1);
      }
      var fechaStr = proximoLunes.getFullYear() + '-' +
        String(proximoLunes.getMonth() + 1).padStart(2, '0') + '-' +
        String(proximoLunes.getDate()).padStart(2, '0');

      var [candidatos] = await conn.query(
        `SELECT gc.id_usuario
         FROM guardia_creada gc
         WHERE gc.id_usuario IS NOT NULL
         AND gc.dia_semana = 1
         AND gc.tramo_horario = '1a hora (08:30-09:20)'
         AND (gc.id_edificio IS NULL OR gc.id_edificio = ?)
         AND NOT EXISTS (
           SELECT 1 FROM guardia_asignada ga2
           WHERE ga2.id_profesor_sustituto = gc.id_usuario
           AND ga2.fecha = ? AND ga2.tramo_horario = '1a hora (08:30-09:20)'
           AND ga2.estado IN ('PENDIENTE', 'ACEPTADA')
         )
         GROUP BY gc.id_usuario`,
        [edGuardias, fechaStr]
      );

      var encontrado = candidatos.some(function (c) { return c.id_usuario === idProfesorBach; });
      assert.ok(!encontrado, 'El profesor de Bach NO debe aparecer como candidato en ESO (sin fallback)');
    } finally {
      conn.release();
    }
  });
});
