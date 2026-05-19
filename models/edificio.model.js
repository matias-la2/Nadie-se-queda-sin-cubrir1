const pool = require('../config/db');

const Edificio = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM edificio ORDER BY nombre');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT e.*, COUNT(es.id_espacio) AS total_espacios
       FROM edificio e
       LEFT JOIN espacio es ON e.id_edificio = es.id_edificio
       WHERE e.id_edificio = ? GROUP BY e.id_edificio`, [id]
    );
    return rows[0] || null;
  },

  async create({ nombre, piso }) {
    const [result] = await pool.query(
      'INSERT INTO edificio (nombre, piso) VALUES (?, ?)',
      [nombre, piso || null]
    );
    return result.insertId;
  },

  async update(id, campos) {
    const sets = [];
    const vals = [];
    if (campos.nombre !== undefined) { sets.push('nombre = ?'); vals.push(campos.nombre); }
    if (campos.piso !== undefined) { sets.push('piso = ?'); vals.push(campos.piso); }
    if (!sets.length) return false;
    vals.push(id);
    const [result] = await pool.query(`UPDATE edificio SET ${sets.join(', ')} WHERE id_edificio = ?`, vals);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM edificio WHERE id_edificio = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Edificio;
