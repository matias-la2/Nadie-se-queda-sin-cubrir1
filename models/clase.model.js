const pool = require('../config/db');

const Clase = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM clase ORDER BY curso');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM clase WHERE id_clase = ?', [id]);
    return rows[0] || null;
  },

  async create(curso) {
    const [result] = await pool.query('INSERT INTO clase (curso) VALUES (?)', [curso]);
    return result.insertId;
  },

  async update(id, curso) {
    const [result] = await pool.query('UPDATE clase SET curso = ? WHERE id_clase = ?', [curso, id]);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM clase WHERE id_clase = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Clase;
