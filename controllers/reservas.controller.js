const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');
const { paginar, respuestaPaginada } = require('../helpers/pagination.helper');

async function listar(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);
    const where = [];
    const params = [];

    if (req.query.id_profesor) {
      where.push('r.id_profesor = ?');
      params.push(req.query.id_profesor);
    }
    if (req.query.id_espacio) {
      where.push('r.id_espacio = ?');
      params.push(req.query.id_espacio);
    }
    if (req.query.fecha_desde) {
      where.push('r.fecha >= ?');
      params.push(req.query.fecha_desde);
    }
    if (req.query.fecha_hasta) {
      where.push('r.fecha <= ?');
      params.push(req.query.fecha_hasta);
    }

    const esProfesor = req.usuario.roles.length === 1 && req.usuario.roles[0] === 'PROFESOR';
    if (esProfesor) {
      where.push('r.id_profesor = ?');
      params.push(req.usuario.id);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM reserva r ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT r.*,
              u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              es.nombre AS espacio_nombre, ed.nombre AS edificio_nombre
       FROM reserva r
       JOIN usuario u ON r.id_profesor = u.id_usuario
       JOIN espacio es ON r.id_espacio = es.id_espacio
       JOIN edificio ed ON es.id_edificio = ed.id_edificio
       ${whereSql}
       ORDER BY r.fecha DESC, r.tramo_horario
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT r.*,
              u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              es.nombre AS espacio_nombre, ed.nombre AS edificio_nombre
       FROM reserva r
       JOIN usuario u ON r.id_profesor = u.id_usuario
       JOIN espacio es ON r.id_espacio = es.id_espacio
       JOIN edificio ed ON es.id_edificio = ed.id_edificio
       WHERE r.id_reserva = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return error(res, 'Reserva no encontrada', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { fecha, tramo_horario, motivo, id_espacio } = req.body;
    const id_profesor = req.usuario.id;

    const [[espacio]] = await pool.query(
      'SELECT estado_disponibilidad FROM espacio WHERE id_espacio = ?',
      [id_espacio]
    );
    if (!espacio) return error(res, 'El espacio no existe', 404);
    if (espacio.estado_disponibilidad !== 'DISPONIBLE') {
      return error(res, 'El espacio no está disponible', 409);
    }

    const [[{ bloqueado }]] = await pool.query(
      `SELECT COUNT(*) as bloqueado FROM bloqueo_espacio
       WHERE id_espacio = ?
       AND tramo_horario = ?
       AND fecha_desde <= ?
       AND (fecha_hasta IS NULL OR fecha_hasta >= ?)
       AND (dia_semana IS NULL OR dia_semana = WEEKDAY(?) + 1)`,
      [id_espacio, tramo_horario, fecha, fecha, fecha]
    );
    if (bloqueado > 0) {
      return error(res, 'El espacio está bloqueado en ese horario', 409);
    }

    const [result] = await pool.query(
      `INSERT INTO reserva (fecha, tramo_horario, motivo, id_profesor, id_espacio)
       VALUES (?, ?, ?, ?, ?)`,
      [fecha, tramo_horario, motivo || null, id_profesor, id_espacio]
    );
    res.registroId = result.insertId;
    return success(res, { id: result.insertId }, 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, 'Ya existe una reserva para ese espacio en la misma fecha y tramo', 409);
    }
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const [current] = await pool.query(
      'SELECT * FROM reserva WHERE id_reserva = ?',
      [req.params.id]
    );
    if (current.length === 0) return error(res, 'Reserva no encontrada', 404);

    if (req.body.fecha || req.body.tramo_horario || req.body.id_espacio) {
      const fecha = req.body.fecha || current[0].fecha;
      const tramo = req.body.tramo_horario || current[0].tramo_horario;
      const espId = req.body.id_espacio || current[0].id_espacio;

      const [[{ bloqueado }]] = await pool.query(
        `SELECT COUNT(*) as bloqueado FROM bloqueo_espacio
         WHERE id_espacio = ?
         AND tramo_horario = ?
         AND fecha_desde <= ?
         AND (fecha_hasta IS NULL OR fecha_hasta >= ?)
         AND (dia_semana IS NULL OR dia_semana = WEEKDAY(?) + 1)`,
        [espId, tramo, fecha, fecha, fecha]
      );
      if (bloqueado > 0) {
        return error(res, 'El espacio está bloqueado en ese horario', 409);
      }
    }

    const campos = [];
    const valores = [];
    if (req.body.fecha !== undefined) { campos.push('fecha = ?'); valores.push(req.body.fecha); }
    if (req.body.tramo_horario !== undefined) { campos.push('tramo_horario = ?'); valores.push(req.body.tramo_horario); }
    if (req.body.motivo !== undefined) { campos.push('motivo = ?'); valores.push(req.body.motivo); }
    if (req.body.id_espacio !== undefined) { campos.push('id_espacio = ?'); valores.push(req.body.id_espacio); }
    if (campos.length === 0) return error(res, 'No se enviaron campos para actualizar', 400);

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE reserva SET ${campos.join(', ')} WHERE id_reserva = ?`,
      valores
    );
    return success(res, { mensaje: 'Reserva actualizada correctamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, 'Ya existe una reserva para ese espacio en la misma fecha y tramo', 409);
    }
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM reserva WHERE id_reserva = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Reserva no encontrada', 404);
    return success(res, { mensaje: 'Reserva eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
