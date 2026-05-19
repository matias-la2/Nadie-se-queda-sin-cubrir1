const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');
const { paginar, respuestaPaginada } = require('../helpers/pagination.helper');

// ─── USUARIOS ──────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);
    const where = [];
    const params = [];

    if (req.query.activo !== undefined) {
      where.push('u.activo = ?');
      params.push(req.query.activo === 'true' ? 1 : 0);
    }
    if (req.query.busqueda) {
      where.push('(u.nombre LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ?)');
      params.push(`%${req.query.busqueda}%`, `%${req.query.busqueda}%`, `%${req.query.busqueda}%`);
    }
    if (req.query.rol) {
      where.push(`EXISTS (
        SELECT 1 FROM usuario_rol ur2 JOIN rol r2 ON ur2.id_rol = r2.id_rol
        WHERE ur2.id_usuario = u.id_usuario AND r2.nombre_rol = ?
      )`);
      params.push(req.query.rol);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM usuario u ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.avatar_url, u.activo, u.created_at,
              GROUP_CONCAT(r.nombre_rol) AS roles_str
       FROM usuario u
       LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
       LEFT JOIN rol r ON ur.id_rol = r.id_rol
       ${whereSql}
       GROUP BY u.id_usuario
       ORDER BY u.apellidos, u.nombre
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    for (const user of rows) {
      user.roles = user.roles_str ? user.roles_str.split(',') : [];
      delete user.roles_str;
    }

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.avatar_url, u.activo, u.created_at,
              GROUP_CONCAT(r.nombre_rol) AS roles_str
       FROM usuario u
       LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
       LEFT JOIN rol r ON ur.id_rol = r.id_rol
       WHERE u.id_usuario = ?
       GROUP BY u.id_usuario`,
      [req.params.id]
    );
    if (rows.length === 0) return error(res, 'Usuario no encontrado', 404);

    const user = rows[0];
    user.roles = user.roles_str ? user.roles_str.split(',') : [];
    delete user.roles_str;

    const [prof] = await pool.query(
      'SELECT departamento FROM profesor WHERE id_usuario = ?',
      [req.params.id]
    );
    if (prof.length > 0) {
      user.profesor = prof[0];
      const [edificios] = await pool.query(
        `SELECT e.id_edificio, e.nombre
         FROM profesor_edificio pe
         JOIN edificio e ON pe.id_edificio = e.id_edificio
         WHERE pe.id_usuario = ?`,
        [req.params.id]
      );
      user.profesor.edificios = edificios;
    }

    const [dir] = await pool.query(
      'SELECT cargo FROM equipo_directivo WHERE id_usuario = ?',
      [req.params.id]
    );
    if (dir.length > 0) user.equipo_directivo = dir[0];

    return success(res, user);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const campos = [];
    const valores = [];
    if (req.body.nombre !== undefined) { campos.push('nombre = ?'); valores.push(req.body.nombre); }
    if (req.body.apellidos !== undefined) { campos.push('apellidos = ?'); valores.push(req.body.apellidos); }
    if (req.body.correo !== undefined) { campos.push('correo = ?'); valores.push(req.body.correo); }
    if (req.body.activo !== undefined) { campos.push('activo = ?'); valores.push(req.body.activo ? 1 : 0); }
    if (campos.length === 0) return error(res, 'No se enviaron campos para actualizar', 400);

    valores.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = ?`,
      valores
    );
    if (result.affectedRows === 0) return error(res, 'Usuario no encontrado', 404);
    return success(res, { mensaje: 'Usuario actualizado correctamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, 'El correo ya está en uso', 409);
    }
    next(err);
  }
}

async function toggleActivo(req, res, next) {
  try {
    const [result] = await pool.query(
      'UPDATE usuario SET activo = NOT activo WHERE id_usuario = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Usuario no encontrado', 404);
    return success(res, { mensaje: 'Estado del usuario actualizado' });
  } catch (err) {
    next(err);
  }
}

