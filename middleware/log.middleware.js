const pool = require('../config/db');

function registrarAccion(accion, tablaAfectada) {
  return async (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode < 400) {
        try {
          await pool.query(
            `INSERT INTO log_acciones (id_usuario, accion, tabla_afectada, registro_id, ip)
             VALUES (?, ?, ?, ?, ?)`,
            [
              req.usuario?.id || null,
              accion,
              tablaAfectada,
              res.registroId || null,
              req.ip
            ]
          );
        } catch (err) {
          console.error('Error registrando log:', err.message);
        }
      } else {
        try {
          await pool.query(
            `INSERT INTO log_acciones (id_usuario, accion, tabla_afectada, registro_id, ip, datos_extra)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              req.usuario?.id || null,
              accion,
              tablaAfectada,
              res.registroId || null,
              req.ip,
              JSON.stringify({ error: true, status: res.statusCode })
            ]
          );
        } catch (err) {
          console.error('Error registrando log:', err.message);
        }
      }
    });
    next();
  };
}

module.exports = { registrarAccion };
