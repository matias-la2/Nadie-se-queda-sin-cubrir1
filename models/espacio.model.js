const pool = require('../config/db');

const Espacio = {
  async findAll({ id_edificio, estado_disponibilidad, busqueda, limit, offset } = {}) {
    const where = [];
    const params = [];
    if (id_edificio) { where.push('e.id_edificio = ?'); params.push(id_edificio); }
    if (estado_disponibilidad) { where.push('e.estado_disponibilidad = ?'); params.push(estado_disponibilidad); }
    if (busqueda) { where.push('e.nombre LIKE ?'); params.push(`%${busqueda}%`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM espacio e ${whereSql}`, params
    );
    const [rows] = await pool.query(
      `SELECT e.*, ed.nombre AS edificio_nombre
       FROM espacio e
       JOIN edificio ed ON e.id_edificio = ed.id_edificio
       ${whereSql} ORDER BY ed.nombre, e.nombre LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { rows, total };
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT e.*, ed.nombre AS edificio_nombre
       FROM espacio e
       JOIN edificio ed ON e.id_edificio = ed.id_edificio
       WHERE e.id_espacio = ?`, [id]
    );
    return rows[0] || null;
  },

  async create({ nombre, estado_disponibilidad, capacidad, id_edificio }) {
    const [result] = await pool.query(
      'INSERT INTO espacio (nombre, estado_disponibilidad, capacidad, id_edificio) VALUES (?, ?, ?, ?)',
      [nombre, estado_disponibilidad || 'DISPONIBLE', capacidad || null, id_edificio]
    );
    return result.insertId;
  },

  async update(id, campos) {
    const sets = [];
    const vals = [];
    if (campos.nombre !== undefined) { sets.push('nombre = ?'); vals.push(campos.nombre); }
    if (campos.estado_disponibilidad !== undefined) { sets.push('estado_disponibilidad = ?'); vals.push(campos.estado_disponibilidad); }
    if (campos.capacidad !== undefined) { sets.push('capacidad = ?'); vals.push(campos.capacidad); }
    if (campos.id_edificio !== undefined) { sets.push('id_edificio = ?'); vals.push(campos.id_edificio); }
    if (!sets.length) return false;
    vals.push(id);
    const [result] = await pool.query(`UPDATE espacio SET ${sets.join(', ')} WHERE id_espacio = ?`, vals);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM espacio WHERE id_espacio = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Espacio;
