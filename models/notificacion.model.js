const pool = require('../config/db');

const Notificacion = {
  async findAll({ id_usuario, leida, limit, offset } = {}) {
    const where = ['id_usuario = ?'];
    const params = [id_usuario];
    if (leida !== undefined) { where.push('leida = ?'); params.push(leida ? 1 : 0); }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM notificacion ${whereSql}`, params
    );
    const [rows] = await pool.query(
      `SELECT * FROM notificacion ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { rows, total };
  },

  async create({ id_usuario, tipo, mensaje, referencia_id, referencia_tipo }) {
    const [result] = await pool.query(
      'INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo) VALUES (?, ?, ?, ?, ?)',
      [id_usuario, tipo, mensaje, referencia_id || null, referencia_tipo || null]
    );
    return result.insertId;
  },

  async marcarLeida(id, id_usuario) {
    const [result] = await pool.query(
      'UPDATE notificacion SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?',
      [id, id_usuario]
    );
    return result.affectedRows > 0;
  },

  async marcarTodasLeidas(id_usuario) {
    const [result] = await pool.query(
      'UPDATE notificacion SET leida = 1 WHERE id_usuario = ? AND leida = 0',
      [id_usuario]
    );
    return result.affectedRows;
  }
};

module.exports = Notificacion;
