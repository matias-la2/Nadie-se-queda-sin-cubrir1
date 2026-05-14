function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ ok: false, mensaje: 'No autenticado' });
    }

    const tieneRol = req.usuario.roles.some(rol => rolesPermitidos.includes(rol));

    if (!tieneRol) {
      return res.status(403).json({ ok: false, mensaje: 'No tienes permisos para esta acción' });
    }

    next();
  };
}

module.exports = { requiereRol };
