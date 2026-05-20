const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');
const { paginar, respuestaPaginada } = require('../helpers/pagination.helper');

async function listar(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);
    const where = [];
    const params = [];

    if (req.query.estado) {
      where.push('i.estado = ?');
      params.push(req.query.estado);
    }
    if (req.query.tipo) {
      where.push('i.tipo = ?');
      params.push(req.query.tipo);
    }
    if (req.query.id_creador) {
      where.push('i.id_usuario_creador = ?');
      params.push(req.query.id_creador);
    }
    if (req.query.fecha_desde) {
      where.push('i.fecha >= ?');
      params.push(req.query.fecha_desde);
    }
    if (req.query.fecha_hasta) {
      where.push('i.fecha <= ?');
      params.push(req.query.fecha_hasta);
    }
    if (req.query.busqueda) {
      where.push('(i.titulo LIKE ? OR i.descripcion LIKE ?)');
      params.push(`%${req.query.busqueda}%`, `%${req.query.busqueda}%`);
    }

    const rolesUsuario = req.usuario.roles;
    const esProfesor = rolesUsuario.length === 1 && rolesUsuario[0] === 'PROFESOR';

    if (esProfesor) {
      where.push('i.id_usuario_creador = ?');
      params.push(req.usuario.id);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM incidencia i ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT i.*,
              es.nombre AS espacio_nombre,
              uc.nombre AS creador_nombre, uc.apellidos AS creador_apellidos
       FROM incidencia i
       LEFT JOIN espacio es ON i.id_espacio = es.id_espacio
       JOIN usuario uc ON i.id_usuario_creador = uc.id_usuario
       ${whereSql}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT i.*,
              es.nombre AS espacio_nombre,
              uc.nombre AS creador_nombre, uc.apellidos AS creador_apellidos,
              ud.nombre AS directivo_nombre, ud.apellidos AS directivo_apellidos
       FROM incidencia i
       LEFT JOIN espacio es ON i.id_espacio = es.id_espacio
       JOIN usuario uc ON i.id_usuario_creador = uc.id_usuario
       LEFT JOIN usuario ud ON i.id_equipo_directivo = ud.id_usuario
       WHERE i.id_incidencia = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return error(res, 'Incidencia no encontrada', 404);
    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { titulo, descripcion, tipo, fecha, id_espacio } = req.body;
    const [result] = await pool.query(
      `INSERT INTO incidencia (titulo, descripcion, tipo, fecha, id_espacio, id_usuario_creador)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [titulo, descripcion || null, tipo, fecha, id_espacio || null, req.usuario.id]
    );
    res.registroId = result.insertId;
    return success(res, { id: result.insertId }, 201);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const campos = [];
    const valores = [];
    if (req.body.titulo !== undefined) { campos.push('titulo = ?'); valores.push(req.body.titulo); }
    if (req.body.descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(req.body.descripcion); }
    if (req.body.tipo !== undefined) { campos.push('tipo = ?'); valores.push(req.body.tipo); }
    if (req.body.fecha !== undefined) { campos.push('fecha = ?'); valores.push(req.body.fecha); }
    if (req.body.id_espacio !== undefined) { campos.push('id_espacio = ?'); valores.push(req.body.id_espacio); }
    if (campos.length === 0) return error(res, 'No se enviaron campos para actualizar', 400);

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE incidencia SET ${campos.join(', ')} WHERE id_incidencia = ?`,
      valores
    );
    if (result.affectedRows === 0) return error(res, 'Incidencia no encontrada', 404);
    return success(res, { mensaje: 'Incidencia actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const { estado } = req.body;
    const valores = [estado];
    let sql = 'UPDATE incidencia SET estado = ?';

    const roles = req.usuario.roles || [];
    const esDirectivo = roles.includes('EQUIPO_DIRECTIVO') || roles.includes('ADMINISTRADOR');
    if ((estado === 'EN_PROCESO' || estado === 'RESUELTA') && esDirectivo) {
      sql += ', id_equipo_directivo = ?';
      valores.push(req.usuario.id);
    }

    sql += ' WHERE id_incidencia = ?';
    valores.push(req.params.id);

    const [result] = await pool.query(sql, valores);
    if (result.affectedRows === 0) return error(res, 'Incidencia no encontrada', 404);
    return success(res, { mensaje: 'Estado actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM incidencia WHERE id_incidencia = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Incidencia no encontrada', 404);
    return success(res, { mensaje: 'Incidencia eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtenerPorId, crear, actualizar, cambiarEstado, eliminar };
