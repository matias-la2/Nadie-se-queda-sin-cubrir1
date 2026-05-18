function crearSidebar(paginaActiva, rutaBase) {

  var contenedor = document.getElementById("sidebar-container");
  if (!contenedor) return;

  obtenerUsuarioActual().then(function (usuario) {
    if (!usuario) return;

    var nombreCompleto = usuario.nombre + " " + usuario.apellidos;
    var esAdmin = usuario.roles.includes("ADMINISTRADOR");
    var esDirectivo = usuario.roles.includes("EQUIPO_DIRECTIVO");
    var esConserje = usuario.roles.includes("CONSERJE") && !esAdmin && !esDirectivo;
    var esAdminODirectivo = esAdmin || esDirectivo;

    var enlacesComunes;

    if (esConserje) {
      enlacesComunes = [
        { pagina: "dashboard",   icono: "bi-house",               texto: "Dashboard",
          href: rutaBase + "pages/profesor/dashboard.html" },
        { pagina: "incidencias", icono: "bi-exclamation-triangle", texto: "Incidencias",
          href: rutaBase + "pages/profesor/incidencias.html" }
      ];
    } else {
      enlacesComunes = [
        { pagina: "dashboard",   icono: "bi-house",           texto: "Dashboard",
          href: esAdminODirectivo ? rutaBase + "pages/admin/dashboard.html"   : rutaBase + "pages/profesor/dashboard.html" },
        { pagina: "incidencias", icono: "bi-exclamation-triangle", texto: "Incidencias",
          href: esAdminODirectivo ? rutaBase + "pages/admin/incidencias.html" : rutaBase + "pages/profesor/incidencias.html" },
        { pagina: "ausencias",   icono: "bi-calendar-x",      texto: "Ausencias",
          href: esAdminODirectivo ? rutaBase + "pages/admin/ausencias.html"   : rutaBase + "pages/profesor/ausencias.html" },
        { pagina: "guardias",    icono: "bi-shield-check",    texto: "Guardias",
          href: esAdminODirectivo ? rutaBase + "pages/admin/guardias.html"    : rutaBase + "pages/profesor/guardias.html" },
        { pagina: "reservas",    icono: "bi-calendar-check",  texto: "Reservas",
          href: rutaBase + "pages/profesor/reservas.html" }
      ];
    }

    var enlacesAdmin = [
      { pagina: "profesores", icono: "bi-people",    texto: "Profesores",       href: rutaBase + "pages/admin/profesores.html" },
      { pagina: "aulas",      icono: "bi-door-open", texto: "Aulas y Espacios", href: rutaBase + "pages/admin/aulas.html" }
    ];

    var htmlEnlacesComunes = "";
    for (var i = 0; i < enlacesComunes.length; i++) {
      var e = enlacesComunes[i];
      var claseActivo = (e.pagina === paginaActiva) ? " activo" : "";
      htmlEnlacesComunes += '<a href="' + e.href + '" class="sidebar-enlace' + claseActivo + '">' +
                              '<i class="bi ' + e.icono + '"></i>' +
                              '<span>' + e.texto + '</span>' +
                            '</a>';
    }

    var htmlSeccionAdmin = "";
    if (esAdmin) {
      var htmlEnlacesAdmin = "";
      for (var j = 0; j < enlacesAdmin.length; j++) {
        var ea = enlacesAdmin[j];
        var claseActivoAdmin = (ea.pagina === paginaActiva) ? " activo" : "";
        htmlEnlacesAdmin += '<a href="' + ea.href + '" class="sidebar-enlace' + claseActivoAdmin + '">' +
                              '<i class="bi ' + ea.icono + '"></i>' +
                              '<span>' + ea.texto + '</span>' +
                            '</a>';
      }
      htmlSeccionAdmin = '<div class="sidebar-seccion-titulo">Administración</div>' + htmlEnlacesAdmin;
    }

    var rolTexto = usuario.roles[0].replace("_", " ").toLowerCase();
    rolTexto = rolTexto.charAt(0).toUpperCase() + rolTexto.slice(1);

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
          htmlEnlacesComunes +
          htmlSeccionAdmin +
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


function toggleSidebar() {
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("sidebar-overlay");
  if (!sidebar || !overlay) return;
  sidebar.classList.toggle("abierto");
  overlay.classList.toggle("visible");
}
