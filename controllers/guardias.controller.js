const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');
const { paginar, respuestaPaginada } = require('../helpers/pagination.helper');
const { enviarEmail, plantillaNotificacion } = require('../services/email.service');
const { TRAMOS, ETIQUETAS_LECTIVAS } = require('../config/tramos');
const { cursoActual, inicioCursoActual, rangoCurso } = require('../helpers/curso.helper');
const { parsearArchivo } = require('../services/importador-guardias.service');
const { normalizar, emparejar } = require('../services/nombres.service');

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
      if (req.query.curso_escolar === 'actual') {
        where.push('gc.curso_escolar = ?');
        params.push(cursoActual());
      } else {
        if (!rangoCurso(req.query.curso_escolar)) {
          return error(res, 'Formato de curso_escolar no válido. Use "actual" o "YYYY-YYYY" (ej: 2025-2026)', 400);
        }
        where.push('gc.curso_escolar = ?');
        params.push(req.query.curso_escolar);
      }
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM guardia_creada gc ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT gc.*,
              u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              es.nombre AS espacio_nombre,
              ed.nombre AS edificio_nombre,
              pp.codigo AS plaza_codigo,
              ppl.nombre_original AS pendiente_nombre
       FROM guardia_creada gc
       LEFT JOIN usuario u ON gc.id_usuario = u.id_usuario
       LEFT JOIN espacio es ON gc.id_espacio = es.id_espacio
       LEFT JOIN edificio ed ON gc.id_edificio = ed.id_edificio
       LEFT JOIN plaza_pendiente pp ON gc.id_plaza_pendiente = pp.id
       LEFT JOIN profesor_pendiente_login ppl ON gc.id_profesor_pendiente = ppl.id
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

async function listarCursosCreadas(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT curso_escolar FROM guardia_creada ORDER BY curso_escolar DESC'
    );
    const actual = cursoActual();
    const cursos = rows.map(r => r.curso_escolar);
    if (!cursos.includes(actual)) cursos.unshift(actual);
    cursos.sort().reverse();
    return success(res, { cursos, actual });
  } catch (err) {
    next(err);
  }
}

