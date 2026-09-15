'use strict';

const fs = require('fs');
const path = require('path');
const { ETIQUETAS_LECTIVAS } = require('../config/tramos');

const PLAZA_REGEX_DEFAULT = '^[A-Z]{2,4}\\d{1,2}$';

function getPlazaRegex() {
  const pattern = process.env.PLAZA_CODIGO_REGEX || PLAZA_REGEX_DEFAULT;
  return new RegExp(pattern);
}

function readBiffString(buf, offset) {
  const len = buf.readUInt16LE(offset);
  const flags = buf[offset + 2];
  const isUtf16 = flags & 0x01;
  if (isUtf16) {
    return {
      value: buf.slice(offset + 3, offset + 3 + len * 2).toString('utf16le'),
      bytesRead: 3 + len * 2,
    };
  }
  return {
    value: buf.slice(offset + 3, offset + 3 + len).toString('latin1'),
    bytesRead: 3 + len,
  };
}

function parseBiffLabels(buffer) {
  let cfbModule;
  try {
    cfbModule = require('xlsx').CFB;
  } catch {
    throw new Error('La librería xlsx (SheetJS) es necesaria para leer archivos .xls');
  }

  const cfb = cfbModule.read(buffer, { type: 'buffer' });
  const wbEntry =
    cfbModule.find(cfb, '/Workbook') ||
    cfbModule.find(cfb, '/Book') ||
    cfbModule.find(cfb, '/WorkBook');

  if (!wbEntry) {
    throw new Error('No se encontró el stream Workbook en el archivo OLE2');
  }

  const data = Buffer.from(wbEntry.content);
  const cells = {};
  let offset = 0;

  while (offset < data.length - 4) {
    const type = data.readUInt16LE(offset);
    const size = data.readUInt16LE(offset + 2);

    if (type === 0x0204 && size >= 8) {
      const body = data.slice(offset + 4, offset + 4 + size);
      const row = body.readUInt16LE(0);
      const col = body.readUInt16LE(2);
      const str = readBiffString(body, 6);
      if (!cells[row]) cells[row] = {};
      cells[row][col] = str.value;
    }

    offset += 4 + size;
  }

  return cells;
}

function parseXlsxSheet(buffer) {
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];

  if (!ws || !ws['!ref']) return null;

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const cells = {};
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const v = data[r][c];
      if (v !== '' && v != null) {
        if (!cells[r]) cells[r] = {};
        cells[r][c] = String(v);
      }
    }
  }
  return cells;
}

function normalizarEdificio(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function parsearArchivo(buffer, edificiosDB) {
  let cells = parseXlsxSheet(buffer);
  if (!cells || Object.keys(cells).length === 0) {
    cells = parseBiffLabels(buffer);
  }
  if (!cells || Object.keys(cells).length === 0) {
    throw new Error('No se pudo leer el contenido del archivo');
  }

  const edificioCell = cells[0]?.[0];
  if (!edificioCell) {
    throw new Error('No se encontró el nombre del edificio en la celda A1');
  }

  const edificioNorm = normalizarEdificio(edificioCell);
  const edificio = edificiosDB.find(e => {
    const nombre = normalizarEdificio(e.nombre);
    return nombre === edificioNorm || nombre.startsWith(edificioNorm) || edificioNorm.startsWith(nombre);
  });

  if (!edificio) {
    throw new Error(
      `Edificio no reconocido: "${edificioCell}". ` +
      `Edificios disponibles: ${edificiosDB.map(e => e.nombre).join(', ')}`
    );
  }

  const rows = Object.keys(cells)
    .map(Number)
    .filter(r => r >= 2)
    .sort((a, b) => a - b);

  const filasConHora = [];
  const filasRecreo = [];

  for (const r of rows) {
    const colA = (cells[r]?.[0] || '').trim();
    if (!colA) {
      const tieneDatos = [1, 2, 3, 4, 5].some(c => cells[r]?.[c]);
      if (tieneDatos) {
        filasRecreo.push(r);
      }
      continue;
    }

    if (colA.toLowerCase().includes('recreo')) {
      filasRecreo.push(r);
      continue;
    }

    if (/\d/.test(colA)) {
      filasConHora.push(r);
    }
  }

  if (filasConHora.length !== 6) {
    throw new Error(
      `Se esperaban exactamente 6 filas con tramo horario, se encontraron ${filasConHora.length}. ` +
      `Revise el formato del archivo.`
    );
  }

  const plazaRegex = getPlazaRegex();
  const guardias = [];
  const nombresSet = new Set();
  const plazasSet = new Set();

  for (let t = 0; t < 6; t++) {
    const fila = filasConHora[t];
    const tramo = ETIQUETAS_LECTIVAS[t];

    for (let dia = 1; dia <= 5; dia++) {
      const celda = (cells[fila]?.[dia] || '').trim();
      if (!celda) continue;

      const lineas = celda.split('\n').map(l => l.trim()).filter(l => l && l.toLowerCase() !== 'recreo');

      for (const nombre of lineas) {
        const esPlaza = plazaRegex.test(nombre);

        if (esPlaza) {
          plazasSet.add(nombre);
        } else {
          nombresSet.add(nombre);
        }

        guardias.push({
          dia_semana: dia,
          tramo_horario: tramo,
          nombreExcel: nombre,
          esPlaza,
        });
      }
    }
  }

  return {
    edificio: { id: edificio.id_edificio, nombre: edificio.nombre },
    guardias,
    nombresUnicos: [...nombresSet],
    plazas: [...plazasSet],
  };
}

module.exports = { parsearArchivo, parseBiffLabels, parseXlsxSheet, normalizarEdificio };
