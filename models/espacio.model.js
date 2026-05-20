const pool = require('../config/db');

const Espacio = {
  async findAll({ id_edificio, estado_disponibilidad, busqueda, curso_escolar, limit, offset } = {}) {
    const where = [];
    const params = [];
    if (id_edificio) { where.push('e.id_edificio = ?'); params.push(id_edificio); }
    if (estado_disponibilidad) { where.push('e.estado_disponibilidad = ?'); params.push(estado_disponibilidad); }
    if (busqueda) {
      if (curso_escolar) {
        where.push('(e.nombre LIKE ? OR ec.nombre_curso LIKE ?)');
        params.push(`%${busqueda}%`, `%${busqueda}%`);
      } else {
        where.push('e.nombre LIKE ?');
        params.push(`%${busqueda}%`);
      }
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

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
       ${whereSql} ORDER BY ed.nombre, e.planta, e.nombre LIMIT ? OFFSET ?`,
      [...cursoParams, ...params, limit, offset]
    );
    return { rows, total };
  },

  async findById(id, curso_escolar) {
    const joinCurso = curso_escolar
      ? 'LEFT JOIN espacio_curso ec ON e.id_espacio = ec.id_espacio AND ec.curso_escolar = ?'
      : '';
    const params = curso_escolar ? [curso_escolar, id] : [id];
    const [rows] = await pool.query(
      `SELECT e.*, ed.nombre AS edificio_nombre
              ${curso_escolar ? ', ec.nombre_curso' : ''}
       FROM espacio e
       JOIN edificio ed ON e.id_edificio = ed.id_edificio
       ${joinCurso}
       WHERE e.id_espacio = ?`, params
    );
    return rows[0] || null;
  },

  async create({ id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio }) {
    if (id_espacio) {
      await pool.query(
        'INSERT INTO espacio (id_espacio, nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES (?, ?, ?, ?, ?, ?)',
        [id_espacio, nombre, estado_disponibilidad || 'DISPONIBLE', capacidad || null, planta || null, id_edificio]
      );
      return id_espacio;
    }
    const [result] = await pool.query(
      'INSERT INTO espacio (nombre, estado_disponibilidad, capacidad, planta, id_edificio) VALUES (?, ?, ?, ?, ?)',
      [nombre, estado_disponibilidad || 'DISPONIBLE', capacidad || null, planta || null, id_edificio]
    );
    return result.insertId;
  },

  async update(id, campos) {
    const sets = [];
    const vals = [];
    if (campos.nombre !== undefined) { sets.push('nombre = ?'); vals.push(campos.nombre); }
    if (campos.estado_disponibilidad !== undefined) { sets.push('estado_disponibilidad = ?'); vals.push(campos.estado_disponibilidad); }
    if (campos.capacidad !== undefined) { sets.push('capacidad = ?'); vals.push(campos.capacidad); }
    if (campos.planta !== undefined) { sets.push('planta = ?'); vals.push(campos.planta); }
    if (campos.id_edificio !== undefined) { sets.push('id_edificio = ?'); vals.push(campos.id_edificio); }
    if (!sets.length) return false;
    vals.push(id);
    const [result] = await pool.query(`UPDATE espacio SET ${sets.join(', ')} WHERE id_espacio = ?`, vals);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM espacio WHERE id_espacio = ?', [id]);
    return result.affectedRows > 0;
  },

  async findNombresCurso(curso_escolar) {
    const [rows] = await pool.query(
      `SELECT ec.*, e.nombre AS nombre_espacio, ed.nombre AS edificio_nombre, e.planta
       FROM espacio_curso ec
       JOIN espacio e ON ec.id_espacio = e.id_espacio
       JOIN edificio ed ON e.id_edificio = ed.id_edificio
       WHERE ec.curso_escolar = ?
       ORDER BY ed.nombre, e.planta, ec.nombre_curso`,
      [curso_escolar]
    );
    return rows;
  },

  async setNombreCurso(id_espacio, curso_escolar, nombre_curso) {
    await pool.query(
      `INSERT INTO espacio_curso (id_espacio, curso_escolar, nombre_curso)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre_curso = VALUES(nombre_curso)`,
      [id_espacio, curso_escolar, nombre_curso]
    );
  },

  async deleteNombreCurso(id_espacio, curso_escolar) {
    const [result] = await pool.query(
      'DELETE FROM espacio_curso WHERE id_espacio = ? AND curso_escolar = ?',
      [id_espacio, curso_escolar]
    );
    return result.affectedRows > 0;
  }
};

module.exports = Espacio;
