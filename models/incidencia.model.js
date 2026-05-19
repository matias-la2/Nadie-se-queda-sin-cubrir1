const pool = require('../config/db');

const Incidencia = {
  async findAll({ estado, tipo, id_usuario_creador, fecha_desde, fecha_hasta, busqueda, limit, offset } = {}) {
    const where = [];
    const params = [];
    if (estado) { where.push('i.estado = ?'); params.push(estado); }
    if (tipo) { where.push('i.tipo = ?'); params.push(tipo); }
    if (id_usuario_creador) { where.push('i.id_usuario_creador = ?'); params.push(id_usuario_creador); }
    if (fecha_desde) { where.push('i.fecha >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { where.push('i.fecha <= ?'); params.push(fecha_hasta); }
    if (busqueda) {
      where.push('(i.titulo LIKE ? OR i.descripcion LIKE ?)');
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM incidencia i ${whereSql}`, params
    );
    const [rows] = await pool.query(
      `SELECT i.*, es.nombre AS espacio_nombre,
              uc.nombre AS creador_nombre, uc.apellidos AS creador_apellidos
       FROM incidencia i
       LEFT JOIN espacio es ON i.id_espacio = es.id_espacio
       JOIN usuario uc ON i.id_usuario_creador = uc.id_usuario
       ${whereSql} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { rows, total };
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT i.*, es.nombre AS espacio_nombre,
              uc.nombre AS creador_nombre, uc.apellidos AS creador_apellidos,
              ud.nombre AS directivo_nombre, ud.apellidos AS directivo_apellidos
       FROM incidencia i
       LEFT JOIN espacio es ON i.id_espacio = es.id_espacio
       JOIN usuario uc ON i.id_usuario_creador = uc.id_usuario
       LEFT JOIN usuario ud ON i.id_equipo_directivo = ud.id_usuario
       WHERE i.id_incidencia = ?`, [id]
    );
    return rows[0] || null;
  },

  async create({ titulo, descripcion, tipo, fecha, id_espacio, id_usuario_creador }) {
    const [result] = await pool.query(
      'INSERT INTO incidencia (titulo, descripcion, tipo, fecha, id_espacio, id_usuario_creador) VALUES (?, ?, ?, ?, ?, ?)',
      [titulo, descripcion || null, tipo, fecha, id_espacio || null, id_usuario_creador]
    );
    return result.insertId;
  },

  async update(id, campos) {
    const sets = [];
    const vals = [];
    if (campos.titulo !== undefined) { sets.push('titulo = ?'); vals.push(campos.titulo); }
    if (campos.descripcion !== undefined) { sets.push('descripcion = ?'); vals.push(campos.descripcion); }
    if (campos.tipo !== undefined) { sets.push('tipo = ?'); vals.push(campos.tipo); }
    if (campos.fecha !== undefined) { sets.push('fecha = ?'); vals.push(campos.fecha); }
    if (campos.id_espacio !== undefined) { sets.push('id_espacio = ?'); vals.push(campos.id_espacio); }
    if (!sets.length) return false;
    vals.push(id);
    const [result] = await pool.query(`UPDATE incidencia SET ${sets.join(', ')} WHERE id_incidencia = ?`, vals);
    return result.affectedRows > 0;
  },

  async cambiarEstado(id, estado, id_equipo_directivo) {
    const sets = ['estado = ?'];
    const vals = [estado];
    if (id_equipo_directivo) { sets.push('id_equipo_directivo = ?'); vals.push(id_equipo_directivo); }
    vals.push(id);
    const [result] = await pool.query(`UPDATE incidencia SET ${sets.join(', ')} WHERE id_incidencia = ?`, vals);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM incidencia WHERE id_incidencia = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Incidencia;
