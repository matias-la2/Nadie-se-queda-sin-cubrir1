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
const { edificiosDeProfesor } = require('../helpers/profesor-edificios.helper');
const { edificioDeGuardias } = require('../helpers/edificio-guardias.helper');
const { cursoActual } = require('../helpers/curso.helper');

var JWT_SECRET = process.env.JWT_SECRET;
var curso = cursoActual();
var cursoAnterior = (parseInt(curso.split('-')[0]) - 1) + '-' + curso.split('-')[0];

var adminToken = jwt.sign(
  { id: 4, nombre: 'Admin', apellidos: 'Sistema IES', correo: 'admin@iesrioarba.es', roles: ['ADMINISTRADOR'] },
  JWT_SECRET,
  { expiresIn: '1h' }
);

var idESO, idBach, idEdificioCiclos, idEspacioCiclos;
var idProfESO, idProfBach, idProfAmbos, idProfAntiguo, idAusente;
var createdUserIds = [];
var createdGuardiaCreada = [];
var createdAusencias = [];
var createdAsignadas = [];

function hoyStr() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function diaSemanaHoy() {
  var d = new Date().getDay();
  return d === 0 ? 7 : d;
}

async function crearUsuarioProfesor(conn, nombre, apellidos, correo, googleId, depto) {
  var [rolProf] = await conn.query("SELECT id_rol FROM rol WHERE nombre_rol = 'PROFESOR'");
  var [res] = await conn.query(
    'INSERT INTO usuario (nombre, apellidos, correo, google_id) VALUES (?, ?, ?, ?)',
    [nombre, apellidos, correo, googleId]
  );
  var id = res.insertId;
  createdUserIds.push(id);
  await conn.query('INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)', [id, rolProf[0].id_rol]);
  await conn.query('INSERT INTO profesor (id_usuario, departamento) VALUES (?, ?)', [id, depto]);
  return id;
}

async function crearGuardia(conn, idUsuario, idEdificio, cursoEsc, tramo) {
  tramo = tramo || '1a hora (08:30-09:20)';
  var [res] = await conn.query(
    'INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_edificio) VALUES (?, ?, ?, ?, ?)',
    [diaSemanaHoy(), tramo, cursoEsc, idUsuario, idEdificio]
  );
  createdGuardiaCreada.push(res.insertId);
  return res.insertId;
}

before(async () => {
  var conn = await pool.getConnection();
  try {
    var [eso] = await conn.query(
      "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%ESO%' AND UPPER(REPLACE(nombre, ' ', '')) NOT LIKE '%CICLOS%'"
    );
    assert.ok(eso.length > 0, 'Debe existir edificio ESO');
    idESO = eso[0].id_edificio;

    var [bach] = await conn.query(
      "SELECT id_edificio FROM edificio WHERE UPPER(REPLACE(nombre, ' ', '')) LIKE '%BACHILLERATO%'"
    );
    assert.ok(bach.length > 0, 'Debe existir edificio Bachillerato');
    idBach = bach[0].id_edificio;

    var [res] = await conn.query(
      "INSERT INTO edificio (nombre, piso, id_edificio_guardias) VALUES ('CiclosPE', '2 plantas', ?)",
      [idBach]
    );
    idEdificioCiclos = res.insertId;

    var [resEsp] = await conn.query(
      "INSERT INTO espacio (nombre, estado_disponibilidad, capacidad, id_edificio) VALUES ('AulaPE Ciclos', 'DISPONIBLE', 25, ?)",
      [idEdificioCiclos]
    );
    idEspacioCiclos = resEsp.insertId;

    idProfESO = await crearUsuarioProfesor(conn, 'PETest', 'SoloESO', 'pe_eso@test.es', 'google_pe_001', 'Lengua');
    await crearGuardia(conn, idProfESO, idESO, curso);

    idProfBach = await crearUsuarioProfesor(conn, 'PETest', 'SoloBach', 'pe_bach@test.es', 'google_pe_002', 'Mates');
    await crearGuardia(conn, idProfBach, idBach, curso);

    idProfAmbos = await crearUsuarioProfesor(conn, 'PETest', 'AmbosPE', 'pe_ambos@test.es', 'google_pe_003', 'Física');
    await crearGuardia(conn, idProfAmbos, idESO, curso);
    await crearGuardia(conn, idProfAmbos, idBach, curso, '2a hora (09:25-10:15)');

    idProfAntiguo = await crearUsuarioProfesor(conn, 'PETest', 'Antiguo', 'pe_antiguo@test.es', 'google_pe_004', 'Historia');
    await crearGuardia(conn, idProfAntiguo, idESO, cursoAnterior);

    idAusente = await crearUsuarioProfesor(conn, 'PETest', 'Ausente', 'pe_ausente@test.es', 'google_pe_005', 'Arte');
  } finally {
    conn.release();
  }
});

after(async () => {
  var conn = await pool.getConnection();
  try {
    if (createdAsignadas.length > 0) {
      await conn.query('DELETE FROM guardia_asignada WHERE id_guardia_asignada IN (?)', [createdAsignadas]);
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
      await conn.query('UPDATE edificio SET id_edificio_guardias = NULL WHERE id_edificio = ?', [idEdificioCiclos]);
      await conn.query('DELETE FROM edificio WHERE id_edificio = ?', [idEdificioCiclos]);
    }
  } finally {
    conn.release();
  }
  await pool.end();
});

