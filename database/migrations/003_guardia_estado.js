'use strict';

exports.up = async function (conn, h) {
  if (!await h.columnaExiste('guardia_asignada', 'estado')) {
    await conn.query(`
      ALTER TABLE guardia_asignada ADD COLUMN estado ENUM('PENDIENTE','ACEPTADA','RECHAZADA')
        NOT NULL DEFAULT 'PENDIENTE' AFTER tipo_asignacion
    `);
  }

  const valores = await h.valoresEnum('notificacion', 'tipo');
  const necesarios = ['GUARDIA_PENDIENTE', 'GUARDIA_RECHAZADA'];
  const faltan = necesarios.filter(v => !valores.includes(v));
  if (faltan.length > 0) {
    const todos = [...valores, ...faltan];
    const enumStr = todos.map(v => "'" + v + "'").join(',');
    await conn.query('ALTER TABLE notificacion MODIFY COLUMN tipo ENUM(' + enumStr + ') NOT NULL');
  }

  if (!await h.indiceExiste('guardia_asignada', 'idx_ga_estado')) {
    await conn.query('CREATE INDEX idx_ga_estado ON guardia_asignada(estado)');
  }
};
