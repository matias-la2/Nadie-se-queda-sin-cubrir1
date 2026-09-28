'use strict';

async function edificioDeGuardias(conn, idEdificio) {
  if (!idEdificio) return idEdificio;
  const [rows] = await conn.query(
    'SELECT id_edificio_guardias FROM edificio WHERE id_edificio = ?',
    [idEdificio]
  );
  if (rows.length === 0) return idEdificio;
  return rows[0].id_edificio_guardias || idEdificio;
}

module.exports = { edificioDeGuardias };
