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
const { edificioDeGuardias } = require('../helpers/edificio-guardias.helper');
const { buscarCandidatos } = require('../controllers/guardias.controller');
const { cursoActual } = require('../helpers/curso.helper');

var JWT_SECRET = process.env.JWT_SECRET;
var curso = cursoActual();

var adminToken = jwt.sign(
  { id: 4, nombre: 'Admin', apellidos: 'Sistema IES', correo: 'admin@iesrioarba.es', roles: ['ADMINISTRADOR'] },
  JWT_SECRET,
  { expiresIn: '1h' }
);

var idBach;
var idEdificioCiclos, idEspacioCiclos;
var idProfesorBach, idGuardiaBach;
var idAusenteCiclos;
var idTestEdA, idTestEdB, idTestEdC;
var createdUserIds = [];
var createdGuardiaCreada = [];

function proximoLunes() {
  var d = new Date();
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

async function limpiar() {
  var conn = await pool.getConnection();
  try {
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
    var buildingIds = [idTestEdC, idTestEdB, idTestEdA, idEdificioCiclos].filter(Boolean);
    if (buildingIds.length > 0) {
      await conn.query('UPDATE edificio SET id_edificio_guardias = NULL WHERE id_edificio IN (?)', [buildingIds]);
      await conn.query('DELETE FROM edificio WHERE id_edificio IN (?)', [buildingIds]);
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
    assert.ok(bach.length > 0, 'Debe existir edificio Bachillerato en el seed');
    idBach = bach[0].id_edificio;

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

    var [rolProf] = await conn.query("SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR'");

    var [resUser] = await conn.query(
      "INSERT INTO usuario (nombre, apellidos, correo, google_id) VALUES ('Test', 'Profesor Bach', 'testbacheg@test.es', 'google_test_eg_001')"
    );
    idProfesorBach = resUser.insertId;
    createdUserIds.push(idProfesorBach);
    await conn.query('INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)', [idProfesorBach, rolProf[0].id_rol]);
    await conn.query('INSERT INTO profesor (id_usuario, departamento) VALUES (?, ?)', [idProfesorBach, 'Informática']);

    var [resGc] = await conn.query(
      "INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_edificio) VALUES (1, '1a hora (08:30-09:20)', ?, ?, ?)",
      [curso, idProfesorBach, idBach]
    );
    idGuardiaBach = resGc.insertId;
    createdGuardiaCreada.push(idGuardiaBach);

    var [resAus] = await conn.query(
      "INSERT INTO usuario (nombre, apellidos, correo, google_id) VALUES ('Test', 'Ausente Ciclos', 'testausenteciclos@test.es', 'google_test_eg_002')"
    );
    idAusenteCiclos = resAus.insertId;
    createdUserIds.push(idAusenteCiclos);
    await conn.query('INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)', [idAusenteCiclos, rolProf[0].id_rol]);
    await conn.query('INSERT INTO profesor (id_usuario, departamento) VALUES (?, ?)', [idAusenteCiclos, 'Mecánica']);

    var [resA] = await conn.query("INSERT INTO edificio (nombre, piso) VALUES ('TestEdA', '1')");
    idTestEdA = resA.insertId;
    var [resB] = await conn.query("INSERT INTO edificio (nombre, piso) VALUES ('TestEdB', '1')");
    idTestEdB = resB.insertId;
    var [resC] = await conn.query("INSERT INTO edificio (nombre, piso, id_edificio_guardias) VALUES ('TestEdC', '1', ?)", [idTestEdA]);
    idTestEdC = resC.insertId;
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
      assert.equal(result, idBach);
    } finally {
      conn.release();
    }
  });

  it('devuelve el propio id cuando id_edificio_guardias es NULL', async function () {
    var conn = await pool.getConnection();
    try {
      var result = await edificioDeGuardias(conn, idBach);
      assert.equal(result, idBach);
    } finally {
      conn.release();
    }
  });

  it('devuelve null para entrada null', async function () {
    var conn = await pool.getConnection();
    try {
      var result = await edificioDeGuardias(conn, null);
      assert.equal(result, null);
    } finally {
      conn.release();
    }
  });
});

describe('buscarCandidatos con edificioDeGuardias', function () {
  it('Ciclos → Bachillerato: encuentra al profesor de Bach', async function () {
    var conn = await pool.getConnection();
    try {
      var idEdificio = await edificioDeGuardias(conn, idEdificioCiclos);
      assert.equal(idEdificio, idBach);

      var fecha = proximoLunes();
      var candidatos = await buscarCandidatos(conn, 1, fecha, '1a hora (08:30-09:20)', [idAusenteCiclos], idEdificio);
      var encontrado = candidatos.some(function (c) { return c.id_usuario === idProfesorBach; });
      assert.ok(encontrado, 'El profesor de Bach debe aparecer como candidato para ausencia en Ciclos');
    } finally {
      conn.release();
    }
  });

  it('ESO sin delegación: no encuentra al profesor solo de Bach', async function () {
    var conn = await pool.getConnection();
    try {
      var [eso] = await conn.query(
        "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%ESO%' AND UPPER(REPLACE(nombre, ' ', '')) NOT LIKE '%CICLOS%'"
      );
      assert.ok(eso.length > 0, 'Debe existir edificio ESO');

      var idEdificio = await edificioDeGuardias(conn, eso[0].id_edificio);
      assert.equal(idEdificio, eso[0].id_edificio, 'ESO no delega, devuelve su propio id');

      var fecha = proximoLunes();
      var candidatos = await buscarCandidatos(conn, 1, fecha, '1a hora (08:30-09:20)', [idAusenteCiclos], idEdificio);
      var encontrado = candidatos.some(function (c) { return c.id_usuario === idProfesorBach; });
      assert.ok(!encontrado, 'El profesor de Bach NO debe aparecer como candidato en ESO');
    } finally {
      conn.release();
    }
  });
});

describe('PUT /api/v1/espacios/edificios/:id — validaciones id_edificio_guardias', function () {
  it('400 si apunta a sí mismo', async function () {
    var res = await request(app)
      .put('/api/v1/espacios/edificios/' + idTestEdA)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ id_edificio_guardias: idTestEdA })
      .expect(400);
    assert.ok(res.body.mensaje.includes('sí mismo'));
  });

  it('400 si el edificio destino no existe', async function () {
    var res = await request(app)
      .put('/api/v1/espacios/edificios/' + idTestEdA)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ id_edificio_guardias: 999999 })
      .expect(400);
    assert.ok(res.body.mensaje.includes('no existe'));
  });

  it('400 si el edificio destino ya delega en otro (no encadenar)', async function () {
    var res = await request(app)
      .put('/api/v1/espacios/edificios/' + idTestEdB)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ id_edificio_guardias: idTestEdC })
      .expect(400);
    assert.ok(res.body.mensaje.includes('cadena'));
  });

  it('400 si otros edificios ya delegan en este', async function () {
    var res = await request(app)
      .put('/api/v1/espacios/edificios/' + idTestEdA)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ id_edificio_guardias: idTestEdB })
      .expect(400);
    assert.ok(res.body.mensaje.includes('delegan'));
  });

  it('200 para asignación válida', async function () {
    var res = await request(app)
      .put('/api/v1/espacios/edificios/' + idTestEdB)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ id_edificio_guardias: idTestEdA })
      .expect(200);
    assert.ok(res.body.ok);
  });

  it('200 para limpiar delegación con null', async function () {
    var res = await request(app)
      .put('/api/v1/espacios/edificios/' + idTestEdC)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ id_edificio_guardias: null })
      .expect(200);
    assert.ok(res.body.ok);
  });
});
