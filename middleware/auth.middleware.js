const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ ok: false, mensaje: 'No autenticado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = {
      id: payload.id,
      nombre: payload.nombre,
      apellidos: payload.apellidos,
      correo: payload.correo,
      roles: payload.roles
    };
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado' });
  }
}

module.exports = { verificarToken };
