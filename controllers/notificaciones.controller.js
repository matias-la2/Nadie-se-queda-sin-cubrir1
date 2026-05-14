const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');
const { paginar, respuestaPaginada } = require('../helpers/pagination.helper');

async function listar(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);
    const idUsuario = req.usuario.id;

    let whereExtra = '';
    const params = [idUsuario];

    if (req.query.leida === '1') {
      whereExtra = ' AND leida = 1';
    } else if (req.query.leida === '0') {
      whereExtra = ' AND leida = 0';
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM notificacion WHERE id_usuario = ?${whereExtra}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT * FROM notificacion
       WHERE id_usuario = ?${whereExtra}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

async function marcarLeida(req, res, next) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'UPDATE notificacion SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?',
      [id, req.usuario.id]
    );

    if (result.affectedRows === 0) {
      return error(res, 'Notificación no encontrada', 404);
    }

    return success(res, { mensaje: 'Marcada como leída' });
  } catch (err) {
    next(err);
  }
}

async function marcarTodasLeidas(req, res, next) {
  try {
    await pool.query(
      'UPDATE notificacion SET leida = 1 WHERE id_usuario = ? AND leida = 0',
      [req.usuario.id]
    );
    return success(res, { mensaje: 'Todas marcadas como leídas' });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { id_usuario, tipo, mensaje, referencia_id, referencia_tipo } = req.body;

    const [result] = await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, mensaje, referencia_id, referencia_tipo)
       VALUES (?, ?, ?, ?, ?)`,
      [id_usuario, tipo, mensaje, referencia_id || null, referencia_tipo || null]
    );

    res.registroId = result.insertId;
    return success(res, { id: result.insertId }, 201);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, marcarLeida, marcarTodasLeidas, crear };
