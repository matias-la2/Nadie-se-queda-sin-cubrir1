'use strict';

require('dotenv').config();
var mysql = require('mysql2/promise');
var path = require('path');
var fs = require('fs');
var crearHelpers = require('./migraciones-helpers');

var MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

var DETECCIONES = {
  '001': function (h) { return h.tablaExiste('profesor_edificio'); },
  '002': function (h) { return h.columnaExiste('ausencia', 'archivo_tarea'); },
  '003': function (h) { return h.columnaExiste('guardia_asignada', 'estado'); },
  '004': async function (h) {
    return await h.tablaExiste('espacio_curso') && await h.columnaExiste('espacio', 'planta');
  },
  '005': async function (h) {
    return await h.tablaExiste('plaza_pendiente') && await h.columnaExiste('guardia_creada', 'origen');
  },
  '006': async function (h) {
    var cuerpo = await h.cuerpoTrigger('trg_gc_titular_insert');
    return cuerpo !== null && cuerpo.indexOf('exclusivo') !== -1;
  },
  '007': async function (h) {
    return await h.columnaExiste('edificio', 'id_edificio_guardias') &&
           await h.fkExiste('edificio', 'fk_edificio_guardias');
  }
};

async function mostrarEstado(dbOverride) {
  var dbName = dbOverride || process.env.DB_NAME || 'portal_ies';

  var conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    charset: 'utf8mb4'
  });

  try {
    var [tables] = await conn.query(
      "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'schema_migrations'",
      [dbName]
    );
    var registered = new Map();
    if (tables.length > 0) {
      var [rows] = await conn.query('SELECT version, nombre, aplicada_en FROM schema_migrations ORDER BY version');
      for (var i = 0; i < rows.length; i++) {
        registered.set(rows[i].version, rows[i]);
      }
    }

    var files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(function (f) { return f.endsWith('.js') && /^\d{3}_/.test(f); })
      .sort();

    var h = crearHelpers(conn);

    console.log('\nEstado de migraciones — BD: ' + dbName + '\n');

    for (var j = 0; j < files.length; j++) {
      var file = files[j];
      var version = file.slice(0, 3);
      var nombre = file.replace('.js', '');
      var reg = registered.get(version);

      var detectada = '?';
      if (DETECCIONES[version]) {
        try {
          detectada = await DETECCIONES[version](h) ? 'si' : 'no';
        } catch (e) {
          detectada = 'error';
        }
      }

      var estado;
      if (reg && detectada === 'si') {
        estado = '✓ OK';
      } else if (!reg && detectada === 'si') {
        estado = '⚠ Aplicada sin registrar';
      } else if (!reg && detectada === 'no') {
        estado = '✗ Pendiente';
      } else if (reg && detectada === 'no') {
        estado = '⁉ Registrada pero no detectada';
      } else {
        estado = '?';
      }

      var regStr = reg ? 'si' : 'no';
      console.log('  ' + version + ' ' + nombre.padEnd(35) + ' Reg: ' + regStr.padEnd(4) + ' Esquema: ' + detectada.padEnd(6) + ' ' + estado);
    }

    console.log('');
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  mostrarEstado().catch(function (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  });
}

module.exports = { mostrarEstado: mostrarEstado };
