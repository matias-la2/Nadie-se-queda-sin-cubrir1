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

    if (req.query.id_edificio) {
      where.push('e.id_edificio = ?');
      params.push(req.query.id_edificio);
    }
    if (req.query.estado) {
      where.push('e.estado_disponibilidad = ?');
      params.push(req.query.estado);
    }
    if (req.query.busqueda) {
      where.push('e.nombre LIKE ?');
      params.push(`%${req.query.busqueda}%`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM espacio e ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT e.*, ed.nombre AS edificio_nombre
       FROM espacio e
       JOIN edificio ed ON e.id_edificio = ed.id_edificio
       ${whereSql}
       ORDER BY ed.nombre, e.nombre
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

async function obtenerEspacio(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, ed.nombre AS edificio_nombre
       FROM espacio e
       JOIN edificio ed ON e.id_edificio = ed.id_edificio
       WHERE e.id_espacio = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return error(res, 'Espacio no encontrado', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function crearEspacio(req, res, next) {
  try {
    const { nombre, estado_disponibilidad, capacidad, id_edificio } = req.body;
    const [result] = await pool.query(
      `INSERT INTO espacio (nombre, estado_disponibilidad, capacidad, id_edificio)
       VALUES (?, ?, ?, ?)`,
      [nombre, estado_disponibilidad || 'DISPONIBLE', capacidad || null, id_edificio]
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

module.exports = {
  listarEdificios, obtenerEdificio, crearEdificio, actualizarEdificio, eliminarEdificio,
  listarEspacios, obtenerEspacio, crearEspacio, actualizarEspacio, eliminarEspacio,
  listarBloqueos, crearBloqueo, eliminarBloqueo
};
