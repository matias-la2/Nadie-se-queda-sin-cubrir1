'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
// Override DB_HOST for direct connection (not through Docker network)
process.env.DB_HOST = 'localhost';

const request = require('supertest');
const app = require('../server');
const pool = require('../config/db');
const { normalizar } = require('../services/nombres.service');

const JWT_SECRET = process.env.JWT_SECRET;
const DOCS = path.join(__dirname, '..', 'docs');

// Admin user from seed: id=4, ADMINISTRADOR
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

function cursoActual() {
  const ahora = new Date();
  const anio = ahora.getMonth() >= 8 ? ahora.getFullYear() : ahora.getFullYear() - 1;
  return `${anio}-${anio + 1}`;
}

async function limpiarGuardiasExcel() {
  await pool.query("DELETE FROM guardia_creada WHERE origen = 'EXCEL'");
  await pool.query('DELETE FROM plaza_pendiente');
  await pool.query('DELETE FROM profesor_pendiente_login');
  await pool.query('DELETE FROM alias_profesor');
}

// ─── Tests ──────────────────────────────────────────────

describe('POST /api/v1/guardias/creadas/importar-excel/analizar', () => {
  before(async () => {
    await limpiarGuardiasExcel();
  });

  it('requiere autenticación', async () => {
    const res = await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/analizar')
      .expect(401);
    assert.equal(res.body.ok, false);
  });

  it('requiere rol ADMINISTRADOR o EQUIPO_DIRECTIVO', async () => {
    const res = await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/analizar')
      .set('Authorization', `Bearer ${profToken}`)
      .expect(403);
    assert.equal(res.body.ok, false);
  });

  it('analiza los dos archivos reales y devuelve la estructura esperada', async () => {
    const res = await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/analizar')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('archivos', path.join(DOCS, 'Guardias ESO.xls'))
      .attach('archivos', path.join(DOCS, 'Guardias Bto.xls'))
      .expect(200);

    assert.equal(res.body.ok, true);
    const d = res.body.datos;

    assert.equal(d.curso, cursoActual());
    assert.equal(d.archivos.length, 2);

    const eso = d.archivos.find(a => a.edificio.nombre === 'ESO');
    const bto = d.archivos.find(a => a.edificio.nombre.includes('Bachillerato'));
    assert.ok(eso, 'Archivo ESO no encontrado');
    assert.ok(bto, 'Archivo Bachillerato no encontrado');
    assert.equal(eso.guardias, 87);
    assert.equal(bto.guardias, 19);

    assert.ok(Array.isArray(d.resueltos));
    assert.ok(Array.isArray(d.probables));
    assert.ok(Array.isArray(d.sinCuenta));
    assert.ok(Array.isArray(d.plazas));
    assert.ok(Array.isArray(d.guardias));
    assert.equal(d.guardias.length, 87 + 19);

    assert.ok(d.plazas.includes('SIF1'));
    assert.ok(d.plazas.includes('GH1'));
  });

  it('rechaza dos archivos del mismo edificio', async () => {
    const res = await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/analizar')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('archivos', path.join(DOCS, 'Guardias ESO.xls'))
      .attach('archivos', path.join(DOCS, 'Guardias ESO.xls'))
      .expect(400);

    assert.equal(res.body.ok, false);
    assert.ok(res.body.mensaje.includes('mismo edificio'));
  });
});

