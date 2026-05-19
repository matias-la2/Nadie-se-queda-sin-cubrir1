const pool = require('../config/db');

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
      where.push('EXISTS (SELECT 1 FROM profesor_edificio pe WHERE pe.id_usuario = p.id_usuario AND pe.id_edificio = ?)');
      params.push(id_edificio);
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
    const [rows] = await pool.query(
      `SELECT e.id_edificio, e.nombre FROM profesor_edificio pe
       JOIN edificio e ON pe.id_edificio = e.id_edificio WHERE pe.id_usuario = ?`, [id]
    );
    return rows;
  },

  async setEdificios(id, edificios) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM profesor_edificio WHERE id_usuario = ?', [id]);
      if (edificios && edificios.length) {
        await conn.query('INSERT INTO profesor_edificio (id_usuario, id_edificio) VALUES ?',
          [edificios.map(idEd => [id, idEd])]);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
};

module.exports = Profesor;
