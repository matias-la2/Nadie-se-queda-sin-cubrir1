const mysql = require('mysql2/promise');

const MAX_INTENTOS = 30;
const INTERVALO_MS = 2000;

async function esperarBD() {
  for (let i = 1; i <= MAX_INTENTOS; i++) {
    try {
      const conexion = await mysql.createConnection({
        host:     process.env.DB_HOST,
        port:     parseInt(process.env.DB_PORT, 10) || 3306,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      });
      await conexion.end();
      console.log(`[wait-for-db] MySQL listo (intento ${i}/${MAX_INTENTOS})`);
      process.exit(0);
    } catch (err) {
      console.log(`[wait-for-db] Intento ${i}/${MAX_INTENTOS} — ${err.code || err.message}`);
      await new Promise(r => setTimeout(r, INTERVALO_MS));
    }
  }
  console.error('[wait-for-db] No se pudo conectar a MySQL tras ' + MAX_INTENTOS + ' intentos');
  process.exit(1);
}

esperarBD();
