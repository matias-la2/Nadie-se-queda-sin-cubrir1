'use strict';

require('dotenv').config();
var mysql = require('mysql2/promise');
var path = require('path');
var fs = require('fs');
var { execSync } = require('child_process');
var crearHelpers = require('./migraciones-helpers');

var MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');
var DB_A = 'portal_ies_migtest_a';
var DB_B = 'portal_ies_migtest_b';

function parseSqlFile(sql) {
  var lines = sql.split('\n');
  var statements = [];
  var delimiter = ';';
  var buffer = '';

  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('--')) continue;

    var delimMatch = trimmed.match(/^DELIMITER\s+(\S+)$/i);
    if (delimMatch) {
      delimiter = delimMatch[1];
      continue;
    }

    buffer += lines[i] + '\n';

    if (buffer.trimEnd().endsWith(delimiter)) {
      var stmt = buffer.trimEnd().slice(0, -delimiter.length).trim();
      if (stmt) statements.push(stmt);
      buffer = '';
    }
  }

  var remaining = buffer.trim();
  if (remaining) statements.push(remaining);
  return statements;
}

async function cargarSchema(root, dbName, sql) {
  var conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8mb4'
  });
  try {
    await conn.query('DROP DATABASE IF EXISTS ??', [dbName]);
    await conn.query('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', [dbName]);
    await conn.query('USE ??', [dbName]);
    var stmts = parseSqlFile(sql);
    for (var i = 0; i < stmts.length; i++) {
      await conn.query(stmts[i]);
    }
  } finally {
    await conn.end();
  }
}

async function ejecutarMigraciones(dbName) {
  var conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    charset: 'utf8mb4'
  });

  try {
    await conn.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (' +
      '  version     VARCHAR(3)   NOT NULL PRIMARY KEY,' +
      '  nombre      VARCHAR(200) NOT NULL,' +
      '  aplicada_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
      '  checksum    VARCHAR(64)  NULL' +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    var [applied] = await conn.query('SELECT version FROM schema_migrations');
    var appliedSet = new Set(applied.map(function (r) { return r.version; }));

    var files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(function (f) { return f.endsWith('.js') && /^\d{3}_/.test(f); })
      .sort();

    var h = crearHelpers(conn);
    var count = 0;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var version = file.slice(0, 3);
      if (appliedSet.has(version)) continue;

      var filePath = path.join(MIGRATIONS_DIR, file);
      // Clear require cache for re-runs
      delete require.cache[require.resolve(filePath)];
      var migration = require(filePath);
      var crypto = require('crypto');
      var checksum = crypto.createHash('sha256')
        .update(fs.readFileSync(filePath))
        .digest('hex');

      await migration.up(conn, h);
      await conn.query(
        'INSERT INTO schema_migrations (version, nombre, checksum) VALUES (?, ?, ?)',
        [version, file.replace('.js', ''), checksum]
      );
      count++;
    }
    return count;
  } finally {
    await conn.end();
  }
}

async function obtenerEstructura(dbName) {
  var conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    charset: 'utf8mb4'
  });

  try {
    var [tablas] = await conn.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
      [dbName]
    );

    var [columnas] = await conn.query(
      'SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, ORDINAL_POSITION ' +
      'FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION',
      [dbName]
    );

    var [indices] = await conn.query(
      'SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols ' +
      'FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? ' +
      'GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE ORDER BY TABLE_NAME, INDEX_NAME',
      [dbName]
    );

    var [fks] = await conn.query(
      'SELECT tc.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME, ' +
      'rc.UPDATE_RULE, rc.DELETE_RULE ' +
      'FROM information_schema.TABLE_CONSTRAINTS tc ' +
      'JOIN information_schema.KEY_COLUMN_USAGE kcu ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA ' +
      'JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA ' +
      "WHERE tc.TABLE_SCHEMA = ? AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY' ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME",
      [dbName]
    );

    var [triggers] = await conn.query(
      'SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING, ACTION_STATEMENT ' +
      'FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ? ORDER BY TRIGGER_NAME',
      [dbName]
    );

    return {
      tablas: tablas.map(function (r) { return r.TABLE_NAME; }),
      columnas: columnas.map(function (r) {
        return r.TABLE_NAME + '.' + r.COLUMN_NAME + ' ' + r.COLUMN_TYPE + ' ' +
          (r.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL') +
          (r.COLUMN_DEFAULT !== null ? ' DEFAULT=' + r.COLUMN_DEFAULT : '');
      }),
      indices: indices.map(function (r) {
        return r.TABLE_NAME + '.' + r.INDEX_NAME + ' (' + r.cols + ') unique=' + (r.NON_UNIQUE === 0);
      }),
      fks: fks.map(function (r) {
        return r.TABLE_NAME + '.' + r.CONSTRAINT_NAME + ' ' + r.COLUMN_NAME + '->' +
          r.REFERENCED_TABLE_NAME + '.' + r.REFERENCED_COLUMN_NAME +
          ' ON UPDATE ' + r.UPDATE_RULE + ' ON DELETE ' + r.DELETE_RULE;
      }),
      triggers: triggers.map(function (r) {
        return r.TRIGGER_NAME + ' ' + r.ACTION_TIMING + ' ' + r.EVENT_MANIPULATION + ' ON ' + r.EVENT_OBJECT_TABLE;
      }),
      triggerBodies: triggers.map(function (r) {
        return r.TRIGGER_NAME + ': ' + r.ACTION_STATEMENT.replace(/\s+/g, ' ').trim();
      })
    };
  } finally {
    await conn.end();
  }
}

