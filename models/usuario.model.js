const pool = require('../config/db');

const Usuario = {
  async findAll({ activo, busqueda, rol, limit, offset } = {}) {
    const where = [];
    const params = [];
    if (activo !== undefined) { where.push('u.activo = ?'); params.push(activo ? 1 : 0); }
    if (busqueda) {
      where.push('(u.nombre LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ?)');
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }
    if (rol) {
      where.push('EXISTS (SELECT 1 FROM usuario_rol ur2 JOIN rol r2 ON ur2.id_rol = r2.id_rol WHERE ur2.id_usuario = u.id_usuario AND r2.nombre_rol = ?)');
      params.push(rol);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM usuario u ${whereSql}`, params);
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.avatar_url, u.activo, u.created_at,
              GROUP_CONCAT(r.nombre_rol) AS roles_str
       FROM usuario u
       LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
       LEFT JOIN rol r ON ur.id_rol = r.id_rol
       ${whereSql} GROUP BY u.id_usuario ORDER BY u.apellidos, u.nombre LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    for (const u of rows) { u.roles = u.roles_str ? u.roles_str.split(',') : []; delete u.roles_str; }
    return { rows, total };
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.avatar_url, u.activo, u.created_at,
              GROUP_CONCAT(r.nombre_rol) AS roles_str
       FROM usuario u
       LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
       LEFT JOIN rol r ON ur.id_rol = r.id_rol
       WHERE u.id_usuario = ? GROUP BY u.id_usuario`, [id]
    );
    if (!rows.length) return null;
    const u = rows[0];
    u.roles = u.roles_str ? u.roles_str.split(',') : [];
    delete u.roles_str;
    return u;
  },

  async findByGoogleId(googleId) {
    const [rows] = await pool.query('SELECT id_usuario FROM usuario WHERE google_id = ?', [googleId]);
    return rows[0] || null;
  },

  async create({ nombre, apellidos, correo, google_id, avatar_url }) {
    const [result] = await pool.query(
      'INSERT INTO usuario (nombre, apellidos, correo, google_id, avatar_url) VALUES (?, ?, ?, ?, ?)',
      [nombre, apellidos, correo, google_id, avatar_url || null]
    );
    return result.insertId;
  },

  async update(id, campos) {
    const sets = [];
    const vals = [];
    if (campos.nombre !== undefined) { sets.push('nombre = ?'); vals.push(campos.nombre); }
    if (campos.apellidos !== undefined) { sets.push('apellidos = ?'); vals.push(campos.apellidos); }
    if (campos.correo !== undefined) { sets.push('correo = ?'); vals.push(campos.correo); }
    if (campos.activo !== undefined) { sets.push('activo = ?'); vals.push(campos.activo ? 1 : 0); }
    if (campos.avatar_url !== undefined) { sets.push('avatar_url = ?'); vals.push(campos.avatar_url); }
    if (!sets.length) return false;
    vals.push(id);
    const [result] = await pool.query(`UPDATE usuario SET ${sets.join(', ')} WHERE id_usuario = ?`, vals);
    return result.affectedRows > 0;
  },

  async toggleActivo(id) {
    const [result] = await pool.query('UPDATE usuario SET activo = NOT activo WHERE id_usuario = ?', [id]);
    return result.affectedRows > 0;
  },

  async getRoles(id) {
    const [rows] = await pool.query(
      'SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = ?', [id]
    );
    return rows.map(r => r.nombre_rol);
  },

  async setRoles(id, roles) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rolesDB] = await conn.query('SELECT id_rol, nombre_rol FROM rol WHERE nombre_rol IN (?)', [roles]);
      await conn.query('DELETE FROM usuario_rol WHERE id_usuario = ?', [id]);
      if (rolesDB.length) {
        await conn.query('INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ?', [rolesDB.map(r => [id, r.id_rol])]);
      }
      await conn.commit();
      return rolesDB.map(r => r.nombre_rol);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
};

module.exports = Usuario;
