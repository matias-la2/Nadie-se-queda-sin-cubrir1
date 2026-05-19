const pool = require('../config/db');

const Ausencia = {
  async findAll({ estado, id_profesor, fecha_desde, fecha_hasta, limit, offset } = {}) {
    const where = [];
    const params = [];
    if (estado) { where.push('a.estado = ?'); params.push(estado); }
    if (id_profesor) { where.push('a.id_profesor = ?'); params.push(id_profesor); }
    if (fecha_desde) { where.push('a.fecha >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { where.push('a.fecha <= ?'); params.push(fecha_hasta); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM ausencia a ${whereSql}`, params
    );
    const [rows] = await pool.query(
      `SELECT a.*, u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              p.departamento,
              uc.nombre AS creador_nombre, uc.apellidos AS creador_apellidos
       FROM ausencia a
       JOIN usuario u ON a.id_profesor = u.id_usuario
       JOIN profesor p ON a.id_profesor = p.id_usuario
       JOIN usuario uc ON a.id_usuario_creador = uc.id_usuario
       ${whereSql} ORDER BY a.fecha DESC, a.tramo_horario LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { rows, total };
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT a.*, u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              p.departamento,
              uc.nombre AS creador_nombre, uc.apellidos AS creador_apellidos
       FROM ausencia a
       JOIN usuario u ON a.id_profesor = u.id_usuario
       JOIN profesor p ON a.id_profesor = p.id_usuario
       JOIN usuario uc ON a.id_usuario_creador = uc.id_usuario
       WHERE a.id_ausencia = ?`, [id]
    );
    return rows[0] || null;
  },

  async getEspacios(id) {
    const [rows] = await pool.query(
      `SELECT es.id_espacio, es.nombre
       FROM ausencia_espacio ae
       JOIN espacio es ON ae.id_espacio = es.id_espacio
       WHERE ae.id_ausencia = ?`, [id]
    );
    return rows;
  },

  async create({ tramo_horario, fecha, comentario, hay_tarea, descripcion_tarea, id_profesor, id_usuario_creador, espacios }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'INSERT INTO ausencia (tramo_horario, fecha, comentario, hay_tarea, descripcion_tarea, id_profesor, id_usuario_creador) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tramo_horario, fecha, comentario || null, hay_tarea ? 1 : 0, descripcion_tarea || null, id_profesor, id_usuario_creador]
      );
      const idAusencia = result.insertId;
      if (espacios && espacios.length) {
        await conn.query('INSERT INTO ausencia_espacio (id_ausencia, id_espacio) VALUES ?',
          [espacios.map(idEsp => [idAusencia, idEsp])]);
      }
      await conn.commit();
      return idAusencia;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async update(id, campos) {
    const sets = [];
    const vals = [];
    if (campos.tramo_horario !== undefined) { sets.push('tramo_horario = ?'); vals.push(campos.tramo_horario); }
    if (campos.fecha !== undefined) { sets.push('fecha = ?'); vals.push(campos.fecha); }
    if (campos.comentario !== undefined) { sets.push('comentario = ?'); vals.push(campos.comentario); }
    if (campos.hay_tarea !== undefined) { sets.push('hay_tarea = ?'); vals.push(campos.hay_tarea ? 1 : 0); }
    if (campos.descripcion_tarea !== undefined) { sets.push('descripcion_tarea = ?'); vals.push(campos.descripcion_tarea); }
    if (!sets.length) return false;
    vals.push(id);
    const [result] = await pool.query(`UPDATE ausencia SET ${sets.join(', ')} WHERE id_ausencia = ?`, vals);
    return result.affectedRows > 0;
  },

  async cambiarEstado(id, estado) {
    const [result] = await pool.query('UPDATE ausencia SET estado = ? WHERE id_ausencia = ?', [estado, id]);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM ausencia WHERE id_ausencia = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Ausencia;
