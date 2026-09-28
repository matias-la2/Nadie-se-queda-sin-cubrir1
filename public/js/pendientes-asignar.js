'use strict';

(function () {
  var _containerId;
  var _onRecargar;
  var _pendientes = [];
  var _plazas = [];
  var _accion = null;
  var _hashUsuario = null;
  var _timerBusqueda;

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function escJs(str) {
    var s = (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.initPendientesAsignar = function (containerId, opciones) {
    _containerId = containerId;
    _onRecargar = (opciones && opciones.onRecargar) || function () {};
    inyectarModales();
    cargarTodo();
    manejarHash();
    window.addEventListener('hashchange', manejarHash);
  };

  window.PA = {};

  function inyectarModales() {
    var wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<div class="modal fade" id="pa-modal-usuario" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content modal-contenido">' +
            '<div class="modal-header modal-cabecera">' +
              '<h5 class="modal-title modal-titulo" id="pa-modal-titulo">' +
                '<i class="bi bi-person-plus me-2 modal-icono-titulo"></i>Seleccionar usuario' +
              '</h5>' +
              '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>' +
            '</div>' +
            '<div class="modal-body modal-cuerpo">' +
              '<div id="pa-modal-error" class="modal-error"></div>' +
              '<p id="pa-modal-info" style="font-size:14px;color:#64748b;margin-bottom:12px;"></p>' +
              '<div id="pa-paso-busqueda">' +
                '<input type="text" class="form-control" id="pa-input-busqueda" placeholder="Buscar usuario por nombre..." autocomplete="off">' +
                '<div id="pa-resultados" style="max-height:200px;overflow-y:auto;margin-top:8px;border:1px solid #e2e8f0;border-radius:8px;"></div>' +
              '</div>' +
              '<div id="pa-paso-confirmar" hidden style="padding:8px 0;">' +
                '<p id="pa-confirmar-texto" style="font-size:14px;"></p>' +
              '</div>' +
              '<div id="pa-modal-exito" hidden style="padding:12px 0;font-size:14px;color:#15803d;"></div>' +
            '</div>' +
            '<div class="modal-footer modal-pie">' +
              '<button type="button" class="btn-secundario" data-bs-dismiss="modal">Cancelar</button>' +
              '<button type="button" class="btn-primario" id="pa-btn-confirmar" hidden onclick="PA.confirmarAccion()">' +
                '<i class="bi bi-check-lg"></i> Confirmar' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="modal fade" id="pa-modal-eliminar" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered modal-sm">' +
          '<div class="modal-content modal-contenido">' +
            '<div class="modal-header modal-cabecera">' +
              '<h5 class="modal-title modal-titulo"><i class="bi bi-trash me-2" style="color:#ef4444;"></i>Eliminar pendiente</h5>' +
              '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>' +
            '</div>' +
            '<div class="modal-body modal-cuerpo">' +
              '<div id="pa-eliminar-error" class="modal-error"></div>' +
              '<p id="pa-eliminar-texto"></p>' +
            '</div>' +
            '<div class="modal-footer modal-pie">' +
              '<button type="button" class="btn-secundario" data-bs-dismiss="modal">Cancelar</button>' +
              '<button type="button" class="btn-primario" style="background:#ef4444;border-color:#ef4444;" onclick="PA.confirmarEliminar()">' +
                '<i class="bi bi-trash"></i> Eliminar' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="modal fade" id="pa-modal-desvincular" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered modal-sm">' +
          '<div class="modal-content modal-contenido">' +
            '<div class="modal-header modal-cabecera">' +
              '<h5 class="modal-title modal-titulo"><i class="bi bi-person-dash me-2" style="color:#ef4444;"></i>Desvincular plaza</h5>' +
              '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>' +
            '</div>' +
            '<div class="modal-body modal-cuerpo">' +
              '<div id="pa-desvincular-error" class="modal-error"></div>' +
              '<p id="pa-desvincular-texto"></p>' +
            '</div>' +
            '<div class="modal-footer modal-pie">' +
              '<button type="button" class="btn-secundario" data-bs-dismiss="modal">Cancelar</button>' +
              '<button type="button" class="btn-primario" style="background:#ef4444;border-color:#ef4444;" onclick="PA.confirmarDesvincular()">' +
                '<i class="bi bi-person-dash"></i> Desvincular' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrapper);

    document.getElementById('pa-input-busqueda').addEventListener('input', function () {
      clearTimeout(_timerBusqueda);
      _timerBusqueda = setTimeout(buscarUsuarios, 300);
    });
  }

  function cargarTodo() {
    var loaded = 0;
    function check() { if (++loaded === 2) renderSeccion(); }

    apiFetch('/api/v1/usuarios/pendientes-login').then(function (data) {
      _pendientes = (data && data.ok) ? data.datos : [];
      check();
    }).catch(function () { _pendientes = []; check(); });

    apiFetch('/api/v1/usuarios/plazas-pendientes').then(function (data) {
      _plazas = (data && data.ok) ? data.datos : [];
      check();
    }).catch(function () { _plazas = []; check(); });
  }

  function renderSeccion() {
    var container = document.getElementById(_containerId);
    if (!container) return;

    if (_pendientes.length === 0 && _plazas.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = '';

    var html = '<div class="d-flex justify-content-between align-items-center mb-3">' +
      '<h2 class="tarjeta-titulo mb-0"><i class="bi bi-person-plus me-2" style="color:#1152d4;"></i>Pendientes de asignar</h2>' +
    '</div>';

    if (_hashUsuario) {
      html += '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:14px;">' +
        '<i class="bi bi-info-circle me-2" style="color:#1152d4;"></i>' +
        '<strong>' + esc(_hashUsuario.nombre) + '</strong> se ha registrado sin guardias. ' +
        'Selecciona un nombre o plaza para asignarle.' +
      '</div>';
    }

    if (_pendientes.length > 0) {
      html += '<div class="mb-4">' +
        '<div class="d-flex justify-content-between align-items-center mb-2">' +
          '<h3 style="font-size:15px;font-weight:600;margin:0;"><i class="bi bi-person-exclamation me-1" style="color:#b45309;"></i> Nombres sin vincular</h3>' +
          '<span class="badge-estado badge-pendiente" style="font-size:12px;">' + _pendientes.length + '</span>' +
        '</div>' +
        '<div class="tabla-responsive"><table class="tabla-datos"><thead><tr>' +
          '<th>Nombre en el Excel</th><th>Guardias</th><th>Acciones</th>' +
        '</tr></thead><tbody>';

      for (var i = 0; i < _pendientes.length; i++) {
        var p = _pendientes[i];
        html += '<tr><td>' + esc(p.nombre_original) + '</td>' +
          '<td class="celda-sm">' + p.guardias + '</td>' +
          '<td><div class="d-flex gap-1">' +
            '<button class="btn-accion" title="Asignar a un usuario" onclick="PA.abrirAsignarPendiente(' + p.id + ',\'' + escJs(p.nombre_original) + '\',' + p.guardias + ')"><i class="bi bi-person-plus"></i></button>' +
            '<button class="btn-accion peligro" title="Eliminar" onclick="PA.abrirEliminar(' + p.id + ',\'' + escJs(p.nombre_original) + '\',' + p.guardias + ')"><i class="bi bi-trash"></i></button>' +
          '</div></td></tr>';
      }
      html += '</tbody></table></div></div>';
    }

    if (_plazas.length > 0) {
      html += '<div>' +
        '<div class="d-flex justify-content-between align-items-center mb-2">' +
          '<h3 style="font-size:15px;font-weight:600;margin:0;"><i class="bi bi-building me-1" style="color:#1152d4;"></i> Plazas vacantes</h3>' +
          '<span class="badge-estado badge-en-proceso" style="font-size:12px;">' + _plazas.length + '</span>' +
        '</div>' +
        '<div class="tabla-responsive"><table class="tabla-datos"><thead><tr>' +
          '<th>Código</th><th>Guardias</th><th>Estado</th><th>Acciones</th>' +
        '</tr></thead><tbody>';

      for (var j = 0; j < _plazas.length; j++) {
        var pl = _plazas[j];
        var estadoHtml, accionHtml;

        if (pl.id_usuario) {
          var nomPl = ((pl.usuario_nombre || '') + ' ' + (pl.usuario_apellidos || '')).trim();
          estadoHtml = '<span class="badge-estado badge-cubierta">Asignada a ' + esc(nomPl) + '</span>';
          accionHtml =
            '<button class="btn-accion" title="Reasignar" onclick="PA.abrirReasignar(' + pl.id + ',\'' + escJs(pl.codigo) + '\',' + pl.guardias + ')"><i class="bi bi-arrow-repeat"></i></button>' +
            '<button class="btn-accion peligro" title="Desvincular" onclick="PA.abrirDesvincular(\'' + escJs(pl.codigo) + '\',\'' + escJs(nomPl) + '\',' + pl.guardias + ')"><i class="bi bi-person-dash"></i></button>';
        } else {
          estadoHtml = '<span class="badge-estado badge-pendiente">Libre</span>';
          accionHtml = '<button class="btn-accion" title="Asignar" onclick="PA.abrirReasignar(' + pl.id + ',\'' + escJs(pl.codigo) + '\',' + pl.guardias + ')"><i class="bi bi-person-plus"></i></button>';
        }

        html += '<tr>' +
          '<td><span class="badge-estado badge-en-proceso" style="font-weight:600;">' + esc(pl.codigo) + '</span></td>' +
          '<td class="celda-sm">' + pl.guardias + '</td>' +
          '<td>' + estadoHtml + '</td>' +
          '<td><div class="d-flex gap-1">' + accionHtml + '</div></td></tr>';
      }
      html += '</tbody></table></div></div>';
    }

    container.innerHTML = html;
  }

  function abrirModalUsuario(titulo, info, tipo, datos) {
    _accion = { tipo: tipo, datos: datos, idUsuario: null, nombreUsuario: null };

    document.getElementById('pa-modal-titulo').innerHTML =
      '<i class="bi bi-person-plus me-2 modal-icono-titulo"></i>' + esc(titulo);
    document.getElementById('pa-modal-info').textContent = info;
    document.getElementById('pa-modal-error').style.display = 'none';
    document.getElementById('pa-paso-busqueda').hidden = false;
    document.getElementById('pa-paso-confirmar').hidden = true;
    document.getElementById('pa-modal-exito').hidden = true;
    document.getElementById('pa-btn-confirmar').hidden = true;
    document.getElementById('pa-input-busqueda').value = '';
    document.getElementById('pa-resultados').innerHTML =
      '<div style="padding:8px 12px;color:#94a3b8;font-size:13px;">Escribe al menos 2 caracteres...</div>';

    if (_hashUsuario) {
      PA.seleccionarUsuario(_hashUsuario.id, _hashUsuario.nombre);
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById('pa-modal-usuario')).show();
    if (!_hashUsuario) {
      setTimeout(function () { document.getElementById('pa-input-busqueda').focus(); }, 300);
    }
  }

  function buscarUsuarios() {
    var q = document.getElementById('pa-input-busqueda').value.trim();
    var resultadosDiv = document.getElementById('pa-resultados');

    if (q.length < 2) {
      resultadosDiv.innerHTML = '<div style="padding:8px 12px;color:#94a3b8;font-size:13px;">Escribe al menos 2 caracteres...</div>';
      return;
    }

    apiFetch('/api/v1/usuarios?busqueda=' + encodeURIComponent(q) + '&activo=true&limit=10').then(function (data) {
      var usuarios = (data && data.datos && data.datos.registros) ? data.datos.registros : [];

      if (usuarios.length === 0) {
        resultadosDiv.innerHTML = '<div style="padding:8px 12px;color:#94a3b8;font-size:13px;">No se encontraron usuarios</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < usuarios.length; i++) {
        var u = usuarios[i];
        var nombre = ((u.nombre || '') + ' ' + (u.apellidos || '')).trim();
        html += '<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;" ' +
          'onclick="PA.seleccionarUsuario(' + u.id_usuario + ',\'' + escJs(nombre) + '\')" ' +
          'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
          '<i class="bi bi-person" style="color:#64748b;"></i>' +
          '<div><div style="font-weight:500;font-size:14px;">' + esc(nombre) + '</div>' +
          '<div style="font-size:12px;color:#94a3b8;">' + esc(u.correo || '') + '</div></div></div>';
      }
      resultadosDiv.innerHTML = html;
    });
  }

  PA.seleccionarUsuario = function (idUsuario, nombre) {
    _accion.idUsuario = idUsuario;
    _accion.nombreUsuario = nombre;

    document.getElementById('pa-paso-busqueda').hidden = true;
    document.getElementById('pa-paso-confirmar').hidden = false;
    document.getElementById('pa-btn-confirmar').hidden = false;

    var texto;
    if (_accion.tipo === 'asignar-pendiente') {
      texto = '¿Asignar las ' + _accion.datos.guardias + ' guardias de “' + _accion.datos.nombre + '” a ' + nombre + '?';
    } else {
      texto = '¿Asignar la plaza ' + _accion.datos.codigo + ' (' + _accion.datos.guardias + ' guardias) a ' + nombre + '?';
    }
    document.getElementById('pa-confirmar-texto').textContent = texto;
  };

  PA.confirmarAccion = function () {
    var errorDiv = document.getElementById('pa-modal-error');
    errorDiv.style.display = 'none';

    var url, body;
    if (_accion.tipo === 'asignar-pendiente') {
      url = '/api/v1/usuarios/' + _accion.idUsuario + '/asignar-pendiente';
      body = { id_pendiente: _accion.datos.id };
    } else {
      url = '/api/v1/usuarios/' + _accion.idUsuario + '/reasignar-plaza';
      body = { id_plaza: _accion.datos.plazaId };
    }

    apiFetch(url, { method: 'POST', body: JSON.stringify(body) }).then(function (data) {
      if (data && data.ok) {
        document.getElementById('pa-paso-confirmar').hidden = true;
        document.getElementById('pa-btn-confirmar').hidden = true;
        var exitoDiv = document.getElementById('pa-modal-exito');
        exitoDiv.hidden = false;
        exitoDiv.innerHTML = '<i class="bi bi-check-circle me-2" style="color:#16a34a;"></i>';

        var msg;
        if (_accion.tipo === 'asignar-pendiente') {
          msg = 'Asignadas ' + data.datos.guardiasTransferidas + ' guardias a ' + _accion.nombreUsuario;
        } else {
          msg = 'Plaza ' + data.datos.codigo + ' asignada a ' + _accion.nombreUsuario + ' (' + data.datos.guardiasTransferidas + ' guardias)';
        }
        exitoDiv.appendChild(document.createTextNode(msg));

        _hashUsuario = null;
        if (window.location.hash.indexOf('#pendientes') === 0) {
          history.replaceState(null, '', window.location.pathname);
        }
        cargarTodo();
        _onRecargar();
      } else {
        errorDiv.textContent = (data && data.mensaje) || 'Error';
        errorDiv.style.display = 'block';
      }
    }).catch(function () {
      errorDiv.textContent = 'Error de conexión';
      errorDiv.style.display = 'block';
    });
  };

  PA.abrirAsignarPendiente = function (id, nombre, guardias) {
    abrirModalUsuario(
      'Asignar “' + nombre + '”',
      'Selecciona el usuario al que asignar las ' + guardias + ' guardias.',
      'asignar-pendiente',
      { id: id, nombre: nombre, guardias: guardias }
    );
  };

  PA.abrirReasignar = function (plazaId, codigo, guardias) {
    abrirModalUsuario(
      'Asignar plaza ' + codigo,
      'Selecciona el usuario al que asignar esta plaza (' + guardias + ' guardias).',
      'reasignar',
      { plazaId: plazaId, codigo: codigo, guardias: guardias }
    );
  };

  PA.abrirEliminar = function (id, nombre, guardias) {
    _accion = { tipo: 'eliminar', datos: { id: id } };
    document.getElementById('pa-eliminar-error').style.display = 'none';
    document.getElementById('pa-eliminar-texto').textContent =
      '¿Eliminar “' + nombre + '” y sus ' + guardias + ' guardias? Esta acción no se puede deshacer.';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('pa-modal-eliminar')).show();
  };

  PA.confirmarEliminar = function () {
    var errorDiv = document.getElementById('pa-eliminar-error');
    errorDiv.style.display = 'none';

    apiFetch('/api/v1/usuarios/pendientes-login/' + _accion.datos.id, { method: 'DELETE' }).then(function (data) {
      if (data && data.ok) {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('pa-modal-eliminar')).hide();
        cargarTodo();
        _onRecargar();
      } else {
        errorDiv.textContent = (data && data.mensaje) || 'Error';
        errorDiv.style.display = 'block';
      }
    }).catch(function () {
      errorDiv.textContent = 'Error de conexión';
      errorDiv.style.display = 'block';
    });
  };

  PA.abrirDesvincular = function (codigo, nombre, guardias) {
    _accion = { tipo: 'desvincular', datos: { codigo: codigo } };
    document.getElementById('pa-desvincular-error').style.display = 'none';
    document.getElementById('pa-desvincular-texto').textContent =
      '¿Desvincular la plaza ' + codigo + ' de ' + nombre + '? Se revertirán ' + guardias + ' guardias a la plaza.';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('pa-modal-desvincular')).show();
  };

  PA.confirmarDesvincular = function () {
    var errorDiv = document.getElementById('pa-desvincular-error');
    errorDiv.style.display = 'none';

    apiFetch('/api/v1/usuarios/plazas/' + encodeURIComponent(_accion.datos.codigo) + '/desvincular', {
      method: 'DELETE'
    }).then(function (data) {
      if (data && data.ok) {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('pa-modal-desvincular')).hide();
        cargarTodo();
        _onRecargar();
      } else {
        errorDiv.textContent = (data && data.mensaje) || 'Error';
        errorDiv.style.display = 'block';
      }
    }).catch(function () {
      errorDiv.textContent = 'Error de conexión';
      errorDiv.style.display = 'block';
    });
  };

  function manejarHash() {
    var hash = window.location.hash;
    if (hash.indexOf('#pendientes') !== 0) return;

    var match = hash.match(/usuario=(\d+)/);
    if (match) {
      var userId = parseInt(match[1]);
      apiFetch('/api/v1/usuarios/' + userId).then(function (data) {
        if (data && data.ok && data.datos) {
          var u = data.datos;
          _hashUsuario = { id: u.id_usuario, nombre: ((u.nombre || '') + ' ' + (u.apellidos || '')).trim() };
          renderSeccion();
          scrollToSection();
        }
      });
    } else {
      scrollToSection();
    }
  }

  function scrollToSection() {
    setTimeout(function () {
      var container = document.getElementById(_containerId);
      if (container) container.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  }
})();
