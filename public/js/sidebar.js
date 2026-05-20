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

    var avatarSrc = usuario.avatar_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent(nombreCompleto) + "&background=4f46e5&color=fff&size=80";
    var rutaLogin = rutaBase + "index.html";

    var htmlSidebar =
      '<button class="btn-hamburguesa" id="btn-hamburguesa" onclick="toggleSidebar()">' +
        '<i class="bi bi-list"></i>' +
      '</button>' +
      '<div class="sidebar-overlay" id="sidebar-overlay" onclick="toggleSidebar()"></div>' +
      '<nav class="sidebar" id="sidebar">' +
        '<div class="sidebar-header">' +
          '<i class="bi bi-mortarboard-fill icono-logo"></i>' +
          '<div class="nombre-centro">IES Río Arba</div>' +
        '</div>' +
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
          '<button class="btn-cerrar-sesion" onclick="cerrarSesionDesde(\'' + rutaLogin + '\')">' +
            '<i class="bi bi-box-arrow-left"></i>' +
            'Cerrar Sesión' +
          '</button>' +
        '</div>' +
      '</nav>';

    contenedor.innerHTML = htmlSidebar;
  });
}

function obtenerRolPrincipal(roles) {
  var prioridad = ["ADMINISTRADOR", "EQUIPO_DIRECTIVO", "CONSERJE", "PROFESOR"];
  var etiquetas = {
    "ADMINISTRADOR": "Administrador",
    "EQUIPO_DIRECTIVO": "Equipo directivo",
    "CONSERJE": "Conserje",
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
