function crearSidebar(paginaActiva, rutaBase) {

  var contenedor = document.getElementById("sidebar-container");
  if (!contenedor) return;

  obtenerUsuarioActual().then(function (usuario) {
    if (!usuario) return;

    var nombreCompleto = usuario.nombre + " " + usuario.apellidos;
    var roles = usuario.roles || [];
    var esAdmin = roles.indexOf("ADMINISTRADOR") !== -1;
    var esDirectivo = roles.indexOf("EQUIPO_DIRECTIVO") !== -1;
    var esConserje = roles.indexOf("CONSERJE") !== -1;

    var enlacesPrincipal = [];
    var enlacesGestion = [];
    var tituloGestion = "";

    if (esAdmin) {
      enlacesPrincipal = [
        { pagina: "dashboard",   icono: "bi-house",                texto: "Dashboard",
          href: rutaBase + "pages/admin/dashboard.html" },
        { pagina: "incidencias", icono: "bi-exclamation-triangle",  texto: "Incidencias",
          href: rutaBase + "pages/admin/incidencias.html" },
        { pagina: "reservas",    icono: "bi-calendar-check",        texto: "Reservas",
          href: rutaBase + "pages/profesor/reservas.html" }
      ];
      tituloGestion = "Administración";
      enlacesGestion = [
        { pagina: "usuarios",    icono: "bi-people-fill",   texto: "Usuarios",
          href: rutaBase + "pages/admin/usuarios.html" },
        { pagina: "guardias",    icono: "bi-shield-check",  texto: "Guardias",
          href: rutaBase + "pages/admin/guardias.html" },
        { pagina: "ausencias",   icono: "bi-calendar-x",    texto: "Ausencias",
          href: rutaBase + "pages/admin/ausencias.html" },
        { pagina: "aulas",       icono: "bi-door-open",     texto: "Aulas y Espacios",
          href: rutaBase + "pages/admin/aulas.html" },
        { pagina: "logs",        icono: "bi-clock-history", texto: "Log de actividad",
          href: rutaBase + "pages/admin/logs.html" }
      ];

    } else if (esDirectivo) {
      enlacesPrincipal = [
        { pagina: "dashboard",   icono: "bi-house",                texto: "Dashboard",
          href: rutaBase + "pages/admin/dashboard.html" },
        { pagina: "incidencias", icono: "bi-exclamation-triangle",  texto: "Incidencias",
          href: rutaBase + "pages/admin/incidencias.html" },
        { pagina: "reservas",    icono: "bi-calendar-check",        texto: "Reservas",
          href: rutaBase + "pages/profesor/reservas.html" }
      ];
      tituloGestion = "Gestión del Centro";
      enlacesGestion = [
        { pagina: "profesores",  icono: "bi-people",        texto: "Profesores",
          href: rutaBase + "pages/admin/profesores.html" },
        { pagina: "guardias",    icono: "bi-shield-check",  texto: "Guardias",
          href: rutaBase + "pages/admin/guardias.html" },
        { pagina: "ausencias",   icono: "bi-calendar-x",    texto: "Ausencias",
          href: rutaBase + "pages/admin/ausencias.html" },
        { pagina: "aulas",       icono: "bi-door-open",     texto: "Aulas y Espacios",
          href: rutaBase + "pages/admin/aulas.html" }
      ];

    } else if (esConserje) {
      enlacesPrincipal = [
        { pagina: "dashboard",   icono: "bi-house",                texto: "Dashboard",
          href: rutaBase + "pages/conserje/dashboard.html" },
        { pagina: "incidencias", icono: "bi-exclamation-triangle",  texto: "Incidencias",
          href: rutaBase + "pages/conserje/incidencias.html" }
      ];

    } else {
      enlacesPrincipal = [
        { pagina: "dashboard",   icono: "bi-house",                texto: "Dashboard",
          href: rutaBase + "pages/profesor/dashboard.html" },
        { pagina: "guardias",    icono: "bi-shield-check",         texto: "Mis Guardias",
          href: rutaBase + "pages/profesor/guardias.html" },
        { pagina: "ausencias",   icono: "bi-calendar-x",           texto: "Mis Ausencias",
          href: rutaBase + "pages/profesor/ausencias.html" },
        { pagina: "incidencias", icono: "bi-exclamation-triangle",  texto: "Incidencias",
          href: rutaBase + "pages/profesor/incidencias.html" },
        { pagina: "reservas",    icono: "bi-calendar-check",        texto: "Reservas",
          href: rutaBase + "pages/profesor/reservas.html" }
      ];
    }

    var htmlEnlacesPrincipal = "";
    for (var i = 0; i < enlacesPrincipal.length; i++) {
      var e = enlacesPrincipal[i];
      var claseActivo = (e.pagina === paginaActiva) ? " activo" : "";
      htmlEnlacesPrincipal += '<a href="' + e.href + '" class="sidebar-enlace' + claseActivo + '">' +
                                '<i class="bi ' + e.icono + '"></i>' +
                                '<span>' + e.texto + '</span>' +
                              '</a>';
    }

    var htmlSeccionGestion = "";
    if (enlacesGestion.length > 0) {
      var htmlEnlacesGestion = "";
      for (var j = 0; j < enlacesGestion.length; j++) {
        var eg = enlacesGestion[j];
        var claseActivoG = (eg.pagina === paginaActiva) ? " activo" : "";
        htmlEnlacesGestion += '<a href="' + eg.href + '" class="sidebar-enlace' + claseActivoG + '">' +
                                '<i class="bi ' + eg.icono + '"></i>' +
                                '<span>' + eg.texto + '</span>' +
                              '</a>';
      }
      htmlSeccionGestion = '<div class="sidebar-seccion-titulo">' + tituloGestion + '</div>' + htmlEnlacesGestion;
    }

    var rolTexto = obtenerRolPrincipal(roles);

    var manualPagina = "manual-profesor.html";
    if (esAdmin) manualPagina = "manual-administrador.html";
    else if (esDirectivo) manualPagina = "manual-directivo.html";
    else if (esConserje) manualPagina = "manual-conserje.html";
    var rutaManual = rutaBase + "pages/compartido/" + manualPagina;
    var claseManualActivo = (paginaActiva === "manual") ? " activo" : "";

    var avatarSrc = usuario.avatar_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent(nombreCompleto) + "&background=4f46e5&color=fff&size=80";
    var rutaLogin = rutaBase + "index.html";

    var htmlCampana =
      '<div class="notif-campana" id="notif-campana">' +
        '<i class="bi bi-bell"></i>' +
        '<span class="notif-contador" id="notif-contador" hidden></span>' +
      '</div>';
    var htmlPanelNotif =
      '<div class="notif-panel" id="notif-panel" hidden>' +
        '<div class="notif-panel-cabecera">' +
          '<span style="font-weight:600;font-size:13px;">Notificaciones</span>' +
          '<a href="#" id="notif-leer-todas" style="font-size:12px;color:#1152d4;text-decoration:none;">Marcar leídas</a>' +
        '</div>' +
        '<div id="notif-lista"></div>' +
      '</div>';

    var htmlSidebar =
      '<button class="btn-hamburguesa" id="btn-hamburguesa" onclick="toggleSidebar()">' +
        '<i class="bi bi-list"></i>' +
      '</button>' +
      '<div class="sidebar-overlay" id="sidebar-overlay" onclick="toggleSidebar()"></div>' +
      '<nav class="sidebar" id="sidebar">' +
        '<div class="sidebar-header">' +
          '<i class="bi bi-mortarboard-fill icono-logo"></i>' +
          '<div class="nombre-centro">IES Río Arba</div>' +
          htmlCampana +
        '</div>' +
        htmlPanelNotif +
        '<div class="sidebar-nav">' +
          '<div class="sidebar-seccion-titulo">Menú Principal</div>' +
          htmlEnlacesPrincipal +
          htmlSeccionGestion +
        '</div>' +
        '<div class="sidebar-footer">' +
          '<div class="sidebar-footer-usuario">' +
            '<img src="' + avatarSrc + '" alt="Avatar de ' + nombreCompleto + '">' +
            '<div class="usuario-info">' +
              '<div class="usuario-nombre">' + nombreCompleto + '</div>' +
              '<div class="rol-usuario">' + rolTexto + '</div>' +
            '</div>' +
          '</div>' +
          '<a href="' + rutaManual + '" class="sidebar-enlace' + claseManualActivo + '" style="margin-bottom:6px;">' +
            '<i class="bi bi-question-circle"></i>' +
            '<span>Manual de usuario</span>' +
          '</a>' +
          '<button class="btn-cerrar-sesion" onclick="cerrarSesionDesde(\'' + rutaLogin + '\')">' +
            '<i class="bi bi-box-arrow-left"></i>' +
            'Cerrar Sesión' +
          '</button>' +
        '</div>' +
      '</nav>';

    contenedor.innerHTML = htmlSidebar;

    inicializarNotificaciones(rutaBase, roles);
  });
}

