const pool = require('../config/db');
const { edificiosDeProfesor, sqlExisteEnEdificio } = require('../helpers/profesor-edificios.helper');
const { cursoActual } = require('../helpers/curso.helper');

const Profesor = {
  async findAll({ departamento, busqueda, id_edificio, limit, offset } = {}) {
    const where = [];
    const params = [];
    if (departamento) { where.push('p.departamento = ?'); params.push(departamento); }
    if (busqueda) {
      where.push('(u.nombre LIKE ? OR u.apellidos LIKE ?)');
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }
    if (id_edificio) {
      where.push(sqlExisteEnEdificio('p.id_usuario'));
      params.push(id_edificio, cursoActual());
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM profesor p JOIN usuario u ON p.id_usuario = u.id_usuario ${whereSql}`, params
    );
    const [rows] = await pool.query(
      `SELECT p.*, u.nombre, u.apellidos, u.correo, u.avatar_url, u.activo
       FROM profesor p JOIN usuario u ON p.id_usuario = u.id_usuario
       ${whereSql} ORDER BY u.apellidos, u.nombre LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { rows, total };
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT p.*, u.nombre, u.apellidos, u.correo, u.avatar_url, u.activo
       FROM profesor p JOIN usuario u ON p.id_usuario = u.id_usuario WHERE p.id_usuario = ?`, [id]
    );
    return rows[0] || null;
  },

  async create(id_usuario, departamento) {
    await pool.query('INSERT INTO profesor (id_usuario, departamento) VALUES (?, ?)', [id_usuario, departamento || null]);
    return id_usuario;
  },

  async update(id, departamento) {
    const [result] = await pool.query('UPDATE profesor SET departamento = ? WHERE id_usuario = ?', [departamento, id]);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM profesor WHERE id_usuario = ?', [id]);
    return result.affectedRows > 0;
  },

  async getEdificios(id) {
    return edificiosDeProfesor(pool, id);
  }
};

module.exports = Profesor;
