// ╔═══════════════════════════════════════════════════════════╗
// ║  PLANTILLA DE CONTROLLER — Copiar y renombrar           ║
// ║  Ejemplo: incidencias.controller.js                     ║
// ╚═══════════════════════════════════════════════════════════╝

const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');
const { paginar, respuestaPaginada } = require('../helpers/pagination.helper');

// GET /api/v1/tu-modulo
async function listar(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM tu_tabla'
    );

    const [rows] = await pool.query(
      'SELECT * FROM tu_tabla ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/tu-modulo/:id
async function obtenerPorId(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tu_tabla WHERE id_tu_tabla = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return error(res, 'Recurso no encontrado', 404);
    }

    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/tu-modulo
async function crear(req, res, next) {
  try {
    const { campo1, campo2 } = req.body;

    const [result] = await pool.query(
      'INSERT INTO tu_tabla (campo1, campo2) VALUES (?, ?)',
      [campo1, campo2]
    );

    res.registroId = result.insertId;
    return success(res, { id: result.insertId }, 201);
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/tu-modulo/:id
async function actualizar(req, res, next) {
  try {
    const { campo1, campo2 } = req.body;

    const [result] = await pool.query(
      'UPDATE tu_tabla SET campo1 = ?, campo2 = ? WHERE id_tu_tabla = ?',
      [campo1, campo2, req.params.id]
    );

    if (result.affectedRows === 0) {
      return error(res, 'Recurso no encontrado', 404);
    }

    return success(res, { mensaje: 'Actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/tu-modulo/:id
async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM tu_tabla WHERE id_tu_tabla = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return error(res, 'Recurso no encontrado', 404);
    }

    return success(res, { mensaje: 'Eliminado correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
