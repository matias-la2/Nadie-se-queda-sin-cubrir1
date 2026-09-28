'use strict';

const { normalizar, emparejar } = require('./nombres.service');
const { enviarEmail, plantillaNotificacion } = require('./email.service');

async function vincularNuevoUsuario(conn, usuario) {
  const nombreNorm = normalizar(`${usuario.nombre} ${usuario.apellidos}`);

  const [pendientes] = await conn.query(
    'SELECT * FROM profesor_pendiente_login WHERE nombre_normalizado = ?',
    [nombreNorm]
  );

  let pendiente = pendientes.length > 0 ? pendientes[0] : null;

  if (!pendiente) {
    const [allPendientes] = await conn.query('SELECT * FROM profesor_pendiente_login');
    if (allPendientes.length > 0) {
      const pendientesComoUsuarios = allPendientes.map(p => ({
        id: p.id,
        nombre: p.nombre_original,
        apellidos: '',
      }));
      const match = emparejar(
        `${usuario.nombre} ${usuario.apellidos}`,
        pendientesComoUsuarios,
        null
      );
      if (match.tipo === 'EXACTO') {
        pendiente = allPendientes.find(p => p.id === match.candidatos[0].id);
      }
    }
  }

  if (pendiente) {
    await conn.beginTransaction();
    try {
      await conn.query(
        'UPDATE guardia_creada SET id_usuario = ?, id_profesor_pendiente = NULL WHERE id_profesor_pendiente = ?',
        [usuario.id, pendiente.id]
      );

      await conn.query(
        'DELETE FROM profesor_pendiente_login WHERE id = ?',
        [pendiente.id]
      );

      await conn.query(
        `INSERT INTO alias_profesor (nombre_normalizado, id_usuario)
         VALUES (?, ?) ON DUPLICATE KEY UPDATE id_usuario = VALUES(id_usuario)`,
        [pendiente.nombre_normalizado, usuario.id]
      );

      await conn.query(
        `INSERT INTO log_acciones (accion, tabla_afectada, id_usuario, datos_extra)
         VALUES ('VINCULAR_PENDIENTE_LOGIN', 'guardia_creada', ?, ?)`,
        [usuario.id, JSON.stringify({ pendiente_nombre: pendiente.nombre_original })]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    return { vinculado: true, pendiente };
  }

  const [[{ tiene }]] = await conn.query(
    'SELECT COUNT(*) AS tiene FROM guardia_creada WHERE id_usuario = ?',
    [usuario.id]
  );

  if (tiene === 0) {
    const [directivos] = await conn.query(
      `SELECT DISTINCT u.id_usuario, u.correo FROM usuario u
       JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
       JOIN rol r ON ur.id_rol = r.id_rol
       WHERE r.nombre_rol IN ('EQUIPO_DIRECTIVO', 'ADMINISTRADOR')
       AND u.activo = 1`
    );

    const mensaje = `${usuario.nombre} ${usuario.apellidos} se ha registrado y no tiene guardias asignadas. ¿Ocupa alguna plaza pendiente?`;

    for (const d of directivos) {
      await conn.query(
        `INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo)
         VALUES (?, 'PLAZA_SIN_ASIGNAR', ?, ?, 'usuario')`,
        [d.id_usuario, mensaje, usuario.id]
      );
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const enlace = `/pages/admin/usuarios.html#pendientes&usuario=${usuario.id}`;
      const html = plantillaNotificacion({
        titulo: 'Nuevo profesor sin guardias',
        cuerpo: mensaje,
        enlace: `${frontendUrl}${enlace}`,
      });
      for (const d of directivos) {
        await enviarEmail({
          para: d.correo,
          asunto: 'Nuevo profesor sin guardias asignadas',
          html,
        });
      }
    } catch (_emailErr) { /* best-effort */ }

    return { vinculado: false, notificados: directivos.length };
  }

  return { vinculado: false, notificados: 0 };
}

module.exports = { vincularNuevoUsuario };
