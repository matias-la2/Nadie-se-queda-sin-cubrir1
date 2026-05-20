const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');
const { paginar, respuestaPaginada } = require('../helpers/pagination.helper');
const { enviarEmail, plantillaNotificacion } = require('../services/email.service');

// ─── GUARDIAS CREADAS (planificadas) ───────────────────

async function listarCreadas(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);
    const where = [];
    const params = [];

    if (req.query.id_usuario) {
      where.push('gc.id_usuario = ?');
      params.push(req.query.id_usuario);
    }
    if (req.query.dia_semana) {
      where.push('gc.dia_semana = ?');
      params.push(req.query.dia_semana);
    }
    if (req.query.curso_escolar) {
      where.push('gc.curso_escolar = ?');
      params.push(req.query.curso_escolar);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM guardia_creada gc ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT gc.*,
              u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              es.nombre AS espacio_nombre
       FROM guardia_creada gc
       JOIN usuario u ON gc.id_usuario = u.id_usuario
       LEFT JOIN espacio es ON gc.id_espacio = es.id_espacio
       ${whereSql}
       ORDER BY gc.dia_semana, gc.tramo_horario
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

async function obtenerCreada(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT gc.*,
              u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              es.nombre AS espacio_nombre
       FROM guardia_creada gc
       JOIN usuario u ON gc.id_usuario = u.id_usuario
       LEFT JOIN espacio es ON gc.id_espacio = es.id_espacio
       WHERE gc.id_guardia_creada = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return error(res, 'Guardia no encontrada', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function crearCreada(req, res, next) {
  try {
    const { fecha, dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio } = req.body;
    const [result] = await pool.query(
      `INSERT INTO guardia_creada (fecha, dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fecha || null, dia_semana || null, tramo_horario, curso_escolar, id_usuario, id_espacio || null]
    );
    res.registroId = result.insertId;
    return success(res, { id: result.insertId }, 201);
  } catch (err) {
    next(err);
  }
}

async function actualizarCreada(req, res, next) {
  try {
    const campos = [];
    const valores = [];
    if (req.body.fecha !== undefined) { campos.push('fecha = ?'); valores.push(req.body.fecha); }
    if (req.body.dia_semana !== undefined) { campos.push('dia_semana = ?'); valores.push(req.body.dia_semana); }
    if (req.body.tramo_horario !== undefined) { campos.push('tramo_horario = ?'); valores.push(req.body.tramo_horario); }
    if (req.body.curso_escolar !== undefined) { campos.push('curso_escolar = ?'); valores.push(req.body.curso_escolar); }
    if (req.body.id_usuario !== undefined) { campos.push('id_usuario = ?'); valores.push(req.body.id_usuario); }
    if (req.body.id_espacio !== undefined) { campos.push('id_espacio = ?'); valores.push(req.body.id_espacio); }
    if (campos.length === 0) return error(res, 'No se enviaron campos para actualizar', 400);

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE guardia_creada SET ${campos.join(', ')} WHERE id_guardia_creada = ?`,
      valores
    );
    if (result.affectedRows === 0) return error(res, 'Guardia no encontrada', 404);
    return success(res, { mensaje: 'Guardia actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminarCreada(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM guardia_creada WHERE id_guardia_creada = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Guardia no encontrada', 404);
    return success(res, { mensaje: 'Guardia eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function crearGrupo(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { dia_semana, tramo_horario, curso_escolar, id_espacio, id_usuarios } = req.body;

    await conn.beginTransaction();

    const ids = [];
    for (const id_usuario of id_usuarios) {
      const [result] = await conn.query(
        `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio)
         VALUES (?, ?, ?, ?, ?)`,
        [dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio || null]
      );
      ids.push(result.insertId);
    }

    await conn.commit();
    return success(res, { ids, total: ids.length }, 201);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// ─── GUARDIAS ASIGNADAS ────────────────────────────────

async function listarAsignadas(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);
    const where = [];
    const params = [];

    if (req.query.fecha) {
      where.push('ga.fecha = ?');
      params.push(req.query.fecha);
    }
    if (req.query.id_profesor_sustituto) {
      where.push('ga.id_profesor_sustituto = ?');
      params.push(req.query.id_profesor_sustituto);
    }
    if (req.query.id_ausencia) {
      where.push('ga.id_ausencia = ?');
      params.push(req.query.id_ausencia);
    }
    if (req.query.fecha_desde) {
      where.push('ga.fecha >= ?');
      params.push(req.query.fecha_desde);
    }
    if (req.query.fecha_hasta) {
      where.push('ga.fecha <= ?');
      params.push(req.query.fecha_hasta);
    }

    const esProfesor = req.usuario.roles.length === 1 && req.usuario.roles[0] === 'PROFESOR';
    if (esProfesor) {
      where.push('ga.id_profesor_sustituto = ?');
      params.push(req.usuario.id);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM guardia_asignada ga ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT ga.*,
              us.nombre AS sustituto_nombre, us.apellidos AS sustituto_apellidos,
              ua.nombre AS ausente_nombre, ua.apellidos AS ausente_apellidos,
              c.curso AS clase_curso,
              a.tramo_horario AS ausencia_tramo
       FROM guardia_asignada ga
       JOIN usuario us ON ga.id_profesor_sustituto = us.id_usuario
       JOIN ausencia a ON ga.id_ausencia = a.id_ausencia
       JOIN usuario ua ON a.id_profesor = ua.id_usuario
       LEFT JOIN clase c ON ga.id_clase = c.id_clase
       ${whereSql}
       ORDER BY ga.fecha DESC, ga.tramo_horario
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

async function crearAsignada(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { fecha, tramo_horario, tipo_asignacion, comentario,
            id_ausencia, id_profesor_sustituto, id_clase, id_guardia_creada } = req.body;

    const [[{ conflictos }]] = await conn.query(
      `SELECT COUNT(*) as conflictos FROM guardia_asignada
       WHERE id_profesor_sustituto = ? AND fecha = ? AND tramo_horario = ?
       AND estado IN ('PENDIENTE', 'ACEPTADA')`,
      [id_profesor_sustituto, fecha, tramo_horario]
    );
    if (conflictos > 0) {
      return error(res, 'El profesor sustituto ya tiene una guardia asignada en ese horario', 409);
    }

    const [edificiosAusencia] = await conn.query(
      `SELECT DISTINCT es.id_edificio
       FROM ausencia_espacio ae
       JOIN espacio es ON ae.id_espacio = es.id_espacio
       WHERE ae.id_ausencia = ?`,
      [id_ausencia]
    );

    if (edificiosAusencia.length > 0) {
      const idsEdificioAusencia = edificiosAusencia.map(e => e.id_edificio);
      const [[{ coincide }]] = await conn.query(
        `SELECT COUNT(*) as coincide FROM profesor_edificio
         WHERE id_usuario = ? AND id_edificio IN (?)`,
        [id_profesor_sustituto, idsEdificioAusencia]
      );
      if (coincide === 0) {
        return error(res, 'El profesor sustituto no pertenece al edificio de la ausencia', 400);
      }
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO guardia_asignada
       (fecha, tramo_horario, tipo_asignacion, estado, comentario, id_ausencia, id_profesor_sustituto, id_clase, id_guardia_creada)
       VALUES (?, ?, ?, 'PENDIENTE', ?, ?, ?, ?, ?)`,
      [fecha, tramo_horario, tipo_asignacion || 'MANUAL', comentario || null,
       id_ausencia, id_profesor_sustituto, id_clase || null, id_guardia_creada || null]
    );
    const idGuardiaAsignada = result.insertId;

    const [[ausencia]] = await conn.query(
      `SELECT a.*, u.nombre AS ausente_nombre, u.apellidos AS ausente_apellidos
       FROM ausencia a
       JOIN usuario u ON a.id_profesor = u.id_usuario
       WHERE a.id_ausencia = ?`,
      [id_ausencia]
    );

    let mensaje = `Se te ha asignado una guardia el ${fecha} en el tramo ${tramo_horario}. Por favor, acepta o rechaza la asignación.`;
    if (ausencia.hay_tarea) {
      mensaje += ' Hay tarea para los alumnos.';
    }

    await conn.query(
      `INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo)
       VALUES (?, 'GUARDIA_PENDIENTE', ?, ?, 'guardia_asignada')`,
      [id_profesor_sustituto, mensaje, idGuardiaAsignada]
    );

    await conn.commit();

    try {
      const [[sustituto]] = await pool.query(
        `SELECT correo FROM usuario WHERE id_usuario = ?`,
        [id_profesor_sustituto]
      );

      let cuerpo = `Has sido asignado/a para cubrir la ausencia de ${ausencia.ausente_nombre} ${ausencia.ausente_apellidos} el ${fecha} en el tramo ${tramo_horario}.`;
      if (ausencia.hay_tarea && ausencia.descripcion_tarea) {
        cuerpo += ` Tarea para los alumnos: ${ausencia.descripcion_tarea}`;
      }

      const html = plantillaNotificacion({
        titulo: `Guardia asignada - ${fecha}`,
        cuerpo,
        enlace: null
      });

      await enviarEmail({
        para: sustituto.correo,
        asunto: `Guardia asignada - ${fecha}`,
        html
      });
    } catch (_emailErr) {
      // Best-effort: si el email falla, la guardia ya está asignada
    }

    res.registroId = idGuardiaAsignada;
    return success(res, { id: idGuardiaAsignada }, 201);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function eliminarAsignada(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM guardia_asignada WHERE id_guardia_asignada = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Guardia asignada no encontrada', 404);
    return success(res, { mensaje: 'Guardia asignada eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function responderGuardia(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { accion } = req.body;
    const idUsuario = req.usuario.id;

    if (!['ACEPTADA', 'RECHAZADA'].includes(accion)) {
      return error(res, 'Acción no válida. Usa ACEPTADA o RECHAZADA', 400);
    }

    const [[guardia]] = await conn.query(
      `SELECT ga.*, a.id_profesor AS id_ausente, a.hay_tarea, a.descripcion_tarea
       FROM guardia_asignada ga
       JOIN ausencia a ON ga.id_ausencia = a.id_ausencia
       WHERE ga.id_guardia_asignada = ?`,
      [id]
    );

    if (!guardia) return error(res, 'Guardia asignada no encontrada', 404);
    if (guardia.id_profesor_sustituto !== idUsuario) {
      return error(res, 'No tienes permiso para responder a esta guardia', 403);
    }
    if (guardia.estado !== 'PENDIENTE') {
      return error(res, 'Esta guardia ya fue respondida', 409);
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE guardia_asignada SET estado = ? WHERE id_guardia_asignada = ?`,
      [accion, id]
    );

    const [[sustituto]] = await conn.query(
      `SELECT nombre, apellidos FROM usuario WHERE id_usuario = ?`,
      [idUsuario]
    );

    if (accion === 'ACEPTADA') {
      await conn.query(
        `UPDATE ausencia SET estado = 'CUBIERTA' WHERE id_ausencia = ?`,
        [guardia.id_ausencia]
      );

      const [directivos] = await conn.query(
        `SELECT ur.id_usuario FROM usuario_rol ur
         JOIN rol r ON ur.id_rol = r.id_rol
         WHERE r.nombre_rol IN ('EQUIPO_DIRECTIVO', 'ADMINISTRADOR')`
      );

      const msgDirectivo = `${sustituto.nombre} ${sustituto.apellidos} ha aceptado la guardia del ${guardia.fecha} (${guardia.tramo_horario}).`;
      for (const d of directivos) {
        await conn.query(
          `INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo)
           VALUES (?, 'AUSENCIA_ASIGNADA', ?, ?, 'guardia_asignada')`,
          [d.id_usuario, msgDirectivo, id]
        );
      }
    }

    let reasignado = null;

    if (accion === 'RECHAZADA') {
      const [profesoresRechazaron] = await conn.query(
        `SELECT id_profesor_sustituto FROM guardia_asignada
         WHERE id_ausencia = ? AND estado = 'RECHAZADA'`,
        [guardia.id_ausencia]
      );
      const idsExcluir = profesoresRechazaron.map(r => r.id_profesor_sustituto);
      idsExcluir.push(guardia.id_ausente);

      const resultado = await asignarAutomaticamente(
        conn, guardia.id_ausencia, guardia.fecha, guardia.tramo_horario,
        guardia.id_ausente, guardia.hay_tarea, idsExcluir
      );

      if (resultado) {
        reasignado = { id_usuario: resultado.id_usuario, nombre: resultado.nombre };
      } else {
        await conn.query(
          `UPDATE ausencia SET estado = 'SIN_CUBRIR' WHERE id_ausencia = ?`,
          [guardia.id_ausencia]
        );

        const [directivos] = await conn.query(
          `SELECT ur.id_usuario FROM usuario_rol ur
           JOIN rol r ON ur.id_rol = r.id_rol
           WHERE r.nombre_rol IN ('EQUIPO_DIRECTIVO', 'ADMINISTRADOR')`
        );

        const msgDirectivo = `No quedan profesores disponibles para cubrir la guardia del ${guardia.fecha} (${guardia.tramo_horario}). Todos los candidatos han rechazado.`;
        for (const d of directivos) {
          await conn.query(
            `INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo)
             VALUES (?, 'GUARDIA_RECHAZADA', ?, ?, 'guardia_asignada')`,
            [d.id_usuario, msgDirectivo, id]
          );
        }
      }
    }

    await conn.commit();

    const respuesta = { mensaje: accion === 'ACEPTADA' ? 'Guardia aceptada' : 'Guardia rechazada' };
    if (reasignado) {
      respuesta.reasignado_a = reasignado.nombre;
    }
    return success(res, respuesta);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// ─── ASIGNACION AUTOMATICA ─────────────────────────────

async function asignarAutomaticamente(conn, idAusencia, fecha, tramoHorario, idProfesorAusente, hayTarea, idsExcluir) {
  const diaSemana = new Date(fecha).getDay();
  const diaSemanaDB = diaSemana === 0 ? 7 : diaSemana;

  const excluidos = Array.isArray(idsExcluir) && idsExcluir.length > 0
    ? idsExcluir
    : [idProfesorAusente];
  if (!excluidos.includes(idProfesorAusente)) excluidos.push(idProfesorAusente);

  const [candidatos] = await conn.query(
    `SELECT gc.id_usuario, MIN(gc.id_guardia_creada) AS id_guardia_creada,
            u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
            COALESCE(conteo.total, 0) AS guardias_realizadas
     FROM guardia_creada gc
     JOIN usuario u ON gc.id_usuario = u.id_usuario
     LEFT JOIN (
       SELECT id_profesor_sustituto, COUNT(*) AS total
       FROM guardia_asignada
       WHERE estado = 'ACEPTADA' AND fecha >= '2025-09-01'
       GROUP BY id_profesor_sustituto
     ) conteo ON gc.id_usuario = conteo.id_profesor_sustituto
     WHERE (gc.dia_semana = ? OR gc.fecha = ?)
     AND gc.tramo_horario = ?
     AND gc.id_usuario NOT IN (?)
     AND NOT EXISTS (
       SELECT 1 FROM guardia_asignada ga2
       WHERE ga2.id_profesor_sustituto = gc.id_usuario
       AND ga2.fecha = ? AND ga2.tramo_horario = ?
       AND ga2.estado IN ('PENDIENTE', 'ACEPTADA')
     )
     GROUP BY gc.id_usuario, u.nombre, u.apellidos, conteo.total
     ORDER BY guardias_realizadas ASC, RAND()
     LIMIT 1`,
    [diaSemanaDB, fecha, tramoHorario, excluidos, fecha, tramoHorario]
  );

  if (candidatos.length === 0) {
    return null;
  }

  const elegido = candidatos[0];

  const [result] = await conn.query(
    `INSERT INTO guardia_asignada
     (fecha, tramo_horario, tipo_asignacion, estado, comentario, id_ausencia, id_profesor_sustituto, id_guardia_creada)
     VALUES (?, ?, 'AUTOMATICA', 'PENDIENTE', 'Asignada automaticamente', ?, ?, ?)`,
    [fecha, tramoHorario, idAusencia, elegido.id_usuario, elegido.id_guardia_creada || null]
  );
  const idGuardiaAsignada = result.insertId;

  let mensaje = `Se te ha asignado una guardia el ${fecha} en el tramo ${tramoHorario}. Por favor, acepta o rechaza la asignacion.`;
  if (hayTarea) {
    mensaje += ' Hay tarea para los alumnos.';
  }

  await conn.query(
    `INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo)
     VALUES (?, 'GUARDIA_PENDIENTE', ?, ?, 'guardia_asignada')`,
    [elegido.id_usuario, mensaje, idGuardiaAsignada]
  );

  try {
    const [[correo]] = await conn.query(
      `SELECT correo FROM usuario WHERE id_usuario = ?`, [elegido.id_usuario]
    );
    const htmlEmail = plantillaNotificacion({
      titulo: `Guardia asignada - ${fecha}`,
      cuerpo: mensaje,
      enlace: null
    });
    await enviarEmail({ para: correo.correo, asunto: `Guardia asignada - ${fecha}`, html: htmlEmail });
  } catch (_emailErr) {}

  return {
    id_guardia_asignada: idGuardiaAsignada,
    id_usuario: elegido.id_usuario,
    nombre: `${elegido.profesor_nombre} ${elegido.profesor_apellidos}`,
    guardias_realizadas: elegido.guardias_realizadas
  };
}

// ─── GUARDIAS DE HOY ───────────────────────────────────

async function guardiasHoy(req, res, next) {
  try {
    const filtroEdificio = req.query.id_edificio ? parseInt(req.query.id_edificio) : null;

    let ausenciaSql = `
      SELECT a.*, u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
             p.departamento
      FROM ausencia a
      JOIN usuario u ON a.id_profesor = u.id_usuario
      JOIN profesor p ON a.id_profesor = p.id_usuario
      WHERE a.fecha = CURDATE()
      AND a.estado IN ('PENDIENTE', 'SIN_CUBRIR')`;
    const ausenciaParams = [];

    if (filtroEdificio) {
      ausenciaSql += ` AND EXISTS (
        SELECT 1 FROM ausencia_espacio ae
        JOIN espacio es ON ae.id_espacio = es.id_espacio
        WHERE ae.id_ausencia = a.id_ausencia AND es.id_edificio = ?
      )`;
      ausenciaParams.push(filtroEdificio);
    }

    const [ausencias] = await pool.query(ausenciaSql, ausenciaParams);

    const idsAusencias = ausencias.map(a => a.id_ausencia);
    const espaciosPorAusencia = new Map();
    if (idsAusencias.length > 0) {
      const [todosEspacios] = await pool.query(
        `SELECT ae.id_ausencia, es.id_espacio, es.nombre, e.id_edificio, e.nombre AS edificio_nombre
         FROM ausencia_espacio ae
         JOIN espacio es ON ae.id_espacio = es.id_espacio
         JOIN edificio e ON es.id_edificio = e.id_edificio
         WHERE ae.id_ausencia IN (?)`,
        [idsAusencias]
      );
      for (const row of todosEspacios) {
        if (!espaciosPorAusencia.has(row.id_ausencia)) {
          espaciosPorAusencia.set(row.id_ausencia, []);
        }
        espaciosPorAusencia.get(row.id_ausencia).push(row);
      }
    }
    for (const aus of ausencias) {
      const espacios = espaciosPorAusencia.get(aus.id_ausencia) || [];
      aus.espacios = espacios;
      aus.edificios = [...new Set(espacios.map(e => e.id_edificio))];
    }

    // WEEKDAY: 0=Lun...4=Vie → +1 para nuestro 1=Lun...5=Vie
    let disponibleSql = `
      SELECT gc.*, u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
             es.nombre AS espacio_nombre,
             GROUP_CONCAT(DISTINCT e.id_edificio) AS edificio_ids,
             GROUP_CONCAT(DISTINCT e.nombre) AS edificio_nombres
      FROM guardia_creada gc
      JOIN usuario u ON gc.id_usuario = u.id_usuario
      LEFT JOIN espacio es ON gc.id_espacio = es.id_espacio
      LEFT JOIN profesor_edificio pe ON gc.id_usuario = pe.id_usuario
      LEFT JOIN edificio e ON pe.id_edificio = e.id_edificio
      WHERE (gc.dia_semana = WEEKDAY(CURDATE()) + 1 OR gc.fecha = CURDATE())
      AND NOT EXISTS (
        SELECT 1 FROM guardia_asignada ga
        WHERE ga.id_profesor_sustituto = gc.id_usuario
        AND ga.fecha = CURDATE()
        AND ga.tramo_horario = gc.tramo_horario
        AND ga.estado IN ('PENDIENTE', 'ACEPTADA')
      )`;
    const disponibleParams = [];

    if (filtroEdificio) {
      disponibleSql += ` AND EXISTS (
        SELECT 1 FROM profesor_edificio pe2
        WHERE pe2.id_usuario = gc.id_usuario AND pe2.id_edificio = ?
      )`;
      disponibleParams.push(filtroEdificio);
    }

    disponibleSql += ` GROUP BY gc.id_guardia_creada, gc.id_usuario, gc.dia_semana, gc.tramo_horario,
                                gc.curso_escolar, gc.fecha, gc.id_espacio,
                                u.nombre, u.apellidos, es.nombre`;

    const [disponibles] = await pool.query(disponibleSql, disponibleParams);

    for (const d of disponibles) {
      d.edificios = d.edificio_ids ? d.edificio_ids.split(',').map(Number) : [];
      d.edificio_nombres = d.edificio_nombres ? d.edificio_nombres.split(',') : [];
      delete d.edificio_ids;
    }

    const idsDisponibles = [...new Set(disponibles.map(d => d.id_usuario))];
    const conteoGrupoMap = {};
    if (idsDisponibles.length > 0) {
      const [conteos] = await pool.query(
        `SELECT id_profesor_sustituto, WEEKDAY(fecha) + 1 AS dia_semana,
                tramo_horario, COUNT(*) AS total
         FROM guardia_asignada
         WHERE estado = 'ACEPTADA' AND fecha >= '2025-09-01' AND id_profesor_sustituto IN (?)
         GROUP BY id_profesor_sustituto, dia_semana, tramo_horario`,
        [idsDisponibles]
      );
      for (const row of conteos) {
        const clave = `${row.id_profesor_sustituto}_${row.dia_semana}_${row.tramo_horario}`;
        conteoGrupoMap[clave] = row.total;
      }
    }
    for (const d of disponibles) {
      const dia = d.dia_semana || (new Date().getDay() === 0 ? 7 : new Date().getDay());
      const clave = `${d.id_usuario}_${dia}_${d.tramo_horario}`;
      d.guardias_realizadas = conteoGrupoMap[clave] || 0;
    }
    disponibles.sort((a, b) => a.guardias_realizadas - b.guardias_realizadas);

    const [asignadas] = await pool.query(
      `SELECT ga.*,
              us.nombre AS sustituto_nombre, us.apellidos AS sustituto_apellidos,
              ua.nombre AS ausente_nombre, ua.apellidos AS ausente_apellidos,
              c.curso AS clase_curso,
              a.hay_tarea, a.descripcion_tarea, a.archivo_tarea
       FROM guardia_asignada ga
       JOIN usuario us ON ga.id_profesor_sustituto = us.id_usuario
       JOIN ausencia a ON ga.id_ausencia = a.id_ausencia
       JOIN usuario ua ON a.id_profesor = ua.id_usuario
       LEFT JOIN clase c ON ga.id_clase = c.id_clase
       WHERE ga.fecha = CURDATE()
       AND ga.estado IN ('PENDIENTE', 'ACEPTADA')`
    );

    return success(res, { ausencias, disponibles, asignadas });
  } catch (err) {
    next(err);
  }
}

// ─── GUARDAR HORARIO COMPLETO ─────────────────────────

async function guardarHorario(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { id_usuario, curso_escolar, guardias } = req.body;

    await conn.beginTransaction();

    await conn.query(
      'DELETE FROM guardia_creada WHERE id_usuario = ? AND curso_escolar = ?',
      [id_usuario, curso_escolar]
    );

    const ids = [];
    for (const g of guardias) {
      const [result] = await conn.query(
        `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio)
         VALUES (?, ?, ?, ?, ?)`,
        [g.dia_semana, g.tramo_horario, curso_escolar, id_usuario, g.id_espacio || null]
      );
      ids.push(result.insertId);
    }

    await conn.commit();
    return success(res, { ids, total: ids.length }, 201);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// ─── IMPORTAR CSV ─────────────────────────────────────

async function importarCSV(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { curso_escolar, guardias } = req.body;

    const correos = [...new Set(guardias.map(g => g.correo))];
    const [usuarios] = await conn.query(
      'SELECT id_usuario, correo FROM usuario WHERE correo IN (?)',
      [correos]
    );
    const mapCorreo = {};
    for (const u of usuarios) mapCorreo[u.correo.toLowerCase()] = u.id_usuario;

    const errores = [];
    const validos = [];
    for (let i = 0; i < guardias.length; i++) {
      const g = guardias[i];
      const idUsuario = mapCorreo[(g.correo || '').toLowerCase()];
      if (!idUsuario) {
        errores.push({ fila: i + 1, correo: g.correo, error: 'Profesor no encontrado' });
        continue;
      }
      if (!g.dia_semana || g.dia_semana < 1 || g.dia_semana > 5) {
        errores.push({ fila: i + 1, correo: g.correo, error: 'Día inválido' });
        continue;
      }
      if (!g.tramo_horario) {
        errores.push({ fila: i + 1, correo: g.correo, error: 'Tramo vacío' });
        continue;
      }
      validos.push({ ...g, id_usuario: idUsuario });
    }

    await conn.beginTransaction();

    const ids = [];
    for (const g of validos) {
      const [result] = await conn.query(
        `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio)
         VALUES (?, ?, ?, ?, ?)`,
        [g.dia_semana, g.tramo_horario, curso_escolar, g.id_usuario, g.id_espacio || null]
      );
      ids.push(result.insertId);
    }

    await conn.commit();
    return success(res, { creadas: ids.length, errores }, 201);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = {
  listarCreadas, obtenerCreada, crearCreada, crearGrupo, actualizarCreada, eliminarCreada,
  listarAsignadas, crearAsignada, eliminarAsignada, responderGuardia,
  guardiasHoy, asignarAutomaticamente, guardarHorario, importarCSV
};
