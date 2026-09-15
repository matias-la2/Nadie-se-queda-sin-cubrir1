'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parsearArchivo } = require('../services/importador-guardias.service');

const DOCS = path.join(__dirname, '..', 'docs');
const EDIFICIOS = [
  { id_edificio: 1, nombre: 'ESO' },
  { id_edificio: 2, nombre: 'Bachillerato y FP' },
];

function leerArchivo(nombre) {
  return fs.readFileSync(path.join(DOCS, nombre));
}

// ─── ESO ────────────────────────────────────────────────

describe('Parser ESO (Guardias ESO.xls)', () => {
  let resultado;

  it('parsea sin errores', () => {
    resultado = parsearArchivo(leerArchivo('Guardias ESO.xls'), EDIFICIOS);
    assert.ok(resultado);
  });

  it('detecta el edificio ESO', () => {
    assert.equal(resultado.edificio.id, 1);
    assert.equal(resultado.edificio.nombre, 'ESO');
  });

  it('produce exactamente 87 entradas de guardia', () => {
    // El archivo real contiene 87 entradas (30 celdas con datos x ~3 nombres/celda)
    assert.equal(resultado.guardias.length, 87);
  });

  it('detecta los códigos de plaza SIF1-SIF4 y GH1', () => {
    const plazas = resultado.plazas.sort();
    assert.deepEqual(plazas, ['GH1', 'SIF1', 'SIF2', 'SIF3', 'SIF4']);
  });

  it('ignora la fila de recreo', () => {
    const tramosUsados = new Set(resultado.guardias.map(g => g.tramo_horario));
    for (const t of tramosUsados) {
      assert.ok(!t.toLowerCase().includes('recreo'), `Tramo "${t}" contiene recreo`);
    }
  });

  it('no genera filas para celdas vacías', () => {
    for (const g of resultado.guardias) {
      assert.ok(g.nombreExcel.trim().length > 0, 'Nombre vacío encontrado');
    }
  });

  it('usa los 6 tramos lectivos', () => {
    const tramosUsados = new Set(resultado.guardias.map(g => g.tramo_horario));
    assert.equal(tramosUsados.size, 6);
  });

  it('usa los 5 días de la semana', () => {
    const dias = new Set(resultado.guardias.map(g => g.dia_semana));
    assert.deepEqual([...dias].sort(), [1, 2, 3, 4, 5]);
  });

  it('marca correctamente las plazas como esPlaza=true', () => {
    const guardiasPlaza = resultado.guardias.filter(g => g.esPlaza);
    assert.ok(guardiasPlaza.length > 0);
    for (const g of guardiasPlaza) {
      assert.ok(/^[A-Z]{2,4}\d{1,2}$/.test(g.nombreExcel), `"${g.nombreExcel}" no parece plaza`);
    }
  });

  it('los nombres de personas no son marcados como plaza', () => {
    const guardiasPersona = resultado.guardias.filter(g => !g.esPlaza);
    assert.ok(guardiasPersona.length > 0);
    for (const g of guardiasPersona) {
      assert.ok(g.nombreExcel.includes(' '), `"${g.nombreExcel}" debería tener espacios (nombre compuesto)`);
    }
  });
});

// ─── Bachillerato ───────────────────────────────────────

describe('Parser Bachillerato (Guardias Bto.xls)', () => {
  let resultado;

  it('parsea sin errores', () => {
    resultado = parsearArchivo(leerArchivo('Guardias Bto.xls'), EDIFICIOS);
    assert.ok(resultado);
  });

  it('detecta el edificio Bachillerato', () => {
    assert.equal(resultado.edificio.id, 2);
    assert.equal(resultado.edificio.nombre, 'Bachillerato y FP');
  });

  it('produce exactamente 19 entradas de guardia', () => {
    assert.equal(resultado.guardias.length, 19);
  });

  it('ignora la fila de recreo', () => {
    const tramosUsados = new Set(resultado.guardias.map(g => g.tramo_horario));
    for (const t of tramosUsados) {
      assert.ok(!t.toLowerCase().includes('recreo'), `Tramo "${t}" contiene recreo`);
    }
  });

  it('no genera filas para celdas vacías', () => {
    for (const g of resultado.guardias) {
      assert.ok(g.nombreExcel.trim().length > 0, 'Nombre vacío encontrado');
    }
  });
});

// ─── Errores ────────────────────────────────────────────

describe('Parser errores', () => {
  it('lanza error con edificio no reconocido', () => {
    const edificiosFalso = [{ id_edificio: 99, nombre: 'Gimnasio' }];
    assert.throws(
      () => parsearArchivo(leerArchivo('Guardias ESO.xls'), edificiosFalso),
      /Edificio no reconocido/
    );
  });

  it('incluye el nombre del edificio no reconocido en el mensaje', () => {
    const edificiosFalso = [{ id_edificio: 99, nombre: 'Gimnasio' }];
    try {
      parsearArchivo(leerArchivo('Guardias ESO.xls'), edificiosFalso);
      assert.fail('Debería haber lanzado error');
    } catch (e) {
      assert.ok(e.message.includes('ESO'), `Mensaje no incluye "ESO": ${e.message}`);
      assert.ok(e.message.includes('Gimnasio'), `Mensaje no incluye edificio disponible: ${e.message}`);
    }
  });
});
