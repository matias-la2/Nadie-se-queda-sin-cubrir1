const pool = require('../config/db');

function registrarAccion(accion, tablaAfectada) {
  return async (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
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
      }
    });
    next();
  };
}

module.exports = { registrarAccion };