function obtenerRolPrincipal(roles) {
  var prioridad = ["ADMINISTRADOR", "EQUIPO_DIRECTIVO", "CONSERJE", "PROFESOR"];
  var etiquetas = {
    "ADMINISTRADOR": "Administrador",
    "EQUIPO_DIRECTIVO": "Equipo directivo",
    "CONSERJE": "Mantenimiento",
    "PROFESOR": "Profesor"
  };
  for (var i = 0; i < prioridad.length; i++) {
    if (roles.indexOf(prioridad[i]) !== -1) return etiquetas[prioridad[i]];
  }
  return "Usuario";
}

function toggleSidebar() {
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("sidebar-overlay");
  if (!sidebar || !overlay) return;
  sidebar.classList.toggle("abierto");
  overlay.classList.toggle("visible");
}

// ─── Notificaciones ─────────────────────────────────────

var NOTIF_ICONOS = {
  'PLAZA_SIN_ASIGNAR':    { clase: 'bi-person-plus',          bg: '#eff6ff', color: '#1152d4' },
  'GUARDIA_PENDIENTE':    { clase: 'bi-shield-exclamation',   bg: '#fef9c3', color: '#b45309' },
  'GUARDIA_REASIGNADA':   { clase: 'bi-arrow-repeat',         bg: '#f0fdf4', color: '#16a34a' },
  'GUARDIA_RECHAZADA':    { clase: 'bi-x-circle',             bg: '#fef2f2', color: '#ef4444' },
  'AUSENCIA_ASIGNADA':    { clase: 'bi-calendar-x',           bg: '#fef2f2', color: '#ef4444' },
  'INCIDENCIA_CAMBIO':    { clase: 'bi-exclamation-triangle',  bg: '#fff7ed', color: '#c2410c' },
  'RESERVA_RECORDATORIO': { clase: 'bi-calendar-check',       bg: '#f0fdf4', color: '#16a34a' }
};

