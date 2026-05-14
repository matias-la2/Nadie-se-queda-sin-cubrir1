const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');

async function listar(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM clase ORDER BY curso');
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM clase WHERE id_clase = ?',
      [req.params.id]
    );
    if (rows.length === 0) return error(res, 'Clase no encontrada', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { curso } = req.body;
    const [result] = await pool.query(
      'INSERT INTO clase (curso) VALUES (?)',
      [curso]
    );
    res.registroId = result.insertId;
    return success(res, { id: result.insertId }, 201);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { curso } = req.body;
    if (!curso) return error(res, 'No se enviaron campos para actualizar', 400);
    const [result] = await pool.query(
      'UPDATE clase SET curso = ? WHERE id_clase = ?',
      [curso, req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Clase no encontrada', 404);
    return success(res, { mensaje: 'Clase actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM clase WHERE id_clase = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Clase no encontrada', 404);
    return success(res, { mensaje: 'Clase eliminada correctamente' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return error(res, 'No se puede eliminar: tiene guardias asociadas', 409);
    }
    next(err);
  }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
