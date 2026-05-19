const pool = require('../config/db');

const Reserva = {
  async findAll({ id_profesor, id_espacio, fecha_desde, fecha_hasta, limit, offset } = {}) {
    const where = [];
    const params = [];
    if (id_profesor) { where.push('r.id_profesor = ?'); params.push(id_profesor); }
    if (id_espacio) { where.push('r.id_espacio = ?'); params.push(id_espacio); }
    if (fecha_desde) { where.push('r.fecha >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { where.push('r.fecha <= ?'); params.push(fecha_hasta); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM reserva r ${whereSql}`, params
    );
    const [rows] = await pool.query(
      `SELECT r.*, u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              es.nombre AS espacio_nombre, ed.nombre AS edificio_nombre
       FROM reserva r
       JOIN usuario u ON r.id_profesor = u.id_usuario
       JOIN espacio es ON r.id_espacio = es.id_espacio
       JOIN edificio ed ON es.id_edificio = ed.id_edificio
       ${whereSql} ORDER BY r.fecha DESC, r.tramo_horario LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { rows, total };
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT r.*, u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              es.nombre AS espacio_nombre, ed.nombre AS edificio_nombre
       FROM reserva r
       JOIN usuario u ON r.id_profesor = u.id_usuario
       JOIN espacio es ON r.id_espacio = es.id_espacio
       JOIN edificio ed ON es.id_edificio = ed.id_edificio
       WHERE r.id_reserva = ?`, [id]
    );
    return rows[0] || null;
  },

  async checkBloqueado(id_espacio, tramo_horario, fecha) {
    const [[{ bloqueado }]] = await pool.query(
      `SELECT COUNT(*) as bloqueado FROM bloqueo_espacio
       WHERE id_espacio = ? AND tramo_horario = ? AND fecha_desde <= ?
       AND (fecha_hasta IS NULL OR fecha_hasta >= ?)
       AND (dia_semana IS NULL OR dia_semana = WEEKDAY(?) + 1)`,
      [id_espacio, tramo_horario, fecha, fecha, fecha]
    );
    return bloqueado > 0;
  },

  async create({ fecha, tramo_horario, motivo, id_profesor, id_espacio }) {
    const [result] = await pool.query(
      'INSERT INTO reserva (fecha, tramo_horario, motivo, id_profesor, id_espacio) VALUES (?, ?, ?, ?, ?)',
      [fecha, tramo_horario, motivo || null, id_profesor, id_espacio]
    );
    return result.insertId;
  },

  async update(id, campos) {
    const sets = [];
    const vals = [];
    if (campos.fecha !== undefined) { sets.push('fecha = ?'); vals.push(campos.fecha); }
    if (campos.tramo_horario !== undefined) { sets.push('tramo_horario = ?'); vals.push(campos.tramo_horario); }
    if (campos.motivo !== undefined) { sets.push('motivo = ?'); vals.push(campos.motivo); }
    if (campos.id_espacio !== undefined) { sets.push('id_espacio = ?'); vals.push(campos.id_espacio); }
    if (!sets.length) return false;
    vals.push(id);
    const [result] = await pool.query(`UPDATE reserva SET ${sets.join(', ')} WHERE id_reserva = ?`, vals);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM reserva WHERE id_reserva = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Reserva;