function inicializarNotificaciones(rutaBase, roles) {
  var campana = document.getElementById('notif-campana');
  var panel = document.getElementById('notif-panel');
  if (!campana || !panel) return;

  campana.addEventListener('click', function (e) {
    e.stopPropagation();
    if (panel.hidden) {
      panel.hidden = false;
      cargarListaNotificaciones(rutaBase, roles);
    } else {
      panel.hidden = true;
    }
  });

  panel.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  document.addEventListener('click', function () {
    panel.hidden = true;
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') panel.hidden = true;
  });

  var btnLeer = document.getElementById('notif-leer-todas');
  if (btnLeer) {
    btnLeer.addEventListener('click', function (e) {
      e.preventDefault();
      apiFetch('/api/v1/notificaciones/leer-todas', { method: 'PATCH' }).then(function () {
        var badge = document.getElementById('notif-contador');
        if (badge) badge.hidden = true;
        var lista = document.getElementById('notif-lista');
        if (lista) lista.innerHTML = '<div class="notif-vacio"><i class="bi bi-bell-slash" style="display:block;font-size:20px;margin-bottom:6px;"></i>Sin notificaciones nuevas</div>';
      });
    });
  }

  cargarContadorNotificaciones();
  setInterval(cargarContadorNotificaciones, 60000);
}

