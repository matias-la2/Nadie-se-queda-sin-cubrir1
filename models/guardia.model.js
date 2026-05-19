const pool = require('../config/db');

const Guardia = {
  // ── Guardias Creadas ──

  async findAllCreadas({ id_usuario, dia_semana, curso_escolar, limit, offset } = {}) {
    const where = [];
    const params = [];
    if (id_usuario) { where.push('gc.id_usuario = ?'); params.push(id_usuario); }
    if (dia_semana) { where.push('gc.dia_semana = ?'); params.push(dia_semana); }
    if (curso_escolar) { where.push('gc.curso_escolar = ?'); params.push(curso_escolar); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM guardia_creada gc ${whereSql}`, params
    );
    const [rows] = await pool.query(
      `SELECT gc.*, u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              es.nombre AS espacio_nombre
       FROM guardia_creada gc
       JOIN usuario u ON gc.id_usuario = u.id_usuario
       LEFT JOIN espacio es ON gc.id_espacio = es.id_espacio
       ${whereSql} ORDER BY gc.dia_semana, gc.tramo_horario LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { rows, total };
  },

  async findCreadaById(id) {
    const [rows] = await pool.query(
      `SELECT gc.*, u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              es.nombre AS espacio_nombre
       FROM guardia_creada gc
       JOIN usuario u ON gc.id_usuario = u.id_usuario
       LEFT JOIN espacio es ON gc.id_espacio = es.id_espacio
       WHERE gc.id_guardia_creada = ?`, [id]
    );
    return rows[0] || null;
  },

  async createCreada({ fecha, dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio }) {
    const [result] = await pool.query(
      'INSERT INTO guardia_creada (fecha, dia_semana, tramo_horario, curso_escolar, id_usuario, id_espacio) VALUES (?, ?, ?, ?, ?, ?)',
      [fecha || null, dia_semana || null, tramo_horario, curso_escolar, id_usuario, id_espacio || null]
    );
    return result.insertId;
  },

  async updateCreada(id, campos) {
    const sets = [];
    const vals = [];
    if (campos.fecha !== undefined) { sets.push('fecha = ?'); vals.push(campos.fecha); }
    if (campos.dia_semana !== undefined) { sets.push('dia_semana = ?'); vals.push(campos.dia_semana); }
    if (campos.tramo_horario !== undefined) { sets.push('tramo_horario = ?'); vals.push(campos.tramo_horario); }
    if (campos.curso_escolar !== undefined) { sets.push('curso_escolar = ?'); vals.push(campos.curso_escolar); }
    if (campos.id_usuario !== undefined) { sets.push('id_usuario = ?'); vals.push(campos.id_usuario); }
    if (campos.id_espacio !== undefined) { sets.push('id_espacio = ?'); vals.push(campos.id_espacio); }
    if (!sets.length) return false;
    vals.push(id);
    const [result] = await pool.query(`UPDATE guardia_creada SET ${sets.join(', ')} WHERE id_guardia_creada = ?`, vals);
    return result.affectedRows > 0;
  },

  async deleteCreada(id) {
    const [result] = await pool.query('DELETE FROM guardia_creada WHERE id_guardia_creada = ?', [id]);
    return result.affectedRows > 0;
  },

  // ── Guardias Asignadas ──

  async findAllAsignadas({ fecha, id_profesor_sustituto, id_ausencia, fecha_desde, fecha_hasta, limit, offset } = {}) {
    const where = [];
    const params = [];
    if (fecha) { where.push('ga.fecha = ?'); params.push(fecha); }
    if (id_profesor_sustituto) { where.push('ga.id_profesor_sustituto = ?'); params.push(id_profesor_sustituto); }
    if (id_ausencia) { where.push('ga.id_ausencia = ?'); params.push(id_ausencia); }
    if (fecha_desde) { where.push('ga.fecha >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { where.push('ga.fecha <= ?'); params.push(fecha_hasta); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM guardia_asignada ga ${whereSql}`, params
    );
    const [rows] = await pool.query(
      `SELECT ga.*, us.nombre AS sustituto_nombre, us.apellidos AS sustituto_apellidos,
              ua.nombre AS ausente_nombre, ua.apellidos AS ausente_apellidos,
              c.curso AS clase_curso, a.tramo_horario AS ausencia_tramo
       FROM guardia_asignada ga
       JOIN usuario us ON ga.id_profesor_sustituto = us.id_usuario
       JOIN ausencia a ON ga.id_ausencia = a.id_ausencia
       JOIN usuario ua ON a.id_profesor = ua.id_usuario
       LEFT JOIN clase c ON ga.id_clase = c.id_clase
       ${whereSql} ORDER BY ga.fecha DESC, ga.tramo_horario LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { rows, total };
  },

  async checkConflicto(id_profesor_sustituto, fecha, tramo_horario) {
    const [[{ conflictos }]] = await pool.query(
      'SELECT COUNT(*) as conflictos FROM guardia_asignada WHERE id_profesor_sustituto = ? AND fecha = ? AND tramo_horario = ?',
      [id_profesor_sustituto, fecha, tramo_horario]
    );
    return conflictos > 0;
  },

  async deleteAsignada(id) {
    const [result] = await pool.query('DELETE FROM guardia_asignada WHERE id_guardia_asignada = ?', [id]);
    return result.affectedRows > 0;
  },

  async findAsignadasHoy() {
    const [rows] = await pool.query(
      `SELECT ga.*, us.nombre AS sustituto_nombre, us.apellidos AS sustituto_apellidos,
              ua.nombre AS ausente_nombre, ua.apellidos AS ausente_apellidos,
              c.curso AS clase_curso
       FROM guardia_asignada ga
       JOIN usuario us ON ga.id_profesor_sustituto = us.id_usuario
       JOIN ausencia a ON ga.id_ausencia = a.id_ausencia
       JOIN usuario ua ON a.id_profesor = ua.id_usuario
       LEFT JOIN clase c ON ga.id_clase = c.id_clase
       WHERE ga.fecha = CURDATE()`
    );
    return rows;
  },

  async countByProfesor(idsProfesor) {
    if (!idsProfesor.length) return new Map();
    const [rows] = await pool.query(
      `SELECT id_profesor_sustituto, COUNT(*) AS total
       FROM guardia_asignada
       WHERE fecha >= '2025-09-01' AND id_profesor_sustituto IN (?)
       GROUP BY id_profesor_sustituto`,
      [idsProfesor]
    );
    const mapa = new Map();
    for (const r of rows) mapa.set(r.id_profesor_sustituto, r.total);
    return mapa;
  }
};

module.exports = Guardia;