describe('edificiosDeProfesor (helper)', function () {
  it('profesor con guardias en ESO devuelve solo ESO', async function () {
    var eds = await edificiosDeProfesor(pool, idProfESO);
    assert.equal(eds.length, 1);
    assert.equal(eds[0].id_edificio, idESO);
  });

  it('profesor con guardias en ESO y Bach devuelve ambos', async function () {
    var eds = await edificiosDeProfesor(pool, idProfAmbos);
    assert.equal(eds.length, 2);
    var ids = eds.map(function (e) { return e.id_edificio; }).sort();
    assert.deepEqual(ids, [idESO, idBach].sort());
  });

  it('profesor con guardias solo del curso anterior no tiene edificio actual', async function () {
    var eds = await edificiosDeProfesor(pool, idProfAntiguo);
    assert.equal(eds.length, 0);
  });

  it('profesor sin guardias no tiene edificio', async function () {
    var eds = await edificiosDeProfesor(pool, idAusente);
    assert.equal(eds.length, 0);
  });
});

describe('GET /api/v1/guardias/hoy — filtro edificio sin profesor_edificio', function () {
  it('filtro por ESO devuelve al profesor de ESO', async function () {
    var res = await request(app)
      .get('/api/v1/guardias/hoy?id_edificio=' + idESO)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var disponibles = res.body.datos.disponibles;
    var encontrado = disponibles.some(function (d) { return d.id_usuario === idProfESO; });
    assert.ok(encontrado, 'SoloESO debe aparecer al filtrar por ESO');
  });

  it('filtro por ESO no devuelve al profesor solo de Bach', async function () {
    var res = await request(app)
      .get('/api/v1/guardias/hoy?id_edificio=' + idESO)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var disponibles = res.body.datos.disponibles;
    var encontrado = disponibles.some(function (d) { return d.id_usuario === idProfBach; });
    assert.ok(!encontrado, 'SoloBach NO debe aparecer al filtrar por ESO');
  });

  it('profesor con ambos edificios aparece una sola vez con los dos', async function () {
    var res = await request(app)
      .get('/api/v1/guardias/hoy')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var disponibles = res.body.datos.disponibles;
    var filas = disponibles.filter(function (d) { return d.id_usuario === idProfAmbos; });
    for (var i = 0; i < filas.length; i++) {
      assert.ok(filas[i].edificios.length === 2, 'Debe tener 2 edificios en cada fila');
      assert.ok(filas[i].edificios.includes(idESO), 'Debe incluir ESO');
      assert.ok(filas[i].edificios.includes(idBach), 'Debe incluir Bach');
    }
  });

  it('profesor del curso anterior no aparece al filtrar por ESO', async function () {
    var res = await request(app)
      .get('/api/v1/guardias/hoy?id_edificio=' + idESO)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var disponibles = res.body.datos.disponibles;
    var encontrado = disponibles.some(function (d) { return d.id_usuario === idProfAntiguo; });
    assert.ok(!encontrado, 'Antiguo NO debe aparecer al filtrar por ESO del curso actual');
  });
});

describe('GET /api/v1/usuarios/profesores — filtro edificio sin profesor_edificio', function () {
  it('filtro por ESO devuelve al profesor de ESO', async function () {
    var res = await request(app)
      .get('/api/v1/usuarios/profesores?id_edificio=' + idESO)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var profs = res.body.datos.registros;
    var encontrado = profs.some(function (p) { return p.id_usuario === idProfESO; });
    assert.ok(encontrado, 'SoloESO debe aparecer al filtrar por ESO');
  });

  it('filtro por ESO no devuelve al profesor solo de Bach', async function () {
    var res = await request(app)
      .get('/api/v1/usuarios/profesores?id_edificio=' + idESO)
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var profs = res.body.datos.registros;
    var encontrado = profs.some(function (p) { return p.id_usuario === idProfBach; });
    assert.ok(!encontrado, 'SoloBach NO debe aparecer al filtrar por ESO');
  });
});

describe('POST /api/v1/guardias/asignadas — validación edificio sin profesor_edificio', function () {
  var idAusencia;

  before(async function () {
    var conn = await pool.getConnection();
    try {
      var [res] = await conn.query(
        "INSERT INTO ausencia (tramo_horario, fecha, id_profesor, id_usuario_creador, estado) VALUES ('1a hora (08:30-09:20)', ?, ?, 4, 'SIN_CUBRIR')",
        [hoyStr(), idAusente]
      );
      idAusencia = res.insertId;
      createdAusencias.push(idAusencia);
      await conn.query(
        'INSERT INTO ausencia_espacio (id_ausencia, id_espacio) VALUES (?, ?)',
        [idAusencia, idEspacioCiclos]
      );
    } finally {
      conn.release();
    }
  });

  it('ausencia en Ciclos + sustituto con guardias en Bach → acepta (delegación)', async function () {
    var res = await request(app)
      .post('/api/v1/guardias/asignadas')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        fecha: hoyStr(),
        tramo_horario: '1a hora (08:30-09:20)',
        tipo_asignacion: 'AUTOMATICA',
        id_ausencia: idAusencia,
        id_profesor_sustituto: idProfBach
      })
      .expect(201);
    assert.ok(res.body.ok);
    createdAsignadas.push(res.body.datos.id);
  });

  it('ausencia en Ciclos + sustituto solo con guardias en ESO → 400', async function () {
    var res = await request(app)
      .post('/api/v1/guardias/asignadas')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        fecha: hoyStr(),
        tramo_horario: '2a hora (09:25-10:15)',
        tipo_asignacion: 'AUTOMATICA',
        id_ausencia: idAusencia,
        id_profesor_sustituto: idProfESO
      })
      .expect(400);
    assert.ok(res.body.mensaje.includes('no pertenece al edificio'));
  });
});
