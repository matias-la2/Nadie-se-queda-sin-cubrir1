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
const { cursoActual, rangoCurso } = require('../helpers/curso.helper');

const JWT_SECRET = process.env.JWT_SECRET;

const adminToken = jwt.sign(
  { id: 4, nombre: 'Admin', apellidos: 'Sistema IES', correo: 'admin@iesrioarba.es', roles: ['ADMINISTRADOR'] },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const CURSO_ANTERIOR = '2024-2025';
const FECHA_ANTERIOR = '2025-03-10';
const FECHA_ACTUAL = '2026-10-15';
const TRAMO = '1a hora (08:30-09:20)';

const insertedIds = [];

async function insertarAusencia(fecha, estado) {
  const [result] = await pool.query(
    `INSERT INTO ausencia (tramo_horario, fecha, estado, hay_tarea, id_profesor, id_usuario_creador)
     VALUES (?, ?, ?, 0, 1, 4)`,
    [TRAMO, fecha, estado]
  );
  insertedIds.push(result.insertId);
  await pool.query(
    'INSERT INTO ausencia_espacio (id_ausencia, id_espacio) VALUES (?, 1)',
    [result.insertId]
  );
  return result.insertId;
}

async function limpiar() {
  if (insertedIds.length === 0) return;
  const placeholders = insertedIds.map(() => '?').join(',');
  await pool.query(`DELETE FROM guardia_asignada WHERE id_ausencia IN (${placeholders})`, insertedIds);
  await pool.query(`DELETE FROM ausencia_espacio WHERE id_ausencia IN (${placeholders})`, insertedIds);
  await pool.query(`DELETE FROM ausencia WHERE id_ausencia IN (${placeholders})`, insertedIds);
  insertedIds.length = 0;
}

// ─── Tests unitarios de rangoCurso ─────────────────────

describe('rangoCurso()', () => {
  it('devuelve rango correcto para un curso explícito', () => {
    const r = rangoCurso('2025-2026');
    assert.deepStrictEqual(r, { desde: '2025-09-01', hasta: '2026-08-31' });
  });

  it('"actual" devuelve el curso en curso', () => {
    const r = rangoCurso('actual');
    const curso = cursoActual();
    const esperado = rangoCurso(curso);
    assert.deepStrictEqual(r, esperado);
  });

  it('devuelve null si el segundo año no es primero + 1', () => {
    assert.strictEqual(rangoCurso('2025-2027'), null);
  });

  it('devuelve null para formato inválido', () => {
    assert.strictEqual(rangoCurso('abc'), null);
    assert.strictEqual(rangoCurso('2025'), null);
    assert.strictEqual(rangoCurso(''), null);
  });
});

// ─── Tests de endpoint GET /api/v1/ausencias con curso ──

describe('GET /api/v1/ausencias?curso=…', () => {
  before(async () => {
    await insertarAusencia(FECHA_ANTERIOR, 'SIN_CUBRIR');
    await insertarAusencia(FECHA_ACTUAL, 'SIN_CUBRIR');
    await insertarAusencia(FECHA_ACTUAL, 'PENDIENTE');
  });

  after(limpiar);

  it('sin parámetro curso devuelve todas (incluida la antigua)', async () => {
    const res = await request(app)
      .get('/api/v1/ausencias?limit=100')
      .set('Cookie', `token=${adminToken}`)
      .expect(200);

    const ids = res.body.datos.registros.map(r => r.id_ausencia);
    assert.ok(ids.includes(insertedIds[0]), 'debe incluir la del curso anterior');
    assert.ok(ids.includes(insertedIds[1]), 'debe incluir la del curso actual');
  });

  it('curso=actual excluye ausencias del curso anterior', async () => {
    const res = await request(app)
      .get('/api/v1/ausencias?curso=actual&limit=100')
      .set('Cookie', `token=${adminToken}`)
      .expect(200);

    const ids = res.body.datos.registros.map(r => r.id_ausencia);
    assert.ok(!ids.includes(insertedIds[0]), 'no debe incluir la del curso anterior');
    assert.ok(ids.includes(insertedIds[1]), 'debe incluir la del curso actual');
  });

  it('curso=2024-2025 devuelve solo las antiguas', async () => {
    const res = await request(app)
      .get(`/api/v1/ausencias?curso=${CURSO_ANTERIOR}&limit=100`)
      .set('Cookie', `token=${adminToken}`)
      .expect(200);

    const ids = res.body.datos.registros.map(r => r.id_ausencia);
    assert.ok(ids.includes(insertedIds[0]), 'debe incluir la del curso 2024-2025');
    assert.ok(!ids.includes(insertedIds[1]), 'no debe incluir la del curso actual');
  });

  it('curso=actual con estado=SIN_CUBRIR excluye la antigua SIN_CUBRIR', async () => {
    const res = await request(app)
      .get('/api/v1/ausencias?curso=actual&estado=SIN_CUBRIR&limit=100')
      .set('Cookie', `token=${adminToken}`)
      .expect(200);

    const ids = res.body.datos.registros.map(r => r.id_ausencia);
    assert.ok(!ids.includes(insertedIds[0]), 'no debe incluir la antigua SIN_CUBRIR');
    assert.ok(ids.includes(insertedIds[1]), 'debe incluir la actual SIN_CUBRIR');
  });

  it('curso=2025-2027 devuelve 400', async () => {
    await request(app)
      .get('/api/v1/ausencias?curso=2025-2027')
      .set('Cookie', `token=${adminToken}`)
      .expect(400);
  });

  it('curso=abc devuelve 400', async () => {
    await request(app)
      .get('/api/v1/ausencias?curso=abc')
      .set('Cookie', `token=${adminToken}`)
      .expect(400);
  });
});

// ─── Tests de guardias/hoy sinCubrirOtrosDias ──────────

describe('GET /api/v1/guardias/hoy — sinCubrirOtrosDias filtrada por curso', () => {
  let idAntigua;

  before(async () => {
    idAntigua = await insertarAusencia(FECHA_ANTERIOR, 'SIN_CUBRIR');
    await insertarAusencia(FECHA_ACTUAL, 'SIN_CUBRIR');
  });

  after(limpiar);

  it('no incluye ausencias SIN_CUBRIR del curso anterior en sinCubrirOtrosDias', async () => {
    const res = await request(app)
      .get('/api/v1/guardias/hoy')
      .set('Cookie', `token=${adminToken}`)
      .expect(200);

    const sinCubrir = res.body.datos.sinCubrirOtrosDias || [];
    const ids = sinCubrir.map(r => r.id_ausencia);
    assert.ok(!ids.includes(idAntigua), 'sinCubrirOtrosDias no debe incluir la del curso anterior');
  });
});

// ─── Tests de guardias/creadas con curso_escolar ───────

describe('GET /api/v1/guardias/creadas — validación curso_escolar', () => {
  it('curso_escolar=abc devuelve 400', async () => {
    await request(app)
      .get('/api/v1/guardias/creadas?curso_escolar=abc')
      .set('Cookie', `token=${adminToken}`)
      .expect(400);
  });

  it('curso_escolar=2025-2027 devuelve 400', async () => {
    await request(app)
      .get('/api/v1/guardias/creadas?curso_escolar=2025-2027')
      .set('Cookie', `token=${adminToken}`)
      .expect(400);
  });

  it('curso_escolar=actual devuelve 200', async () => {
    await request(app)
      .get('/api/v1/guardias/creadas?curso_escolar=actual')
      .set('Cookie', `token=${adminToken}`)
      .expect(200);
  });
});

// ─── Tests de /creadas/cursos ──────────────────────────

describe('GET /api/v1/guardias/creadas/cursos', () => {
  it('devuelve los cursos existentes con el actual incluido', async () => {
    const res = await request(app)
      .get('/api/v1/guardias/creadas/cursos')
      .set('Cookie', `token=${adminToken}`)
      .expect(200);

    const datos = res.body.datos;
    assert.ok(Array.isArray(datos.cursos), 'datos.cursos debe ser un array');
    assert.ok(datos.cursos.length > 0, 'debe haber al menos un curso');
    assert.ok(datos.cursos.includes('2025-2026'), 'debe incluir el curso del seed');
    assert.strictEqual(datos.actual, cursoActual(), 'actual debe ser el curso en curso');
    assert.ok(datos.cursos.includes(cursoActual()), 'cursos debe incluir el actual aunque no tenga guardias');
    const sorted = [...datos.cursos].sort().reverse();
    assert.deepStrictEqual(datos.cursos, sorted, 'cursos debe estar ordenado de más reciente a más antiguo');
  });
});

after(async () => {
  await pool.end();
});
