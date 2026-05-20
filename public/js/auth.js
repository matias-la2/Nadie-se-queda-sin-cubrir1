var _usuarioCache = null;

function obtenerUsuarioActual() {
  if (_usuarioCache) return Promise.resolve(_usuarioCache);

  return fetch('/api/v1/auth/me', { credentials: 'include' })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.ok && data.datos) {
        _usuarioCache = data.datos;
        return _usuarioCache;
      }
      return null;
    })
    .catch(function () { return null; });
}

function verificarSesion() {
  return obtenerUsuarioActual().then(function (usuario) {
    if (!usuario) {
      window.location.href = '/index.html';
      return null;
    }
    verificarAccesoPagina(usuario);
    return usuario;
  });
}

function verificarAccesoPagina(usuario) {
  var ruta = window.location.pathname;
  var roles = usuario.roles || [];
  var esAdmin = roles.indexOf('ADMINISTRADOR') !== -1;
  var esDirectivo = roles.indexOf('EQUIPO_DIRECTIVO') !== -1;
  var esConserje = roles.indexOf('CONSERJE') !== -1;

  var tieneAcceso = true;

  if (ruta.indexOf('/pages/admin/') !== -1) {
    tieneAcceso = esAdmin || esDirectivo;
  } else if (ruta.indexOf('/pages/conserje/') !== -1) {
    tieneAcceso = esConserje || esAdmin;
  } else if (ruta.indexOf('/pages/profesor/') !== -1) {
    tieneAcceso = !esConserje || esAdmin || esDirectivo || roles.indexOf('PROFESOR') !== -1;
  }

  if (!tieneAcceso) {
    var destino;
    if (esAdmin || esDirectivo) {
      destino = '/pages/admin/dashboard.html';
    } else if (esConserje) {
      destino = '/pages/conserje/dashboard.html';
    } else {
      destino = '/pages/profesor/dashboard.html';
    }
    window.location.href = destino;
  }
}

function tieneRol(rolBuscado) {
  if (!_usuarioCache || !_usuarioCache.roles) return false;
  return _usuarioCache.roles.indexOf(rolBuscado) !== -1;
}

function cerrarSesion() {
  return fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
    .finally(function () {
      _usuarioCache = null;
      window.location.href = '/index.html';
    });
}

function cerrarSesionDesde(rutaLogin) {
  return fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
    .finally(function () {
      _usuarioCache = null;
      window.location.href = rutaLogin;
    });
}

function apiFetch(url, opciones) {
  opciones = opciones || {};
  opciones.credentials = 'include';
  opciones.headers = opciones.headers || {};

  if (opciones.body && !opciones.esFormData) {
    opciones.headers['Content-Type'] = 'application/json';
  }
  delete opciones.esFormData;

  return fetch(url, opciones).then(function (res) {
    if (res.status === 401) {
      _usuarioCache = null;
      window.location.href = '/index.html';
      return;
    }
    return res.json();
  });
}

function mostrarError(mensaje, elementoId) {
  var el = document.getElementById(elementoId || 'mensaje-error');
  if (el) {
    var span = el.querySelector('span');
    if (span) {
      span.textContent = mensaje;
    } else {
      el.textContent = mensaje;
    }
    el.style.display = 'block';
  }
}