async function cambiarRoles(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { roles } = req.body;

    const [rolesDB] = await conn.query(
      'SELECT id_rol, nombre_rol FROM rol WHERE nombre_rol IN (?)',
      [roles]
    );

    if (rolesDB.length !== roles.length) {
      const encontrados = rolesDB.map(r => r.nombre_rol);
      const noEncontrados = roles.filter(r => !encontrados.includes(r));
      await conn.rollback();
      return error(res, `Roles no encontrados: ${noEncontrados.join(', ')}`, 400);
    }

    await conn.query('DELETE FROM usuario_rol WHERE id_usuario = ?', [req.params.id]);

    const valores = rolesDB.map(r => [parseInt(req.params.id), r.id_rol]);
    await conn.query('INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ?', [valores]);

    await conn.commit();
    return success(res, { mensaje: 'Roles actualizados correctamente' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// ─── PROFESORES ────────────────────────────────────────

async function listarProfesores(req, res, next) {
  try {
    const { page, limit, offset } = paginar(req.query);
    const where = [];
    const params = [];

    if (req.query.departamento) {
      where.push('p.departamento = ?');
      params.push(req.query.departamento);
    }
    if (req.query.busqueda) {
      where.push('(u.nombre LIKE ? OR u.apellidos LIKE ?)');
      params.push(`%${req.query.busqueda}%`, `%${req.query.busqueda}%`);
    }
    if (req.query.id_edificio) {
      where.push(`EXISTS (
        SELECT 1 FROM profesor_edificio pe
        WHERE pe.id_usuario = p.id_usuario AND pe.id_edificio = ?
      )`);
      params.push(req.query.id_edificio);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM profesor p JOIN usuario u ON p.id_usuario = u.id_usuario ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT p.*, u.nombre, u.apellidos, u.correo, u.avatar_url, u.activo
       FROM profesor p
       JOIN usuario u ON p.id_usuario = u.id_usuario
       ${whereSql}
       ORDER BY u.apellidos, u.nombre
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    for (const prof of rows) {
      const [edificios] = await pool.query(
        `SELECT e.id_edificio, e.nombre
         FROM profesor_edificio pe
         JOIN edificio e ON pe.id_edificio = e.id_edificio
         WHERE pe.id_usuario = ?`,
        [prof.id_usuario]
      );
      prof.edificios = edificios;
    }

    return success(res, respuestaPaginada(rows, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

async function crearProfesor(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id_usuario, departamento, edificios } = req.body;

    await conn.query(
      'INSERT INTO profesor (id_usuario, departamento) VALUES (?, ?)',
      [id_usuario, departamento || null]
    );

    if (edificios && edificios.length > 0) {
      const valores = edificios.map(idEd => [id_usuario, idEd]);
      await conn.query(
        'INSERT INTO profesor_edificio (id_usuario, id_edificio) VALUES ?',
        [valores]
      );
    }

    await conn.commit();
    res.registroId = id_usuario;
    return success(res, { id: id_usuario }, 201);
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, 'El usuario ya es profesor', 409);
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return error(res, 'El usuario o edificio no existe', 400);
    }
    next(err);
  } finally {
    conn.release();
  }
}

async function actualizarProfesor(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { departamento, edificios } = req.body;

    if (departamento !== undefined) {
      const [result] = await conn.query(
        'UPDATE profesor SET departamento = ? WHERE id_usuario = ?',
        [departamento, req.params.id]
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return error(res, 'Profesor no encontrado', 404);
      }
    }

    if (edificios !== undefined) {
      await conn.query(
        'DELETE FROM profesor_edificio WHERE id_usuario = ?',
        [req.params.id]
      );
      if (edificios.length > 0) {
        const valores = edificios.map(idEd => [parseInt(req.params.id), idEd]);
        await conn.query(
          'INSERT INTO profesor_edificio (id_usuario, id_edificio) VALUES ?',
          [valores]
        );
      }
    }

    await conn.commit();
    return success(res, { mensaje: 'Profesor actualizado correctamente' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

async function eliminarProfesor(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM profesor WHERE id_usuario = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Profesor no encontrado', 404);
    return success(res, { mensaje: 'Profesor eliminado correctamente' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return error(res, 'No se puede eliminar: tiene ausencias, guardias o reservas asociadas', 409);
    }
    next(err);
  }
}

// ─── EQUIPO DIRECTIVO ──────────────────────────────────

async function listarDirectivos(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT ed.*, u.nombre, u.apellidos, u.correo, u.avatar_url, u.activo
       FROM equipo_directivo ed
       JOIN usuario u ON ed.id_usuario = u.id_usuario
       ORDER BY u.apellidos, u.nombre`
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

async function crearDirectivo(req, res, next) {
  try {
    const { id_usuario, cargo } = req.body;
    await pool.query(
      'INSERT INTO equipo_directivo (id_usuario, cargo) VALUES (?, ?)',
      [id_usuario, cargo]
    );
    res.registroId = id_usuario;
    return success(res, { id: id_usuario }, 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, 'El usuario ya es miembro del equipo directivo', 409);
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return error(res, 'El usuario no existe', 400);
    }
    next(err);
  }
}

async function actualizarDirectivo(req, res, next) {
  try {
    const [result] = await pool.query(
      'UPDATE equipo_directivo SET cargo = ? WHERE id_usuario = ?',
      [req.body.cargo, req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Miembro del equipo directivo no encontrado', 404);
    return success(res, { mensaje: 'Equipo directivo actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminarDirectivo(req, res, next) {
  try {
    const [result] = await pool.query(
      'DELETE FROM equipo_directivo WHERE id_usuario = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return error(res, 'Miembro del equipo directivo no encontrado', 404);
    return success(res, { mensaje: 'Miembro del equipo directivo eliminado correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar, obtenerPorId, actualizar, toggleActivo, cambiarRoles,
  listarProfesores, crearProfesor, actualizarProfesor, eliminarProfesor,
  listarDirectivos, crearDirectivo, actualizarDirectivo, eliminarDirectivo
};
