const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');
const { paginar, respuestaPaginada } = require('../helpers/pagination.helper');

// ─── EDIFICIOS ─────────────────────────────────────────

async function listarEdificios(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM edificio ORDER BY nombre');
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

async function obtenerEdificio(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, COUNT(es.id_espacio) AS total_espacios
       FROM edificio e
       LEFT JOIN espacio es ON e.id_edificio = es.id_edificio
       WHERE e.id_edificio = ?
       GROUP BY e.id_edificio`,
      [req.params.id]
    );
    if (rows.length === 0) return error(res, 'Edificio no encontrado', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function crearEdificio(req, res, next) {
  try {
    const { nombre, piso } = req.body;
    const [result] = await pool.query(
      'INSERT INTO edificio (nombre, piso) VALUES (?, ?)',
      [nombre, piso || null]
    );
    res.registroId = result.insertId;
    return success(res, { id: result.insertId }, 201);
  } catch (err) {
    next(err);
  }
}

async function actualizarEdificio(req, res, next) {
  try {
    const campos = [];
    const valores = [];
    if (req.body.nombre !== undefined) { campos.push('nombre = ?'); valores.push(req.body.nombre); }
    if (req.body.piso !== undefined) { campos.push('piso = ?'); valores.push(req.body.piso); }
    if (campos.length === 0) return error(res, 'No se enviaron campos para actualizar', 400);

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE edificio SET ${campos.join(', ')} WHERE id_edificio = ?`,
      valores
    );
    if (result.affectedRows === 0) return error(res, 'Edificio no encontrado', 404);
    return success(res, { mensaje: 'Edificio actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminarEdificio(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM edificio WHERE id_edificio = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Edificio no encontrado', 404);
    return success(res, { mensaje: 'Edificio eliminado correctamente' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return error(res, 'No se puede eliminar: tiene espacios asociados', 409);
    }
    next(err);
  }
}

// ─── ESPACIOS ──────────────────────────────────────────

async function listarEspacios(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);
    const where = [];
    const params = [];
    const curso_escolar = req.query.curso_escolar || null;

    if (req.query.id_edificio) {
      where.push('e.id_edificio = ?');
      params.push(req.query.id_edificio);
    }
    if (req.query.estado) {
      where.push('e.estado_disponibilidad = ?');
      params.push(req.query.estado);
    }
    if (req.query.busqueda) {
      if (curso_escolar) {
        where.push('(e.nombre LIKE ? OR ec.nombre_curso LIKE ?)');
        params.push(`%${req.query.busqueda}%`, `%${req.query.busqueda}%`);
      } else {
        where.push('e.nombre LIKE ?');
        params.push(`%${req.query.busqueda}%`);
      }
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const joinCurso = curso_escolar
      ? 'LEFT JOIN espacio_curso ec ON e.id_espacio = ec.id_espacio AND ec.curso_escolar = ?'
      : '';
    const cursoParams = curso_escolar ? [curso_escolar] : [];

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM espacio e ${joinCurso} ${whereSql}`,
      [...cursoParams, ...params]
    );

    const [rows] = await pool.query(
      `SELECT e.*, ed.nombre AS edificio_nombre
              ${curso_escolar ? ', ec.nombre_curso' : ''}
       FROM espacio e
       JOIN edificio ed ON e.id_edificio = ed.id_edificio
       ${joinCurso}
       ${whereSql}
       ORDER BY ed.nombre, e.planta, e.nombre
       LIMIT ? OFFSET ?`,
      [...cursoParams, ...params, limit, offset]
    );

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

async function obtenerEspacio(req, res, next) {
  try {
    const curso_escolar = req.query.curso_escolar || null;
    const joinCurso = curso_escolar
      ? 'LEFT JOIN espacio_curso ec ON e.id_espacio = ec.id_espacio AND ec.curso_escolar = ?'
      : '';
    const params = curso_escolar ? [curso_escolar, req.params.id] : [req.params.id];

    const [rows] = await pool.query(
      `SELECT e.*, ed.nombre AS edificio_nombre
              ${curso_escolar ? ', ec.nombre_curso' : ''}
       FROM espacio e
       JOIN edificio ed ON e.id_edificio = ed.id_edificio
       ${joinCurso}
       WHERE e.id_espacio = ?`,
      params
    );
    if (rows.length === 0) return error(res, 'Espacio no encontrado', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function crearEspacio(req, res, next) {
  try {
    const { id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio } = req.body;

    if (id_espacio) {
      const [existing] = await pool.query('SELECT id_espacio FROM espacio WHERE id_espacio = ?', [id_espacio]);
      if (existing.length > 0) return error(res, 'Ya existe un espacio con ese ID', 409);

      await pool.query(
        'INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES (?, ?, ?, ?, ?, ?)',
        [id_espacio, nombre, estado_disponibilidad || 'DISPONIBLE', capacidad || null, planta || null, id_edificio]
      );
      res.registroId = id_espacio;
      return success(res, { id: id_espacio }, 201);
    }

    const [result] = await pool.query(
      'INSERT INTO espacio (nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES (?, ?, ?, ?, ?)',
      [nombre, estado_disponibilidad || 'DISPONIBLE', capacidad || null, planta || null, id_edificio]
    );
    res.registroId = result.insertId;
    return success(res, { id: result.insertId }, 201);
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return error(res, 'El edificio especificado no existe', 400);
    }
    next(err);
  }
}

async function actualizarEspacio(req, res, next) {
  try {
    const campos = [];
    const valores = [];
    if (req.body.nombre !== undefined) { campos.push('nombre = ?'); valores.push(req.body.nombre); }
    if (req.body.estado_disponibilidad !== undefined) { campos.push('estado_disponibilidad = ?'); valores.push(req.body.estado_disponibilidad); }
    if (req.body.capacidad !== undefined) { campos.push('capacidad = ?'); valores.push(req.body.capacidad); }
    if (req.body.planta !== undefined) { campos.push('planta = ?'); valores.push(req.body.planta); }
    if (req.body.id_edificio !== undefined) { campos.push('id_edificio = ?'); valores.push(req.body.id_edificio); }
    if (campos.length === 0) return error(res, 'No se enviaron campos para actualizar', 400);

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE espacio SET ${campos.join(', ')} WHERE id_espacio = ?`,
      valores
    );
    if (result.affectedRows === 0) return error(res, 'Espacio no encontrado', 404);
    return success(res, { mensaje: 'Espacio actualizado correctamente' });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return error(res, 'El edificio especificado no existe', 400);
    }
    next(err);
  }
}