describe('POST /api/v1/guardias/creadas/importar-excel/confirmar', () => {
  let datosAnalisis;

  before(async () => {
    await limpiarGuardiasExcel();

    // Primero analizar
    const res = await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/analizar')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('archivos', path.join(DOCS, 'Guardias ESO.xls'))
      .attach('archivos', path.join(DOCS, 'Guardias Bto.xls'));

    datosAnalisis = res.body.datos;
  });

  it('confirmar crea las guardias correctamente', async () => {
    const decisiones = {};
    for (const p of datosAnalisis.probables) {
      if (p.candidatos.length > 0) {
        decisiones[p.nombreExcel] = { accion: 'VINCULAR', id_usuario: p.candidatos[0].id_usuario };
      } else {
        decisiones[p.nombreExcel] = { accion: 'IGNORAR' };
      }
    }
    for (const s of datosAnalisis.sinCuenta) {
      decisiones[s.nombreExcel] = { accion: 'PENDIENTE_LOGIN' };
    }

    const body = {
      curso: datosAnalisis.curso,
      edificios: datosAnalisis.archivos.map(a => a.edificio.id),
      guardias: datosAnalisis.guardias,
      decisiones,
    };

    const res = await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/confirmar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);

    assert.equal(res.body.ok, true);
    const d = res.body.datos;
    assert.ok(d.guardiasCreadas > 0, `guardiasCreadas should be > 0, got ${d.guardiasCreadas}`);
    assert.equal(typeof d.resueltos, 'number');
    assert.equal(typeof d.plazas, 'number');
    assert.equal(typeof d.pendientesLogin, 'number');

    // Verify guardias exist in DB
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM guardia_creada WHERE origen = 'EXCEL' AND curso_escolar = ?",
      [datosAnalisis.curso]
    );
    assert.equal(total, d.guardiasCreadas);
  });

  it('reimportar dos veces no duplica guardias', async () => {
    const [[{ antes }]] = await pool.query(
      "SELECT COUNT(*) AS antes FROM guardia_creada WHERE origen = 'EXCEL' AND curso_escolar = ?",
      [datosAnalisis.curso]
    );

    const decisiones = {};
    for (const p of datosAnalisis.probables) {
      if (p.candidatos.length > 0) {
        decisiones[p.nombreExcel] = { accion: 'VINCULAR', id_usuario: p.candidatos[0].id_usuario };
      } else {
        decisiones[p.nombreExcel] = { accion: 'IGNORAR' };
      }
    }
    for (const s of datosAnalisis.sinCuenta) {
      decisiones[s.nombreExcel] = { accion: 'PENDIENTE_LOGIN' };
    }

    const body = {
      curso: datosAnalisis.curso,
      edificios: datosAnalisis.archivos.map(a => a.edificio.id),
      guardias: datosAnalisis.guardias,
      decisiones,
    };

    await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/confirmar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);

    const [[{ despues }]] = await pool.query(
      "SELECT COUNT(*) AS despues FROM guardia_creada WHERE origen = 'EXCEL' AND curso_escolar = ?",
      [datosAnalisis.curso]
    );

    assert.equal(antes, despues, `Antes: ${antes}, Después: ${despues} — se duplicaron guardias`);
  });

  it('reimportar solo ESO no borra Bachillerato', async () => {
    const edificioBto = datosAnalisis.archivos.find(a => a.edificio.nombre.includes('Bachillerato'));
    const idBto = edificioBto.edificio.id;
    const edificioEso = datosAnalisis.archivos.find(a => a.edificio.nombre === 'ESO');
    const idEso = edificioEso.edificio.id;

    const [[{ btoAntes }]] = await pool.query(
      "SELECT COUNT(*) AS btoAntes FROM guardia_creada WHERE origen = 'EXCEL' AND curso_escolar = ? AND id_edificio = ?",
      [datosAnalisis.curso, idBto]
    );

    // Reimportar solo ESO
    const guardiasEso = datosAnalisis.guardias.filter(g => g.edificio_id === idEso);
    const nombresEso = new Set(guardiasEso.filter(g => !g.esPlaza).map(g => g.nombreExcel));
    const decisiones = {};
    for (const p of datosAnalisis.probables) {
      if (nombresEso.has(p.nombreExcel) && p.candidatos.length > 0) {
        decisiones[p.nombreExcel] = { accion: 'VINCULAR', id_usuario: p.candidatos[0].id_usuario };
      }
    }
    for (const s of datosAnalisis.sinCuenta) {
      if (nombresEso.has(s.nombreExcel)) {
        decisiones[s.nombreExcel] = { accion: 'PENDIENTE_LOGIN' };
      }
    }

    await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/confirmar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        curso: datosAnalisis.curso,
        edificios: [idEso],
        guardias: guardiasEso,
        decisiones,
      })
      .expect(201);

    const [[{ btoDespues }]] = await pool.query(
      "SELECT COUNT(*) AS btoDespues FROM guardia_creada WHERE origen = 'EXCEL' AND curso_escolar = ? AND id_edificio = ?",
      [datosAnalisis.curso, idBto]
    );

    assert.equal(btoAntes, btoDespues, 'Bachillerato fue borrado al reimportar solo ESO');
  });

  it('guardia_asignada queda intacta', async () => {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM guardia_asignada');
    assert.ok(total >= 1, 'guardia_asignada debería tener al menos 1 registro del seed');
  });
});