function cargarContadorNotificaciones() {
  apiFetch('/api/v1/notificaciones?leida=0&limit=1').then(function (data) {
    var total = (data && data.datos && data.datos.paginacion) ? data.datos.paginacion.total : 0;
    var badge = document.getElementById('notif-contador');
    if (badge) {
      if (total > 0) {
        badge.textContent = total > 9 ? '9+' : total;
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    }
  }).catch(function () {});
}

function cargarListaNotificaciones(rutaBase, roles) {
  apiFetch('/api/v1/notificaciones?leida=0').then(function (data) {
    var notifs = (data && data.datos && data.datos.registros) ? data.datos.registros : [];
    var lista = document.getElementById('notif-lista');
    if (!lista) return;

    if (notifs.length === 0) {
      lista.innerHTML = '<div class="notif-vacio"><i class="bi bi-bell-slash" style="display:block;font-size:20px;margin-bottom:6px;"></i>Sin notificaciones nuevas</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < Math.min(notifs.length, 8); i++) {
      var n = notifs[i];
      var icono = NOTIF_ICONOS[n.tipo] || { clase: 'bi-bell', bg: '#f1f5f9', color: '#64748b' };
      var link = obtenerEnlaceNotificacion(n, rutaBase, roles);
      var tiempo = tiempoRelativo(n.created_at);
      var msgEsc = escapeHtmlSidebar(n.mensaje);

      html += '<a href="' + link + '" class="notif-item" data-notif-id="' + n.id_notificacion + '">' +
                '<div class="notif-item-icono" style="background:' + icono.bg + ';color:' + icono.color + ';">' +
                  '<i class="bi ' + icono.clase + '"></i>' +
                '</div>' +
                '<div style="flex:1;min-width:0;">' +
                  '<div class="notif-item-texto">' + msgEsc + '</div>' +
                  '<div class="notif-item-fecha">' + tiempo + '</div>' +
                '</div>' +
              '</a>';
    }
    lista.innerHTML = html;

    var items = lista.querySelectorAll('.notif-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function () {
        var nid = this.getAttribute('data-notif-id');
        apiFetch('/api/v1/notificaciones/' + nid + '/leer', { method: 'PATCH' });
      });
    }
  }).catch(function () {});
}

function obtenerEnlaceNotificacion(notif, rutaBase, roles) {
  var esAdmin = roles.indexOf('ADMINISTRADOR') !== -1;
  var esDirectivo = roles.indexOf('EQUIPO_DIRECTIVO') !== -1;
  var esConserje = roles.indexOf('CONSERJE') !== -1;

  switch (notif.tipo) {
    case 'PLAZA_SIN_ASIGNAR':
      if (!notif.referencia_id) return '#';
      if (esAdmin) return rutaBase + 'pages/admin/usuarios.html#pendientes&usuario=' + notif.referencia_id;
      if (esDirectivo) return rutaBase + 'pages/admin/profesores.html#pendientes&usuario=' + notif.referencia_id;
      return '#';
    case 'GUARDIA_PENDIENTE':
    case 'GUARDIA_REASIGNADA':
      if (esAdmin || esDirectivo) return rutaBase + 'pages/admin/guardias.html';
      return rutaBase + 'pages/profesor/guardias.html';
    case 'GUARDIA_RECHAZADA':
      if (esAdmin || esDirectivo) return rutaBase + 'pages/admin/guardias.html';
      return '#';
    case 'AUSENCIA_ASIGNADA':
      if (esAdmin || esDirectivo) return rutaBase + 'pages/admin/ausencias.html';
      return rutaBase + 'pages/profesor/ausencias.html';
    case 'INCIDENCIA_CAMBIO':
      if (esAdmin || esDirectivo) return rutaBase + 'pages/admin/incidencias.html';
      if (esConserje) return rutaBase + 'pages/conserje/incidencias.html';
      return rutaBase + 'pages/profesor/incidencias.html';
    case 'RESERVA_RECORDATORIO':
      return rutaBase + 'pages/profesor/reservas.html';
    default:
      return '#';
  }
}

function escapeHtmlSidebar(str) {
  var d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function tiempoRelativo(fechaStr) {
  var fecha = new Date(fechaStr);
  var ahora = new Date();
  var diffMs = ahora - fecha;
  var diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return 'hace ' + diffMin + ' min';
  var diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return 'hace ' + diffH + 'h';
  var diffD = Math.floor(diffH / 24);
  if (diffD < 7) return 'hace ' + diffD + 'd';
  return fecha.toLocaleDateString('es-ES');
}
