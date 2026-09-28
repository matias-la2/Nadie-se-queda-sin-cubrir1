'use strict';

exports.up = async function (conn, h) {
  if (!await h.columnaExiste('ausencia', 'archivo_tarea')) {
    await conn.query(`
      ALTER TABLE ausencia ADD COLUMN archivo_tarea VARCHAR(500) NULL
        COMMENT 'Ruta al archivo adjunto con la tarea (opcional)' AFTER descripcion_tarea
    `);
  }
};
