const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { success, error } = require('../helpers/response.helper');

function generarToken(usuario) {
  return jwt.sign(
    {
      id:        usuario.id,
      nombre:    usuario.nombre,
      apellidos: usuario.apellidos,
      correo:    usuario.correo,
      roles:     usuario.roles
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function googleCallback(req, res) {
  const token = generarToken(req.user);

  res.cookie('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   7 * 24 * 60 * 60 * 1000
  });

  const roles = req.user.roles || [];
  let destino;
  if (roles.includes('ADMINISTRADOR') || roles.includes('EQUIPO_DIRECTIVO')) {
    destino = '/pages/admin/dashboard.html';
  } else if (roles.includes('CONSERJE')) {
    destino = '/pages/conserje/dashboard.html';
  } else {
    destino = '/pages/profesor/dashboard.html';
  }
  res.redirect(destino);
}

async function obtenerUsuarioActual(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellidos, u.correo, u.avatar_url, u.activo
       FROM usuario u
       WHERE u.id_usuario = ?`,
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return error(res, 'Usuario no encontrado', 404);
    }

    const usuario = rows[0];

    const [roles] = await pool.query(
      `SELECT r.nombre_rol
       FROM usuario_rol ur
       JOIN rol r ON r.id_rol = ur.id_rol
       WHERE ur.id_usuario = ?`,
      [usuario.id_usuario]
    );

    return success(res, {
      id:         usuario.id_usuario,
      nombre:     usuario.nombre,
      apellidos:  usuario.apellidos,
      correo:     usuario.correo,
      avatar_url: usuario.avatar_url,
      activo:     usuario.activo,
      roles:      roles.map(r => r.nombre_rol)
    });
  } catch (err) {
    console.error('[Auth] Error obtenerUsuarioActual:', err);
    return error(res, 'Error al obtener usuario', 500);
  }
}

function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/'
  });
  return success(res, { mensaje: 'Sesión cerrada' });
}

module.exports = { googleCallback, obtenerUsuarioActual, logout };
