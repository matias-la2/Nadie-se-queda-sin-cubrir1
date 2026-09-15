'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizar, emparejar, jaroWinkler } = require('../services/nombres.service');

// ─── Normalización ─────────────────────────────────────

describe('normalizar()', () => {
  it('expande FCO. MONSAL → FRANCISCO MONSAL y quita acentos', () => {
    assert.equal(
      normalizar('FCO. MONSAL ELISA QUERO'),
      'FRANCISCO MONSAL ELISA QUERO'
    );
  });

  it('expande Mª y quita acentos de BORJÁ', () => {
    assert.equal(
      normalizar('Mª RIO BORJÁ LIDIA'),
      'MARIA RIO BORJA LIDIA'
    );
  });

  it('expande M. al inicio → MARIA', () => {
    assert.equal(
      normalizar('M. CELESTINO FLORA BIEL'),
      'MARIA CELESTINO FLORA BIEL'
    );
  });

  it('colapsa espacios múltiples y hace trim', () => {
    assert.equal(
      normalizar('  JUAN   GARCIA   '),
      'JUAN GARCIA'
    );
  });

  it('devuelve cadena vacía para null/undefined', () => {
    assert.equal(normalizar(null), '');
    assert.equal(normalizar(undefined), '');
    assert.equal(normalizar(''), '');
  });

  it('quita puntos sueltos y caracteres especiales', () => {
    assert.equal(
      normalizar('JOSE M. LOPEZ-GARCIA'),
      'JOSE MARIA LOPEZGARCIA'
    );
  });
});

// ─── Jaro-Winkler ──────────────────────────────────────

describe('jaroWinkler()', () => {
  it('devuelve 1.0 para cadenas idénticas', () => {
    assert.equal(jaroWinkler('GARCIA', 'GARCIA'), 1.0);
  });

  it('devuelve 0.0 para cadenas sin ninguna coincidencia', () => {
    assert.equal(jaroWinkler('ABC', 'XYZ'), 0.0);
  });

  it('da un score alto para cadenas muy similares', () => {
    const score = jaroWinkler('FRANCISCO', 'FRANCISKO');
    assert.ok(score > 0.9, `esperado > 0.9, obtenido ${score}`);
  });

  it('da un score bajo para cadenas muy diferentes', () => {
    const score = jaroWinkler('PEDRO', 'MARIA');
    assert.ok(score < 0.7, `esperado < 0.7, obtenido ${score}`);
  });
});

// ─── Emparejamiento ────────────────────────────────────

const USUARIOS = [
  { id: 1, nombre: 'Francisco Monsal', apellidos: 'Elisa Qúero' },
  { id: 2, nombre: 'María Rio', apellidos: 'Borjá Lidia' },
  { id: 3, nombre: 'María Celestino', apellidos: 'Flora Biel' },
  { id: 4, nombre: 'Elena', apellidos: 'García Martínez' },
  { id: 5, nombre: 'Pedro', apellidos: 'López Fernández' },
];

describe('emparejar()', () => {
  it('EXACTO por nombre normalizado: FCO. MONSAL ELISA QUERO', () => {
    const r = emparejar('FCO. MONSAL ELISA QUERO', USUARIOS);
    assert.equal(r.tipo, 'EXACTO');
    assert.equal(r.candidatos[0].id, 1);
  });

  it('EXACTO por nombre normalizado: Mª RIO BORJÁ LIDIA', () => {
    const r = emparejar('Mª RIO BORJÁ LIDIA', USUARIOS);
    assert.equal(r.tipo, 'EXACTO');
    assert.equal(r.candidatos[0].id, 2);
  });

  it('EXACTO por nombre normalizado: M. CELESTINO FLORA BIEL', () => {
    const r = emparejar('M. CELESTINO FLORA BIEL', USUARIOS);
    assert.equal(r.tipo, 'EXACTO');
    assert.equal(r.candidatos[0].id, 3);
  });

  it('EXACTO por coincidencia directa', () => {
    const r = emparejar('ELENA GARCIA MARTINEZ', USUARIOS);
    assert.equal(r.tipo, 'EXACTO');
    assert.equal(r.candidatos[0].id, 4);
  });

  it('EXACTO por tokens desordenados', () => {
    const r = emparejar('GARCIA MARTINEZ ELENA', USUARIOS);
    assert.equal(r.tipo, 'EXACTO');
    assert.equal(r.candidatos[0].id, 4);
  });

  it('EXACTO por alias', () => {
    const aliasMap = new Map([['PEPE GARCIA', 4]]);
    const r = emparejar('PEPE GARCIA', USUARIOS, aliasMap);
    assert.equal(r.tipo, 'EXACTO');
    assert.equal(r.candidatos[0].id, 4);
  });

  it('PROBABLE para nombre parcialmente similar', () => {
    const r = emparejar('FRANCISCO B ELISA', USUARIOS);
    assert.equal(r.tipo, 'PROBABLE');
    assert.ok(r.candidatos.length >= 1);
    assert.ok(r.candidatos[0].score >= 0.85);
    assert.equal(r.candidatos[0].id, 1);
  });

  it('NINGUNO para nombre sin relación', () => {
    const r = emparejar('ZACARIAS FERNANDEZ OTERO', USUARIOS);
    assert.equal(r.tipo, 'NINGUNO');
    assert.equal(r.candidatos.length, 0);
  });

  it('PROBABLE devuelve máximo 3 candidatos', () => {
    const muchos = [];
    for (let i = 0; i < 10; i++) {
      muchos.push({ id: 100 + i, nombre: 'Juan Antonio', apellidos: `Garcia Lopez${i}` });
    }
    const r = emparejar('JUAN ANTONIO GARCIA LOPEZ', muchos);
    assert.ok(r.candidatos.length <= 3);
  });
});