async function obtenerCreada(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT gc.*,
              u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              es.nombre AS espacio_nombre,
              ed.nombre AS edificio_nombre,
              pp.codigo AS plaza_codigo,
              ppl.nombre_original AS pendiente_nombre
       FROM guardia_creada gc
       LEFT JOIN usuario u ON gc.id_usuario = u.id_usuario
       LEFT JOIN espacio es ON gc.id_espacio = es.id_espacio
       LEFT JOIN edificio ed ON gc.id_edificio = ed.id_edificio
       LEFT JOIN plaza_pendiente pp ON gc.id_plaza_pendiente = pp.id
       LEFT JOIN profesor_pendiente_login ppl ON gc.id_profesor_pendiente = ppl.id
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
    const { fecha, dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio, id_edificio } = req.body;

    const [result] = await pool.query(
      `INSERT INTO guardia_creada (fecha, dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio, id_edificio)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fecha || null, dia_semana || null, tramo_horario, curso_escolar, id_usuario, id_espacio || null, id_edificio || null]
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
    if (req.body.id_edificio !== undefined) { campos.push('id_edificio = ?'); valores.push(req.body.id_edificio); }
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
    const { dia_semana, tramo_horario, curso_escolar, id_edificio, id_usuarios } = req.body;

    await conn.beginTransaction();

    const ids = [];
    for (const id_usuario of id_usuarios) {
      const [result] = await conn.query(
        `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_edificio)
         VALUES (?, ?, ?, ?, ?)`,
        [dia_semana, tramo_horario, curso_escolar, id_usuario, id_edificio || null]
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
              a.tramo_horario AS ausencia_tramo,
              ae_info.aula_nombre, ae_info.aula_edificio
       FROM guardia_asignada ga
       JOIN usuario us ON ga.id_profesor_sustituto = us.id_usuario
       JOIN ausencia a ON ga.id_ausencia = a.id_ausencia
       JOIN usuario ua ON a.id_profesor = ua.id_usuario
       LEFT JOIN clase c ON ga.id_clase = c.id_clase
       LEFT JOIN (
         SELECT ae.id_ausencia,
                GROUP_CONCAT(DISTINCT es.nombre SEPARATOR ', ') AS aula_nombre,
                GROUP_CONCAT(DISTINCT ed.nombre SEPARATOR ', ') AS aula_edificio
         FROM ausencia_espacio ae
         JOIN espacio es ON ae.id_espacio = es.id_espacio
         JOIN edificio ed ON es.id_edificio = ed.id_edificio
         GROUP BY ae.id_ausencia
       ) ae_info ON a.id_ausencia = ae_info.id_ausencia
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

    const [[ausenciaCheck]] = await conn.query(
      'SELECT id_profesor FROM ausencia WHERE id_ausencia = ?',
      [id_ausencia]
    );
    if (ausenciaCheck && ausenciaCheck.id_profesor === id_profesor_sustituto) {
      conn.release();
      return error(res, 'El profesor ausente no puede ser su propio sustituto', 400);
    }

    const [edificiosAusencia] = await conn.query(
      `SELECT DISTINCT es.id_edificio
       FROM ausencia_espacio ae
       JOIN espacio es ON ae.id_espacio = es.id_espacio
       WHERE ae.id_ausencia = ?`,
      [id_ausencia]
    );

    if (edificiosAusencia.length > 0 && tipo_asignacion !== 'MANUAL') {
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

    const [espaciosAus] = await conn.query(
      `SELECT es.nombre AS espacio_nombre, ed.nombre AS edificio_nombre
       FROM ausencia_espacio ae
       JOIN espacio es ON ae.id_espacio = es.id_espacio
       JOIN edificio ed ON es.id_edificio = ed.id_edificio
       WHERE ae.id_ausencia = ?`,
      [id_ausencia]
    );
    const aulaInfo = espaciosAus.length > 0
      ? `${espaciosAus[0].espacio_nombre} (${espaciosAus[0].edificio_nombre})`
      : null;

    let mensaje = `Se te ha asignado una guardia el ${fecha} en el tramo ${tramo_horario}.`;
    if (aulaInfo) mensaje += ` Debes cubrir en el ${aulaInfo}.`;
    if (ausencia.hay_tarea) {
      mensaje += ' Hay tarea para los alumnos.';
    }
    mensaje += ' Por favor, acepta o rechaza la asignación.';

    await conn.query(
      `INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo)
       VALUES (?, 'GUARDIA_PENDIENTE', ?, ?, 'guardia_asignada')`,
      [id_profesor_sustituto, mensaje, idGuardiaAsignada]
    );

    await conn.commit();

    const fechaF = formatearFechaSQL(fecha);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const [[sustitutoRow]] = await pool.query(
        'SELECT correo FROM usuario WHERE id_usuario = ?',
        [id_profesor_sustituto]
      );

      let cuerpo = `Has sido asignado/a para cubrir la ausencia de ${ausencia.ausente_nombre} ${ausencia.ausente_apellidos} el ${fechaF} en el tramo ${tramo_horario}.`;
      if (aulaInfo) cuerpo += ` Debes cubrir en el ${aulaInfo}.`;
      if (ausencia.hay_tarea && ausencia.descripcion_tarea) {
        cuerpo += ` Tarea para los alumnos: ${ausencia.descripcion_tarea}`;
      }
      cuerpo += ' Accede al portal para aceptar o rechazar la asignación.';

      const html = plantillaNotificacion({
        titulo: `Guardia asignada - ${fechaF}`,
        cuerpo,
        enlace: `${frontendUrl}/pages/profesor/dashboard.html`
      });

      await enviarEmail({
        para: sustitutoRow.correo,
        asunto: `Guardia asignada - ${fechaF}`,
        html
      });
    } catch (_emailErr) { /* best-effort */ }

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
  const id = parseInt(req.params.id);
  const { accion } = req.body;
  const idUsuario = req.usuario.id;

  console.log('[GUARDIA] responderGuardia id:', id, 'accion:', accion, 'usuario:', idUsuario);

  if (isNaN(id)) {
    return error(res, 'ID de guardia no válido', 400);
  }

  if (!['ACEPTADA', 'RECHAZADA'].includes(accion)) {
    return error(res, 'Acción no válida. Usa ACEPTADA o RECHAZADA', 400);
  }

  const [[guardia]] = await pool.query(
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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      'UPDATE guardia_asignada SET estado = ? WHERE id_guardia_asignada = ?',
      [accion, id]
    );

    const [[sustituto]] = await conn.query(
      'SELECT nombre, apellidos FROM usuario WHERE id_usuario = ?',
      [idUsuario]
    );

    if (accion === 'ACEPTADA') {
      await conn.query(
        'UPDATE ausencia SET estado = ? WHERE id_ausencia = ?',
        ['CUBIERTA', guardia.id_ausencia]
      );

      const [directivos] = await conn.query(
        `SELECT ur.id_usuario FROM usuario_rol ur
         JOIN rol r ON ur.id_rol = r.id_rol
         WHERE r.nombre_rol IN ('EQUIPO_DIRECTIVO', 'ADMINISTRADOR')`
      );

      const fechaGuardiaF = formatearFechaSQL(guardia.fecha);
      const msgDirectivo = `${sustituto.nombre} ${sustituto.apellidos} ha aceptado la guardia del ${fechaGuardiaF} (${guardia.tramo_horario}).`;
      for (const d of directivos) {
        await conn.query(
          `INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo)
           VALUES (?, 'AUSENCIA_ASIGNADA', ?, ?, 'guardia_asignada')`,
          [d.id_usuario, msgDirectivo, id]
        );
      }
    }

    let reasignado = null;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (accion === 'RECHAZADA') {
      const [profesoresRechazaron] = await conn.query(
        `SELECT id_profesor_sustituto FROM guardia_asignada
         WHERE id_ausencia = ? AND estado = 'RECHAZADA'`,
        [guardia.id_ausencia]
      );
      const idsExcluir = profesoresRechazaron.map(r => r.id_profesor_sustituto);
      idsExcluir.push(guardia.id_ausente);
      console.log('[GUARDIA] Rechazada. Excluidos:', idsExcluir, '| Params para reasignar:', {
        id_ausencia: guardia.id_ausencia,
        fecha: guardia.fecha,
        fechaTipo: typeof guardia.fecha,
        fechaEsDate: guardia.fecha instanceof Date,
        tramo_horario: guardia.tramo_horario,
        id_ausente: guardia.id_ausente,
        hay_tarea: guardia.hay_tarea
      });

      const resultado = await asignarAutomaticamente(
        conn, guardia.id_ausencia, guardia.fecha, guardia.tramo_horario,
        guardia.id_ausente, guardia.hay_tarea, idsExcluir
      );

      if (resultado) {
        reasignado = { id_usuario: resultado.id_usuario, nombre: resultado.nombre, unico_disponible: resultado.unico_disponible };
      } else {
        await conn.query(
          'UPDATE ausencia SET estado = ? WHERE id_ausencia = ?',
          ['SIN_CUBRIR', guardia.id_ausencia]
        );

        const fechaSinCubrir = formatearFechaSQL(guardia.fecha);
        const [directivos] = await conn.query(
          `SELECT ur.id_usuario, u.correo FROM usuario_rol ur
           JOIN rol r ON ur.id_rol = r.id_rol
           JOIN usuario u ON ur.id_usuario = u.id_usuario
           WHERE r.nombre_rol IN ('EQUIPO_DIRECTIVO', 'ADMINISTRADOR')`
        );

        const msgDirectivo = `No quedan profesores disponibles para cubrir la guardia del ${fechaSinCubrir} (${guardia.tramo_horario}). Todos los candidatos han rechazado.`;
        for (const d of directivos) {
          await conn.query(
            `INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo)
             VALUES (?, 'GUARDIA_RECHAZADA', ?, ?, 'guardia_asignada')`,
            [d.id_usuario, msgDirectivo, id]
          );
        }

        try {
          const htmlSinCubrir = plantillaNotificacion({
            titulo: `Guardia SIN CUBRIR - ${fechaSinCubrir}`,
            cuerpo: msgDirectivo + ' Requiere intervención manual.',
            enlace: `${frontendUrl}/pages/admin/guardias.html`
          });
          for (const d of directivos) {
            await enviarEmail({
              para: d.correo,
              asunto: `URGENTE: Guardia sin cubrir - ${fechaSinCubrir}`,
              html: htmlSinCubrir
            });
          }
        } catch (_emailErr) { /* best-effort */ }
      }
    }

    const [espaciosResp] = await conn.query(
      `SELECT es.nombre AS espacio_nombre, ed.nombre AS edificio_nombre
       FROM ausencia_espacio ae
       JOIN espacio es ON ae.id_espacio = es.id_espacio
       JOIN edificio ed ON es.id_edificio = ed.id_edificio
       WHERE ae.id_ausencia = ?`,
      [guardia.id_ausencia]
    );

    await conn.commit();
    console.log('[GUARDIA] Commit OK. Accion:', accion, reasignado ? '| Reasignado a: ' + reasignado.nombre : (accion === 'RECHAZADA' && !reasignado ? '| SIN_CUBRIR' : ''));

    const respuesta = { mensaje: accion === 'ACEPTADA' ? 'Guardia aceptada correctamente' : 'Guardia rechazada' };
    if (accion === 'ACEPTADA') {
      respuesta.aula = espaciosResp.length > 0 ? {
        nombre: espaciosResp[0].espacio_nombre,
        edificio: espaciosResp[0].edificio_nombre
      } : null;
      respuesta.hay_tarea = !!guardia.hay_tarea;
      respuesta.descripcion_tarea = guardia.descripcion_tarea || null;
    }
    if (accion === 'RECHAZADA') {
      if (reasignado) {
        respuesta.reasignado = true;
        respuesta.reasignado_a = reasignado.nombre;
        respuesta.unico_disponible = reasignado.unico_disponible || false;
      } else {
        respuesta.sin_cubrir = true;
      }
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
  console.log('[ASIGNAR] Params:', { idAusencia, fecha, fechaTipo: typeof fecha, tramoHorario, idProfesorAusente, hayTarea, idsExcluir });

  const fechaStr = fechaAString(fecha);
  if (!fechaStr) {
    console.error('[ASIGNAR] ERROR: fecha inválida. fecha original:', fecha, 'tipo:', typeof fecha);
    return null;
  }

  const partesFecha = fechaStr.split('-');
  const anio = parseInt(partesFecha[0]);
  const mes = parseInt(partesFecha[1]);
  const dia = parseInt(partesFecha[2]);

  const fechaLocal = new Date(anio, mes - 1, dia);
  const diaSemana = fechaLocal.getDay();
  const diaSemanaDB = diaSemana === 0 ? 7 : diaSemana;

  console.log('[ASIGNAR] diaSemana:', diaSemana, '| diaSemanaDB:', diaSemanaDB, '| idAusencia:', idAusencia, '| tramoHorario:', tramoHorario, '| idAusente:', idProfesorAusente);

  const excluidos = Array.isArray(idsExcluir) && idsExcluir.length > 0
    ? idsExcluir
    : [idProfesorAusente];
  if (!excluidos.includes(idProfesorAusente)) excluidos.push(idProfesorAusente);

  const [espaciosAusencia] = await conn.query(
    `SELECT DISTINCT es.id_edificio, es.nombre AS espacio_nombre, ed.nombre AS edificio_nombre
     FROM ausencia_espacio ae
     JOIN espacio es ON ae.id_espacio = es.id_espacio
     JOIN edificio ed ON es.id_edificio = ed.id_edificio
     WHERE ae.id_ausencia = ?`,
    [idAusencia]
  );
  const idEdificio = espaciosAusencia.length > 0 ? espaciosAusencia[0].id_edificio : null;
  const espacioNombre = espaciosAusencia.length > 0 ? espaciosAusencia[0].espacio_nombre : null;
  const edificioNombre = espaciosAusencia.length > 0 ? espaciosAusencia[0].edificio_nombre : null;

  let candidatos = await buscarCandidatos(conn, diaSemanaDB, fecha, tramoHorario, excluidos, idEdificio);

  if (candidatos.length === 0 && idEdificio) {
    candidatos = await buscarCandidatos(conn, diaSemanaDB, fecha, tramoHorario, excluidos, null);
  }

  if (candidatos.length === 0) {
    console.log('[GUARDIA] Sin candidatos disponibles para ausencia', idAusencia);
    return null;
  }

  const unicoDisponible = candidatos.length === 1;
  const elegido = candidatos[0];
  console.log('[GUARDIA] Candidatos:', candidatos.length, '| Elegido:', elegido.profesor_nombre, elegido.profesor_apellidos, '| Único:', unicoDisponible);

  const [result] = await conn.query(
    `INSERT INTO guardia_asignada
     (fecha, tramo_horario, tipo_asignacion, estado, comentario, id_ausencia, id_profesor_sustituto, id_guardia_creada)
     VALUES (?, ?, 'AUTOMATICA', 'PENDIENTE', 'Asignada automaticamente', ?, ?, ?)`,
    [fecha, tramoHorario, idAusencia, elegido.id_usuario, elegido.id_guardia_creada || null]
  );
  const idGuardiaAsignada = result.insertId;

  const [[ausente]] = await conn.query(
    'SELECT nombre, apellidos FROM usuario WHERE id_usuario = ?',
    [idProfesorAusente]
  );
  const nombreAusente = `${ausente.nombre} ${ausente.apellidos}`;
  const fechaFormateada = formatearFechaSQL(fecha);

  let mensaje;
  if (unicoDisponible) {
    mensaje = `Eres el único profesor disponible para cubrir la ausencia de ${nombreAusente} el ${fechaFormateada} (${tramoHorario}).`;
    if (espacioNombre) mensaje += ` Debes cubrir en el ${espacioNombre}${edificioNombre ? ' (' + edificioNombre + ')' : ''}.`;
    if (hayTarea) mensaje += ' Hay tarea para los alumnos.';
    mensaje += ' Por favor, acepta la asignación.';
  } else {
    mensaje = `Se te ha asignado una guardia para cubrir la ausencia de ${nombreAusente} el ${fechaFormateada} en el tramo ${tramoHorario}.`;
    if (espacioNombre) mensaje += ` Debes cubrir en el ${espacioNombre}${edificioNombre ? ' (' + edificioNombre + ')' : ''}.`;
    if (hayTarea) mensaje += ' Hay tarea para los alumnos.';
    mensaje += ' Por favor, acepta o rechaza la asignación.';
  }

  await conn.query(
    `INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo)
     VALUES (?, 'GUARDIA_PENDIENTE', ?, ?, 'guardia_asignada')`,
    [elegido.id_usuario, mensaje, idGuardiaAsignada]
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  try {
    const [[correoRow]] = await conn.query(
      'SELECT correo FROM usuario WHERE id_usuario = ?', [elegido.id_usuario]
    );
    const htmlEmail = plantillaNotificacion({
      titulo: `Guardia asignada - ${fechaFormateada}`,
      cuerpo: mensaje,
      enlace: `${frontendUrl}/pages/profesor/dashboard.html`
    });
    await enviarEmail({ para: correoRow.correo, asunto: `Guardia asignada - ${fechaFormateada}`, html: htmlEmail });
  } catch (_emailErr) { /* best-effort */ }

  return {
    id_guardia_asignada: idGuardiaAsignada,
    id_usuario: elegido.id_usuario,
    nombre: `${elegido.profesor_nombre} ${elegido.profesor_apellidos}`,
    guardias_realizadas: elegido.guardias_realizadas,
    unico_disponible: unicoDisponible
  };
}

async function buscarCandidatos(conn, diaSemanaDB, fecha, tramoHorario, excluidos, idEdificio) {
  const inicioCurso = inicioCursoActual();

  let sql = `SELECT gc.id_usuario, MIN(gc.id_guardia_creada) AS id_guardia_creada,
          u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
          COALESCE(conteo.total, 0) AS guardias_realizadas
   FROM guardia_creada gc
   JOIN usuario u ON gc.id_usuario = u.id_usuario
   LEFT JOIN (
     SELECT id_profesor_sustituto, COUNT(*) AS total
     FROM guardia_asignada
     WHERE estado = 'ACEPTADA' AND fecha >= ?
     GROUP BY id_profesor_sustituto
   ) conteo ON gc.id_usuario = conteo.id_profesor_sustituto
   WHERE gc.id_usuario IS NOT NULL
   AND (gc.dia_semana = ? OR gc.fecha = ?)
   AND gc.tramo_horario = ?
   AND gc.id_usuario NOT IN (?)
   AND NOT EXISTS (
     SELECT 1 FROM guardia_asignada ga2
     WHERE ga2.id_profesor_sustituto = gc.id_usuario
     AND ga2.fecha = ? AND ga2.tramo_horario = ?
     AND ga2.estado IN ('PENDIENTE', 'ACEPTADA')
   )`;
  const params = [inicioCurso, diaSemanaDB, fecha, tramoHorario, excluidos, fecha, tramoHorario];

  if (idEdificio) {
    sql += ` AND (gc.id_edificio IS NULL OR gc.id_edificio = ?)`;
    params.push(idEdificio);
  }

  sql += ` GROUP BY gc.id_usuario, u.nombre, u.apellidos, conteo.total
   ORDER BY guardias_realizadas ASC, RAND()`;

  const [rows] = await conn.query(sql, params);
  return rows;
}

function fechaAString(fecha) {
  if (fecha instanceof Date && !isNaN(fecha.getTime())) {
    return fecha.getUTCFullYear() + '-' +
      String(fecha.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(fecha.getUTCDate()).padStart(2, '0');
  }
  const str = String(fecha || '').substring(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  console.error('[GUARDIA] fechaAString: formato inesperado. fecha:', fecha, 'tipo:', typeof fecha);
  return null;
}

function formatearFechaSQL(fecha) {
  const str = fechaAString(fecha);
  if (!str) return String(fecha);
  const partes = str.split('-');
  if (partes.length < 3) return str;
  return partes[2] + '/' + partes[1] + '/' + partes[0];
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
      WHERE gc.id_usuario IS NOT NULL
      AND (gc.dia_semana = WEEKDAY(CURDATE()) + 1 OR gc.fecha = CURDATE())
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

    const inicioCursoHoy = inicioCursoActual();

    const idsDisponibles = [...new Set(disponibles.map(d => d.id_usuario))];
    const conteoGrupoMap = {};
    if (idsDisponibles.length > 0) {
      const [conteos] = await pool.query(
        `SELECT id_profesor_sustituto, WEEKDAY(fecha) + 1 AS dia_semana,
                tramo_horario, COUNT(*) AS total
         FROM guardia_asignada
         WHERE estado = 'ACEPTADA' AND fecha >= ? AND id_profesor_sustituto IN (?)
         GROUP BY id_profesor_sustituto, dia_semana, tramo_horario`,
        [inicioCursoHoy, idsDisponibles]
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
              a.hay_tarea, a.descripcion_tarea, a.archivo_tarea,
              ae_info.aula_nombre, ae_info.aula_edificio
       FROM guardia_asignada ga
       JOIN usuario us ON ga.id_profesor_sustituto = us.id_usuario
       JOIN ausencia a ON ga.id_ausencia = a.id_ausencia
       JOIN usuario ua ON a.id_profesor = ua.id_usuario
       LEFT JOIN clase c ON ga.id_clase = c.id_clase
       LEFT JOIN (
         SELECT ae.id_ausencia,
                GROUP_CONCAT(DISTINCT es.nombre SEPARATOR ', ') AS aula_nombre,
                GROUP_CONCAT(DISTINCT ed.nombre SEPARATOR ', ') AS aula_edificio
         FROM ausencia_espacio ae
         JOIN espacio es ON ae.id_espacio = es.id_espacio
         JOIN edificio ed ON es.id_edificio = ed.id_edificio
         GROUP BY ae.id_ausencia
       ) ae_info ON a.id_ausencia = ae_info.id_ausencia
       WHERE ga.fecha = CURDATE()
       AND ga.estado IN ('PENDIENTE', 'ACEPTADA')`
    );

    const rangoCursoActual = rangoCurso('actual');
    let sinCubrirOtrosDiasSql = `
      SELECT a.*, u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
             p.departamento
      FROM ausencia a
      JOIN usuario u ON a.id_profesor = u.id_usuario
      JOIN profesor p ON a.id_profesor = p.id_usuario
      WHERE a.fecha != CURDATE()
      AND a.estado = 'SIN_CUBRIR'
      AND a.fecha >= ? AND a.fecha <= ?`;
    const sinCubrirParams = [rangoCursoActual.desde, rangoCursoActual.hasta];

    if (filtroEdificio) {
      sinCubrirOtrosDiasSql += ` AND EXISTS (
        SELECT 1 FROM ausencia_espacio ae
        JOIN espacio es ON ae.id_espacio = es.id_espacio
        WHERE ae.id_ausencia = a.id_ausencia AND es.id_edificio = ?
      )`;
      sinCubrirParams.push(filtroEdificio);
    }

    sinCubrirOtrosDiasSql += ` ORDER BY a.fecha ASC`;

    const [sinCubrirOtrosDias] = await pool.query(sinCubrirOtrosDiasSql, sinCubrirParams);

    const idsSinCubrir = sinCubrirOtrosDias.map(a => a.id_ausencia);
    if (idsSinCubrir.length > 0) {
      const [espaciosSinCubrir] = await pool.query(
        `SELECT ae.id_ausencia, es.id_espacio, es.nombre, e.id_edificio, e.nombre AS edificio_nombre
         FROM ausencia_espacio ae
         JOIN espacio es ON ae.id_espacio = es.id_espacio
         JOIN edificio e ON es.id_edificio = e.id_edificio
         WHERE ae.id_ausencia IN (?)`,
        [idsSinCubrir]
      );
      const espaciosMapOtros = new Map();
      for (const row of espaciosSinCubrir) {
        if (!espaciosMapOtros.has(row.id_ausencia)) {
          espaciosMapOtros.set(row.id_ausencia, []);
        }
        espaciosMapOtros.get(row.id_ausencia).push(row);
      }
      for (const aus of sinCubrirOtrosDias) {
        const espacios = espaciosMapOtros.get(aus.id_ausencia) || [];
        aus.espacios = espacios;
        aus.edificios = [...new Set(espacios.map(e => e.id_edificio))];
      }
    }

    const [todosProfesores] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos
       FROM usuario u
       JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
       JOIN rol r ON ur.id_rol = r.id_rol
       WHERE r.nombre_rol = 'PROFESOR' AND u.activo = 1
       ORDER BY u.apellidos, u.nombre`
    );

    return success(res, { ausencias, disponibles, asignadas, sinCubrirOtrosDias, todosProfesores });
  } catch (err) {
    next(err);
  }
}

// ─── GUARDAR HORARIO COMPLETO ─────────────────────────

async function guardarHorario(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { id_usuario, curso_escolar, guardias, id_edificio } = req.body;

    await conn.beginTransaction();

    await conn.query(
      "DELETE FROM guardia_creada WHERE id_usuario = ? AND curso_escolar = ? AND origen = 'MANUAL'",
      [id_usuario, curso_escolar]
    );

    const ids = [];
    for (const g of guardias) {
      const [result] = await conn.query(
        `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_edificio)
         VALUES (?, ?, ?, ?, ?)`,
        [g.dia_semana, g.tramo_horario, curso_escolar, id_usuario, id_edificio || null]
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

// ─── IMPORTAR EXCEL (dos fases) ──────────────────────

async function analizarExcel(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return error(res, 'No se han enviado archivos', 400);
    }

    const [edificiosDB] = await pool.query('SELECT id_edificio, nombre FROM edificio');
    const [usuarios] = await pool.query(
      `SELECT DISTINCT u.id_usuario AS id, u.nombre, u.apellidos
       FROM usuario u
       JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
       JOIN rol r ON ur.id_rol = r.id_rol
       WHERE r.nombre_rol = 'PROFESOR' AND u.activo = 1`
    );
    const [aliasRows] = await pool.query('SELECT nombre_normalizado, id_usuario FROM alias_profesor');
    const aliasMap = new Map(aliasRows.map(a => [a.nombre_normalizado, a.id_usuario]));
    const [pendientes] = await pool.query('SELECT nombre_normalizado FROM profesor_pendiente_login');
    const pendientesSet = new Set(pendientes.map(p => p.nombre_normalizado));

    const archivos = [];
    const edificiosVistos = new Set();

    for (const file of req.files) {
      const resultado = parsearArchivo(file.buffer, edificiosDB);

      if (edificiosVistos.has(resultado.edificio.id)) {
        return error(res, 'Los dos archivos son del mismo edificio: ' + resultado.edificio.nombre, 400);
      }
      edificiosVistos.add(resultado.edificio.id);

      archivos.push({
        nombre: file.originalname,
        edificio: resultado.edificio,
        guardias: resultado.guardias.length,
        guardiasDetalle: resultado.guardias,
        nombresUnicos: resultado.nombresUnicos,
        plazas: resultado.plazas,
      });
    }

    const todosNombres = new Set();
    const todasPlazas = new Set();
    const todasGuardias = [];

    for (const arch of archivos) {
      for (const n of arch.nombresUnicos) todosNombres.add(n);
      for (const p of arch.plazas) todasPlazas.add(p);
      for (const g of arch.guardiasDetalle) {
        todasGuardias.push({
          edificio_id: arch.edificio.id,
          dia: g.dia_semana,
          tramo: g.tramo_horario,
          nombreExcel: g.nombreExcel,
          esPlaza: g.esPlaza,
        });
      }
    }

    const resueltos = [];
    const probables = [];
    const sinCuenta = [];

    for (const nombreExcel of todosNombres) {
      const normNombre = normalizar(nombreExcel);

      if (pendientesSet.has(normNombre)) {
        sinCuenta.push({ nombreExcel });
        continue;
      }

      const match = emparejar(nombreExcel, usuarios, aliasMap);

      if (match.tipo === 'EXACTO') {
        const c = match.candidatos[0];
        resueltos.push({
          nombreExcel,
          id_usuario: c.id,
          nombre: `${c.nombre} ${c.apellidos}`,
        });
      } else if (match.tipo === 'PROBABLE') {
        probables.push({
          nombreExcel,
          candidatos: match.candidatos.map(c => ({
            id_usuario: c.id,
            nombre: `${c.nombre} ${c.apellidos}`,
            score: Math.round(c.score * 100) / 100,
          })),
        });
      } else {
        sinCuenta.push({ nombreExcel });
      }
    }

    const curso = cursoActual();

    return success(res, {
      curso,
      archivos: archivos.map(a => ({
        nombre: a.nombre,
        edificio: a.edificio,
        guardias: a.guardias,
      })),
      resueltos,
      probables,
      sinCuenta,
      plazas: [...todasPlazas],
      guardias: todasGuardias,
    });
  } catch (err) {
    next(err);
  }
}

async function confirmarExcel(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { curso, edificios, guardias, decisiones } = req.body;

    await conn.beginTransaction();

    // 1. Procesar decisiones VINCULAR → alias_profesor
    const vinculados = new Map();
    const ignorados = new Set();
    for (const [nombreExcel, decision] of Object.entries(decisiones)) {
      if (decision.accion === 'VINCULAR') {
        const norm = normalizar(nombreExcel);
        await conn.query(
          `INSERT INTO alias_profesor (nombre_normalizado, id_usuario)
           VALUES (?, ?) ON DUPLICATE KEY UPDATE id_usuario = VALUES(id_usuario)`,
          [norm, decision.id_usuario]
        );
        vinculados.set(nombreExcel, decision.id_usuario);
      } else if (decision.accion === 'PENDIENTE_LOGIN') {
        const norm = normalizar(nombreExcel);
        await conn.query(
          `INSERT IGNORE INTO profesor_pendiente_login (nombre_normalizado, nombre_original)
           VALUES (?, ?)`,
          [norm, nombreExcel]
        );
      } else if (decision.accion === 'IGNORAR') {
        ignorados.add(nombreExcel);
      }
    }

    // 2. Plazas pendientes
    const plazasFromGuardias = [...new Set(
      guardias.filter(g => g.esPlaza).map(g => g.nombreExcel)
    )];
    for (const codigo of plazasFromGuardias) {
      await conn.query(
        `INSERT IGNORE INTO plaza_pendiente (codigo, curso) VALUES (?, ?)`,
        [codigo, curso]
      );
    }

    // 3. DELETE guardias EXCEL del curso + edificios indicados
    if (edificios.length > 0) {
      await conn.query(
        `DELETE FROM guardia_creada
         WHERE origen = 'EXCEL' AND curso_escolar = ? AND id_edificio IN (?)`,
        [curso, edificios]
      );
    }

    // 4. Resolver titulares y preparar datos
    const [usuarios] = await conn.query(
      `SELECT DISTINCT u.id_usuario AS id, u.nombre, u.apellidos
       FROM usuario u
       JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
       JOIN rol r ON ur.id_rol = r.id_rol
       WHERE r.nombre_rol = 'PROFESOR' AND u.activo = 1`
    );
    const [aliasRows] = await conn.query('SELECT nombre_normalizado, id_usuario FROM alias_profesor');
    const aliasMap = new Map(aliasRows.map(a => [a.nombre_normalizado, a.id_usuario]));

    // Map plaza codigo → id
    const plazaCodigos = [...new Set(guardias.filter(g => g.esPlaza).map(g => g.nombreExcel))];
    const plazaIdMap = new Map();
    if (plazaCodigos.length > 0) {
      const [plazaRows] = await conn.query(
        `SELECT id, codigo FROM plaza_pendiente WHERE curso = ? AND codigo IN (?)`,
        [curso, plazaCodigos]
      );
      for (const p of plazaRows) plazaIdMap.set(p.codigo, p.id);
    }

    // Map pendiente nombre → id
    const [pendienteRows] = await conn.query('SELECT id, nombre_normalizado FROM profesor_pendiente_login');
    const pendienteIdMap = new Map(pendienteRows.map(p => [p.nombre_normalizado, p.id]));

    // 5. INSERT guardias deduplicando por nombre+día+tramo
    const insertados = new Set();
    let guardiasCreadas = 0;
    let contResueltos = 0;
    let contPlazas = 0;
    let contPendientes = 0;
    let contIgnorados = 0;

    for (const g of guardias) {
      if (ignorados.has(g.nombreExcel)) {
        contIgnorados++;
        continue;
      }

      const dedupeKey = `${g.nombreExcel}|${g.dia}|${g.tramo}`;
      if (insertados.has(dedupeKey)) continue;
      insertados.add(dedupeKey);

      let idUsuario = null;
      let idPlaza = null;
      let idPendiente = null;

      if (g.esPlaza) {
        idPlaza = plazaIdMap.get(g.nombreExcel) || null;
        if (!idPlaza) continue;
        contPlazas++;
      } else {
        // Check vinculados first
        if (vinculados.has(g.nombreExcel)) {
          idUsuario = vinculados.get(g.nombreExcel);
          contResueltos++;
        } else {
          // Try emparejar
          const match = emparejar(g.nombreExcel, usuarios, aliasMap);
          if (match.tipo === 'EXACTO') {
            idUsuario = match.candidatos[0].id;
            contResueltos++;
          } else {
            // Check pendiente_login
            const norm = normalizar(g.nombreExcel);
            const pendId = pendienteIdMap.get(norm);
            if (pendId) {
              idPendiente = pendId;
              contPendientes++;
            } else {
              await conn.query(
                `INSERT IGNORE INTO profesor_pendiente_login (nombre_normalizado, nombre_original)
                 VALUES (?, ?)`,
                [norm, g.nombreExcel]
              );
              const [[pendRow]] = await conn.query(
                'SELECT id FROM profesor_pendiente_login WHERE nombre_normalizado = ?',
                [norm]
              );
              idPendiente = pendRow.id;
              pendienteIdMap.set(norm, idPendiente);
              contPendientes++;
            }
          }
        }
      }

      await conn.query(
        `INSERT INTO guardia_creada
         (dia_semana, tramo_horario, curso_escolar, id_usuario, id_plaza_pendiente, id_profesor_pendiente, id_edificio, origen)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'EXCEL')`,
        [g.dia, g.tramo, curso, idUsuario, idPlaza, idPendiente, g.edificio_id]
      );
      guardiasCreadas++;
    }

    // 6. Log
    const resumen = JSON.stringify({
      guardias: guardiasCreadas, edificios,
      resueltos: contResueltos, plazas: contPlazas,
      pendientes: contPendientes, ignorados: contIgnorados,
    });
    await conn.query(
      `INSERT INTO log_acciones (accion, tabla_afectada, id_usuario, datos_extra)
       VALUES ('IMPORTAR_GUARDIAS_EXCEL', 'guardia_creada', ?, ?)`,
      [req.usuario.id, resumen]
    );

    await conn.commit();

    return success(res, {
      guardiasCreadas,
      resueltos: contResueltos,
      plazas: contPlazas,
      pendientesLogin: contPendientes,
      ignorados: contIgnorados,
    }, 201);
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
    const { curso_escolar, id_edificio, guardias } = req.body;

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
        `INSERT INTO guardia_creada (dia_semana, tramo_horario, curso_escolar, id_usuario, id_edificio, origen)
         VALUES (?, ?, ?, ?, ?, 'CSV')`,
        [g.dia_semana, g.tramo_horario, curso_escolar, g.id_usuario, id_edificio || null]
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

function listarTramos(_req, res) {
  return success(res, TRAMOS);
}

module.exports = {
  listarCreadas, listarCursosCreadas, obtenerCreada, crearCreada, crearGrupo, actualizarCreada, eliminarCreada,
  listarAsignadas, crearAsignada, eliminarAsignada, responderGuardia,
  guardiasHoy, asignarAutomaticamente, guardarHorario, importarCSV,
  analizarExcel, confirmarExcel,
  listarTramos
};
