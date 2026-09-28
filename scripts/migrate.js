'use strict';

require('dotenv').config();
var mysql = require('mysql2/promise');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var crearHelpers = require('./migraciones-helpers');

var MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

async function ejecutarMigraciones(dbOverride) {
  var dbName = dbOverride || process.env.DB_NAME || 'portal_ies';

  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--confirmo-backup')) {
    console.error(
      '\n⛔ NODE_ENV=production: npm run migrate se niega a ejecutarse sin confirmacion.\n\n' +
      'Antes de migrar en produccion:\n' +
      '  1. Haz una copia de seguridad de la BD (mysqldump o backup de Easypanel)\n' +
      '  2. Verifica que la copia es valida (restaurala en un entorno de prueba)\n' +
      '  3. Ejecuta: npm run migrate -- --confirmo-backup\n'
    );
    process.exit(1);
  }

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

      if (appliedSet.has(version)) {
        console.log('  ─ ' + file + ' (ya registrada)');
        continue;
      }

      var filePath = path.join(MIGRATIONS_DIR, file);
      var migration = require(filePath);
      var checksum = crypto.createHash('sha256')
        .update(fs.readFileSync(filePath))
        .digest('hex');

      console.log('▶ ' + file + '...');
      try {
        await migration.up(conn, h);
        await conn.query(
          'INSERT INTO schema_migrations (version, nombre, checksum) VALUES (?, ?, ?)',
          [version, file.replace('.js', ''), checksum]
        );
        console.log('  ✓ ' + file);
        count++;
      } catch (err) {
        console.error('  ✗ ' + file + ': ' + err.message);
        process.exit(1);
      }
    }

    if (count === 0) {
      console.log('\nTodas las migraciones ya estan aplicadas.');
    } else {
      console.log('\n' + count + ' migracion(es) aplicada(s).');
    }
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  ejecutarMigraciones().catch(function (err) {
    console.error('Error fatal: ' + err.message);
    process.exit(1);
  });
}

module.exports = { ejecutarMigraciones: ejecutarMigraciones };
