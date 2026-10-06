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
const { cursoActual, cursoSiguiente, CURSOS_ANTERIORES, CURSOS_SIGUIENTES } = require('../helpers/curso.helper');

var JWT_SECRET = process.env.JWT_SECRET;

var adminToken = jwt.sign(
  { id: 4, nombre: 'Admin', apellidos: 'Sistema IES', correo: 'admin@iesrioarba.es', roles: ['ADMINISTRADOR'] },
  JWT_SECRET,
  { expiresIn: '1h' }
);

var profToken = jwt.sign(
  { id: 1, nombre: 'Elena', apellidos: 'García', correo: 'elena@test.es', roles: ['PROFESOR'] },
  JWT_SECRET,
  { expiresIn: '1h' }
);

var createdEspacioCurso = [];
var cursoFueraRango = '2010-2011';

before(async function () {
  var conn = await pool.getConnection();
  try {
    var [espacios] = await conn.query('SELECT id_espacio FROM espacio LIMIT 1');
    if (espacios.length > 0) {
      await conn.query(
        "INSERT IGNORE INTO espacio_curso (id_espacio, curso_escolar, nombre_curso) VALUES (?, ?, 'TestAntiguo')",
        [espacios[0].id_espacio, cursoFueraRango]
      );
      createdEspacioCurso.push({ id_espacio: espacios[0].id_espacio, curso: cursoFueraRango });
    }
  } finally {
    conn.release();
  }
});

after(async function () {
  var conn = await pool.getConnection();
  try {
    for (var i = 0; i < createdEspacioCurso.length; i++) {
      await conn.query(
        'DELETE FROM espacio_curso WHERE id_espacio = ? AND curso_escolar = ?',
        [createdEspacioCurso[i].id_espacio, createdEspacioCurso[i].curso]
      );
    }
  } finally {
    conn.release();
  }
  await pool.end();
});

describe('GET /api/v1/cursos', function () {
  it('devuelve actual y siguiente correctos', async function () {
    var res = await request(app)
      .get('/api/v1/cursos')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    assert.ok(res.body.ok);
    assert.equal(res.body.datos.actual, cursoActual());
    assert.equal(res.body.datos.siguiente, cursoSiguiente());
  });

  it('el rango tiene al menos CURSOS_ANTERIORES + 1 + CURSOS_SIGUIENTES elementos', async function () {
    var res = await request(app)
      .get('/api/v1/cursos')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var cursos = res.body.datos.cursos;
    var rangoBase = CURSOS_ANTERIORES + 1 + CURSOS_SIGUIENTES;
    assert.ok(cursos.length >= rangoBase, 'Debe tener al menos ' + rangoBase + ' cursos, tiene ' + cursos.length);
  });

  it('incluye el actual con tieneDatos boolean', async function () {
    var res = await request(app)
      .get('/api/v1/cursos')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var cursos = res.body.datos.cursos;
    var actual = cursos.find(function (c) { return c.curso === cursoActual(); });
    assert.ok(actual, 'Debe incluir el curso actual');
    assert.equal(typeof actual.tieneDatos, 'boolean');
  });

  it('incluye curso con datos fuera del rango (2010-2011)', async function () {
    var res = await request(app)
      .get('/api/v1/cursos')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var cursos = res.body.datos.cursos;
    var fuera = cursos.find(function (c) { return c.curso === cursoFueraRango; });
    assert.ok(fuera, 'Debe incluir ' + cursoFueraRango + ' porque tiene datos en espacio_curso');
    assert.equal(fuera.tieneDatos, true);
  });

  it('tieneDatos es false para cursos del rango sin datos', async function () {
    var res = await request(app)
      .get('/api/v1/cursos')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var cursos = res.body.datos.cursos;
    var sinDatos = cursos.filter(function (c) { return !c.tieneDatos; });
    assert.ok(sinDatos.length > 0, 'Debe haber al menos un curso sin datos en el rango');
  });

  it('cursos está ordenado de más reciente a más antiguo', async function () {
    var res = await request(app)
      .get('/api/v1/cursos')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    var cursos = res.body.datos.cursos;
    for (var i = 1; i < cursos.length; i++) {
      assert.ok(cursos[i - 1].curso >= cursos[i].curso, 'Debe estar ordenado descendente: ' + cursos[i - 1].curso + ' >= ' + cursos[i].curso);
    }
  });

  it('un PROFESOR puede acceder', async function () {
    var res = await request(app)
      .get('/api/v1/cursos')
      .set('Authorization', 'Bearer ' + profToken)
      .expect(200);
    assert.ok(res.body.ok);
  });

  it('sin token devuelve 401', async function () {
    await request(app)
      .get('/api/v1/cursos')
      .expect(401);
  });
});

describe('Validación curso_escolar en Zod', function () {
  it('rechaza formato con barra: 2025/2026', async function () {
    var res = await request(app)
      .post('/api/v1/guardias/creadas')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        dia_semana: 1,
        tramo_horario: '1a hora (08:30-09:20)',
        curso_escolar: '2025/2026',
        id_usuario: 1
      })
      .expect(400);
    assert.ok(res.body.mensaje || res.body.errors);
  });

  it('rechaza años no consecutivos: 2025-2027', async function () {
    var res = await request(app)
      .post('/api/v1/guardias/creadas')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        dia_semana: 1,
        tramo_horario: '1a hora (08:30-09:20)',
        curso_escolar: '2025-2027',
        id_usuario: 1
      })
      .expect(400);
    assert.ok(res.body.mensaje || res.body.errors);
  });

  it('rechaza formato inválido en espacio_curso', async function () {
    var [espacios] = await pool.query('SELECT id_espacio FROM espacio LIMIT 1');
    if (espacios.length === 0) return;
    var res = await request(app)
      .put('/api/v1/espacios/nombres-curso/' + espacios[0].id_espacio)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ curso_escolar: '2025/2026', nombre_curso: 'Test' })
      .expect(400);
    assert.ok(res.body.mensaje || res.body.errors);
  });

  it('rechaza años no consecutivos en espacio_curso: 2025-2027', async function () {
    var [espacios] = await pool.query('SELECT id_espacio FROM espacio LIMIT 1');
    if (espacios.length === 0) return;
    var res = await request(app)
      .put('/api/v1/espacios/nombres-curso/' + espacios[0].id_espacio)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ curso_escolar: '2025-2027', nombre_curso: 'Test' })
      .expect(400);
    assert.ok(res.body.mensaje || res.body.errors);
  });
});

describe('GET /api/v1/espacios con curso_escolar=actual', function () {
  it('acepta curso_escolar=actual y devuelve 200', async function () {
    var res = await request(app)
      .get('/api/v1/espacios?curso_escolar=actual')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    assert.ok(res.body.ok);
  });

  it('sin curso_escolar devuelve 200 sin nombre_curso', async function () {
    var res = await request(app)
      .get('/api/v1/espacios?limit=5')
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(200);
    assert.ok(res.body.ok);
    var registros = res.body.datos.registros || [];
    if (registros.length > 0) {
      assert.equal(registros[0].nombre_curso, undefined, 'Sin curso no debe incluir nombre_curso');
    }
  });
});
