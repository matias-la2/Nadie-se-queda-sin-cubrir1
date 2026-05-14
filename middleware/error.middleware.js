function manejadorErrores(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      ok: false,
      mensaje: 'Error de validación',
      errores: err.errors.map(e => ({
        campo: e.path.join('.'),
        mensaje: e.message
      }))
    });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    ok: false,
    mensaje: err.message || 'Error interno del servidor'
  });
}

module.exports = { manejadorErrores };