async function eliminarEspacio(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM espacio WHERE id_espacio = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Espacio no encontrado', 404);
    return success(res, { mensaje: 'Espacio eliminado correctamente' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return error(res, 'No se puede eliminar: tiene reservas o incidencias asociadas', 409);
    }
    next(err);
  }
}

// ─── NOMBRES DE CURSO ─────────────────────────────────

async function listarNombresCurso(req, res, next) {
  try {
    const curso = req.query.curso_escolar;
    if (!curso) return error(res, 'El curso escolar es obligatorio', 400);

    const [rows] = await pool.query(
      `SELECT ec.*, e.nombre AS nombre_espacio, ed.nombre AS edificio_nombre, e.planta
       FROM espacio_curso ec
       JOIN espacio e ON ec.id_espacio = e.id_espacio
       JOIN edificio ed ON e.id_edificio = ed.id_edificio
       WHERE ec.curso_escolar = ?
       ORDER BY ed.nombre, e.planta, ec.nombre_curso`,
      [curso]
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

async function guardarNombreCurso(req, res, next) {
  try {
    const { curso_escolar, nombre_curso } = req.body;
    const id_espacio = parseInt(req.params.id);

    const [existing] = await pool.query('SELECT id_espacio FROM espacio WHERE id_espacio = ?', [id_espacio]);
    if (existing.length === 0) return error(res, 'Espacio no encontrado', 404);

    await pool.query(
      `INSERT INTO espacio_curso (id_espacio, curso_escolar, nombre_curso)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre_curso = VALUES(nombre_curso)`,
      [id_espacio, curso_escolar, nombre_curso]
    );
    return success(res, { mensaje: 'Nombre de curso guardado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminarNombreCurso(req, res, next) {
  try {
    const id_espacio = parseInt(req.params.id);
    const curso = req.query.curso_escolar;
    if (!curso) return error(res, 'El curso escolar es obligatorio', 400);

    const [result] = await pool.query(
      'DELETE FROM espacio_curso WHERE id_espacio = ? AND curso_escolar = ?',
      [id_espacio, curso]
    );
    if (result.affectedRows === 0) return error(res, 'Nombre de curso no encontrado', 404);
    return success(res, { mensaje: 'Nombre de curso eliminado correctamente' });
  } catch (err) {
    next(err);
  }
}

// ─── BLOQUEOS ──────────────────────────────────────────

async function listarBloqueos(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);
    const where = [];
    const params = [];

    if (req.query.id_espacio) {
      where.push('b.id_espacio = ?');
      params.push(req.query.id_espacio);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM bloqueo_espacio b ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT b.*, es.nombre AS espacio_nombre
       FROM bloqueo_espacio b
       JOIN espacio es ON b.id_espacio = es.id_espacio
       ${whereSql}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

async function crearBloqueo(req, res, next) {
  try {
    const { id_espacio, dia_semana, tramo_horario, fecha_desde, fecha_hasta, motivo } = req.body;
    const [result] = await pool.query(
      `INSERT INTO bloqueo_espacio (id_espacio, dia_semana, tramo_horario, fecha_desde, fecha_hasta, motivo, id_usuario_creador)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_espacio, dia_semana || null, tramo_horario, fecha_desde, fecha_hasta || null, motivo || null, req.usuario.id]
    );
    res.registroId = result.insertId;
    return success(res, { id: result.insertId }, 201);
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return error(res, 'El espacio especificado no existe', 400);
    }
    next(err);
  }
}

async function eliminarBloqueo(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM bloqueo_espacio WHERE id_bloqueo = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Bloqueo no encontrado', 404);
    return success(res, { mensaje: 'Bloqueo eliminado correctamente' });
  } catch (err) {
    next(err);
  }
}

// ─── DISPONIBILIDAD ───────────────────────────────────

async function obtenerDisponibilidad(req, res, next) {
  try {
    const idEspacio = req.params.id;
    const fecha = req.query.fecha;

    if (!fecha) return error(res, 'La fecha es obligatoria (formato YYYY-MM-DD)', 400);

    const tramos = [
      '1a hora (08:15-09:10)',
      '2a hora (09:10-10:10)',
      '3a hora (10:10-11:05)',
      'Recreo (11:05-11:30)',
      '4a hora (11:30-12:25)',
      '5a hora (12:25-13:20)',
      '6a hora (13:20-14:15)'
    ];

    const partes = fecha.split('-');
    const fechaLocal = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    let diaSemana = fechaLocal.getDay();
    if (diaSemana === 0) diaSemana = 7;

    const [bloqueos] = await pool.query(
      `SELECT tramo_horario, motivo FROM bloqueo_espacio
       WHERE id_espacio = ? AND fecha_desde <= ? AND (fecha_hasta IS NULL OR fecha_hasta >= ?)
       AND (dia_semana IS NULL OR dia_semana = ?)`,
      [idEspacio, fecha, fecha, diaSemana]
    );

    const [reservas] = await pool.query(
      `SELECT r.tramo_horario, u.nombre, u.apellidos
       FROM reserva r JOIN usuario u ON r.id_profesor = u.id_usuario
       WHERE r.id_espacio = ? AND r.fecha = ?`,
      [idEspacio, fecha]
    );

    const bloqueosMap = {};
    for (const b of bloqueos) bloqueosMap[b.tramo_horario] = b.motivo || 'Clase programada';

    const reservasMap = {};
    for (const r of reservas) reservasMap[r.tramo_horario] = r.nombre + ' ' + r.apellidos;

    const resultado = tramos.map(function (tramo) {
      if (bloqueosMap[tramo]) {
        return { tramo, estado: 'BLOQUEADO', motivo: bloqueosMap[tramo], reservado_por: null };
      }
      if (reservasMap[tramo]) {
        return { tramo, estado: 'RESERVADO', motivo: null, reservado_por: reservasMap[tramo] };
      }
      return { tramo, estado: 'LIBRE', motivo: null, reservado_por: null };
    });

    return success(res, resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarEdificios, obtenerEdificio, crearEdificio, actualizarEdificio, eliminarEdificio,
  listarEspacios, obtenerEspacio, crearEspacio, actualizarEspacio, eliminarEspacio,
  listarNombresCurso, guardarNombreCurso, eliminarNombreCurso,
  listarBloqueos, crearBloqueo, eliminarBloqueo,
  obtenerDisponibilidad
};
