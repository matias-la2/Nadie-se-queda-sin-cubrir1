const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');
const { paginar, respuestaPaginada } = require('../helpers/pagination.helper');

async function listar(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);
    const where = [];
    const params = [];

    if (req.query.estado) {
      where.push('a.estado = ?');
      params.push(req.query.estado);
    }
    if (req.query.id_profesor) {
      where.push('a.id_profesor = ?');
      params.push(req.query.id_profesor);
    }
    if (req.query.fecha_desde) {
      where.push('a.fecha >= ?');
      params.push(req.query.fecha_desde);
    }
    if (req.query.fecha_hasta) {
      where.push('a.fecha <= ?');
      params.push(req.query.fecha_hasta);
    }

    const esProfesor = req.usuario.roles.length === 1 && req.usuario.roles[0] === 'PROFESOR';
    if (esProfesor) {
      where.push('a.id_profesor = ?');
      params.push(req.usuario.id);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM ausencia a ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT a.*,
              u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              p.departamento,
              uc.nombre AS creador_nombre, uc.apellidos AS creador_apellidos
       FROM ausencia a
       JOIN usuario u ON a.id_profesor = u.id_usuario
       JOIN profesor p ON a.id_profesor = p.id_usuario
       JOIN usuario uc ON a.id_usuario_creador = uc.id_usuario
       ${whereSql}
       ORDER BY a.fecha DESC, a.tramo_horario
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
      `SELECT a.*,
              u.nombre AS profesor_nombre, u.apellidos AS profesor_apellidos,
              p.departamento,
              uc.nombre AS creador_nombre, uc.apellidos AS creador_apellidos
       FROM ausencia a
       JOIN usuario u ON a.id_profesor = u.id_usuario
       JOIN profesor p ON a.id_profesor = p.id_usuario
       JOIN usuario uc ON a.id_usuario_creador = uc.id_usuario
       WHERE a.id_ausencia = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return error(res, 'Ausencia no encontrada', 404);

    const [espacios] = await pool.query(
      `SELECT es.id_espacio, es.nombre
       FROM ausencia_espacio ae
       JOIN espacio es ON ae.id_espacio = es.id_espacio
       WHERE ae.id_ausencia = ?`,
      [req.params.id]
    );

    const ausencia = rows[0];
    ausencia.espacios = espacios;
    return success(res, ausencia);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { tramo_horario, fecha, comentario, hay_tarea, descripcion_tarea, id_profesor, espacios } = req.body;
    const profesorId = id_profesor || req.usuario.id;
    const archivoTarea = req.file ? 'uploads/tareas/' + req.file.filename : null;

    const [result] = await conn.query(
      `INSERT INTO ausencia (tramo_horario, fecha, comentario, hay_tarea, descripcion_tarea, archivo_tarea, id_profesor, id_usuario_creador)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tramo_horario, fecha, comentario || null, hay_tarea ? 1 : 0, descripcion_tarea || null, archivoTarea, profesorId, req.usuario.id]
    );

    const idAusencia = result.insertId;

    if (espacios && espacios.length > 0) {
      const valores = espacios.map(idEsp => [idAusencia, idEsp]);
      await conn.query(
        'INSERT INTO ausencia_espacio (id_ausencia, id_espacio) VALUES ?',
        [valores]
      );
    }

    await conn.commit();
    res.registroId = idAusencia;
    return success(res, { id: idAusencia }, 201);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function actualizar(req, res, next) {
  try {
    const campos = [];
    const valores = [];
    if (req.body.tramo_horario !== undefined) { campos.push('tramo_horario = ?'); valores.push(req.body.tramo_horario); }
    if (req.body.fecha !== undefined) { campos.push('fecha = ?'); valores.push(req.body.fecha); }
    if (req.body.comentario !== undefined) { campos.push('comentario = ?'); valores.push(req.body.comentario); }
    if (req.body.hay_tarea !== undefined) { campos.push('hay_tarea = ?'); valores.push(req.body.hay_tarea ? 1 : 0); }
    if (req.body.descripcion_tarea !== undefined) { campos.push('descripcion_tarea = ?'); valores.push(req.body.descripcion_tarea); }
    if (req.file) { campos.push('archivo_tarea = ?'); valores.push('uploads/tareas/' + req.file.filename); }
    if (campos.length === 0) return error(res, 'No se enviaron campos para actualizar', 400);

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE ausencia SET ${campos.join(', ')} WHERE id_ausencia = ?`,
      valores
    );
    if (result.affectedRows === 0) return error(res, 'Ausencia no encontrada', 404);
    return success(res, { mensaje: 'Ausencia actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const { estado } = req.body;
    const [result] = await pool.query(
      'UPDATE ausencia SET estado = ? WHERE id_ausencia = ?',
      [estado, req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Ausencia no encontrada', 404);
    return success(res, { mensaje: 'Estado de ausencia actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM ausencia WHERE id_ausencia = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Ausencia no encontrada', 404);
    return success(res, { mensaje: 'Ausencia eliminada correctamente' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return error(res, 'No se puede eliminar: tiene guardias asignadas', 409);
    }
    next(err);
  }
}

module.exports = { listar, obtenerPorId, crear, actualizar, cambiarEstado, eliminar };