describe('Validación Zod confirmar', () => {
  it('rechaza curso con formato inválido', async () => {
    const res = await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/confirmar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ curso: '2026', edificios: [1], guardias: [], decisiones: {} })
      .expect(400);
    assert.equal(res.body.ok, false);
  });

  it('rechaza decisiones con accion inválida', async () => {
    const res = await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/confirmar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        curso: '2026-2027',
        edificios: [1],
        guardias: [],
        decisiones: { 'PEPE': { accion: 'INVALIDA' } },
      })
      .expect(400);
    assert.equal(res.body.ok, false);
  });
});

describe('confirmar auto-pendiente para nombres sin decisión', () => {
  let datosAnalisis;

  before(async () => {
    await limpiarGuardiasExcel();

    const res = await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/analizar')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('archivos', path.join(DOCS, 'Guardias ESO.xls'))
      .attach('archivos', path.join(DOCS, 'Guardias Bto.xls'));

    datosAnalisis = res.body.datos;
  });

  it('crea pendiente_login automáticamente para nombres sin decisión', async () => {
    assert.ok(datosAnalisis.sinCuenta.length > 0, 'Debe haber al menos un nombre sin cuenta');

    const nombreOmitido = datosAnalisis.sinCuenta[0].nombreExcel;

    const decisiones = {};
    for (const p of datosAnalisis.probables) {
      if (p.candidatos.length > 0) {
        decisiones[p.nombreExcel] = { accion: 'VINCULAR', id_usuario: p.candidatos[0].id_usuario };
      } else {
        decisiones[p.nombreExcel] = { accion: 'IGNORAR' };
      }
    }
    for (let i = 1; i < datosAnalisis.sinCuenta.length; i++) {
      decisiones[datosAnalisis.sinCuenta[i].nombreExcel] = { accion: 'PENDIENTE_LOGIN' };
    }

    const body = {
      curso: datosAnalisis.curso,
      edificios: datosAnalisis.archivos.map(a => a.edificio.id),
      guardias: datosAnalisis.guardias,
      decisiones,
    };

    const res = await request(app)
      .post('/api/v1/guardias/creadas/importar-excel/confirmar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);

    const d = res.body.datos;
    assert.ok(d.pendientesLogin > 0, 'Debe haber pendientes de login');
    assert.equal(d.ignorados, 0, 'No debe haber ignorados (ninguna decisión IGNORAR)');

    const norm = normalizar(nombreOmitido);
    const [[row]] = await pool.query(
      'SELECT id FROM profesor_pendiente_login WHERE nombre_normalizado = ?',
      [norm]
    );
    assert.ok(row, `"${nombreOmitido}" debería existir en profesor_pendiente_login`);

    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM guardia_creada WHERE id_profesor_pendiente = ?',
      [row.id]
    );
    assert.ok(count > 0, `"${nombreOmitido}" debería tener guardias creadas`);
  });
});

after(async () => {
  await pool.end();
});