function compararArrays(nombre, a, b) {
  var setA = new Set(a);
  var setB = new Set(b);
  var diffs = [];

  for (var i = 0; i < a.length; i++) {
    if (!setB.has(a[i])) diffs.push('  Solo en A: ' + a[i]);
  }
  for (var j = 0; j < b.length; j++) {
    if (!setA.has(b[j])) diffs.push('  Solo en B: ' + b[j]);
  }

  if (diffs.length === 0) {
    console.log('  ' + nombre + ': OK (' + a.length + ' elementos)');
    return true;
  } else {
    console.log('  ' + nombre + ': DIFERENCIAS');
    for (var k = 0; k < diffs.length; k++) console.log(diffs[k]);
    return false;
  }
}

async function limpiar() {
  var conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8mb4'
  });
  try {
    await conn.query('DROP DATABASE IF EXISTS ??', [DB_A]);
    await conn.query('DROP DATABASE IF EXISTS ??', [DB_B]);
  } finally {
    await conn.end();
  }
}

async function main() {
  console.log('\n=== Prueba de equivalencia de migraciones ===\n');

  try {
    // 1. Obtener schemas
    console.log('1. Obteniendo schema.sql antiguo (8ea47fa)...');
    var oldSchema = execSync('git show 8ea47fa:database/schema.sql', { encoding: 'utf8' });
    var newSchema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');

    // 2. Crear BD A (schema antiguo)
    console.log('2. Creando ' + DB_A + ' con schema antiguo...');
    await cargarSchema(DB_A, DB_A, oldSchema);

    // 3. Crear BD B (schema nuevo)
    console.log('3. Creando ' + DB_B + ' con schema nuevo...');
    await cargarSchema(DB_B, DB_B, newSchema);

    // 4. Ejecutar migraciones en A
    console.log('4. Ejecutando migraciones en ' + DB_A + '...');
    var countA = await ejecutarMigraciones(DB_A);
    console.log('   ' + countA + ' migracion(es) aplicadas en A');

    // 5. Ejecutar migraciones en B
    console.log('5. Ejecutando migraciones en ' + DB_B + '...');
    var countB = await ejecutarMigraciones(DB_B);
    console.log('   ' + countB + ' migracion(es) aplicadas en B');

    // 6. Comparar
    console.log('\n6. Comparando estructuras...\n');
    var estA = await obtenerEstructura(DB_A);
    var estB = await obtenerEstructura(DB_B);

    var ok = true;
    ok = compararArrays('Tablas', estA.tablas, estB.tablas) && ok;
    ok = compararArrays('Columnas', estA.columnas, estB.columnas) && ok;
    ok = compararArrays('Indices', estA.indices, estB.indices) && ok;
    ok = compararArrays('Foreign Keys', estA.fks, estB.fks) && ok;
    ok = compararArrays('Triggers (cabecera)', estA.triggers, estB.triggers) && ok;
    ok = compararArrays('Triggers (cuerpo)', estA.triggerBodies, estB.triggerBodies) && ok;

    if (ok) {
      console.log('\n  RESULTADO: Las dos BD son estructuralmente identicas.\n');
    } else {
      console.log('\n  RESULTADO: Hay diferencias (ver arriba).\n');
    }

    // 7. Segunda ejecucion (debe ser no-op)
    console.log('7. Segunda ejecucion de migraciones (debe ser no-op)...');
    var countA2 = await ejecutarMigraciones(DB_A);
    var countB2 = await ejecutarMigraciones(DB_B);
    console.log('   A: ' + countA2 + ' aplicadas (esperado: 0)');
    console.log('   B: ' + countB2 + ' aplicadas (esperado: 0)');

    if (countA2 !== 0 || countB2 !== 0) {
      console.log('   FALLO: Las migraciones no son idempotentes');
    } else {
      console.log('   OK: Idempotencia confirmada');
    }

    // 8. Limpiar
    console.log('\n8. Eliminando BD temporales...');
    await limpiar();
    console.log('   OK\n');

    process.exit(ok && countA2 === 0 && countB2 === 0 ? 0 : 1);
  } catch (err) {
    console.error('\nError: ' + err.message);
    console.error(err.stack);
    try { await limpiar(); } catch (e) { /* ignore */ }
    process.exit(1);
  }
}

main();
