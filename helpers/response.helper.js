function success(res, data = null, status = 200) {
  const respuesta = { ok: true };
  if (data !== null) respuesta.datos = data;
  return res.status(status).json(respuesta);
}

function error(res, mensaje = 'Error interno', status = 500) {
  return res.status(status).json({ ok: false, mensaje });
}

module.exports = { success, error };
