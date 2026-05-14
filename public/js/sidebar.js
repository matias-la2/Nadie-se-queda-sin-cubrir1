// Genera el sidebar dinámicamente para no repetir el HTML en cada página

// Construye e inyecta el sidebar según el rol y la página activa
// paginaActiva: nombre para marcar el enlace activo (ej: "dashboard")
// rutaBase: ruta para llegar a la raíz (ej: "../../" desde pages/profesor/)
function crearSidebar(paginaActiva, rutaBase) {

  var contenedor = document.getElementById("sidebar-container");
  if (!contenedor) return;

  var usuario = obtenerUsuarioActual();
  if (!usuario) return;

  var nombreCompleto = usuario.nombre + " " + usuario.apellidos;
  var esAdmin = usuario.rol.includes("ADMINISTRADOR");

  // Datos de los enlaces comunes (todos los roles)
  var enlacesComunes = [
    { pagina: "dashboard",   icono: "bi-house",           texto: "Dashboard",
      href: esAdmin ? rutaBase + "pages/admin/dashboard.html"   : rutaBase + "pages/profesor/dashboard.html" },
    { pagina: "incidencias", icono: "bi-exclamation-triangle", texto: "Incidencias",
      href: esAdmin ? rutaBase + "pages/admin/incidencias.html" : rutaBase + "pages/profesor/incidencias.html" },
    { pagina: "ausencias",   icono: "bi-calendar-x",      texto: "Ausencias",
      href: esAdmin ? rutaBase + "pages/admin/ausencias.html"   : rutaBase + "pages/profesor/ausencias.html" },
    { pagina: "guardias",    icono: "bi-shield-check",    texto: "Guardias",
      href: esAdmin ? rutaBase + "pages/admin/guardias.html"    : rutaBase + "pages/profesor/guardias.html" },
    { pagina: "reservas",    icono: "bi-calendar-check",  texto: "Reservas",
      // Las reservas solo existen para el profesor
      href: rutaBase + "pages/profesor/reservas.html" }
  ];

  // Datos de los enlaces solo para el administrador
  var enlacesAdmin = [
    { pagina: "profesores", icono: "bi-people",    texto: "Profesores",       href: rutaBase + "pages/admin/profesores.html" },
    { pagina: "aulas",      icono: "bi-door-open", texto: "Aulas y Espacios", href: rutaBase + "pages/admin/aulas.html" }
  ];

  // Genera el HTML de los enlaces comunes
  var htmlEnlacesComunes = "";
  for (var i = 0; i < enlacesComunes.length; i++) {
    var e = enlacesComunes[i];
    var claseActivo = (e.pagina === paginaActiva) ? " activo" : "";
    htmlEnlacesComunes += '<a href="' + e.href + '" class="sidebar-enlace' + claseActivo + '">' +
                            '<i class="bi ' + e.icono + '"></i>' +
                            '<span>' + e.texto + '</span>' +
                          '</a>';
  }

  // Genera la sección de admin (solo si es administrador)
  var htmlSeccionAdmin = "";
  if (esAdmin) {
    var htmlEnlacesAdmin = "";
    for (var i = 0; i < enlacesAdmin.length; i++) {
      var e = enlacesAdmin[i];
      var claseActivo = (e.pagina === paginaActiva) ? " activo" : "";
      htmlEnlacesAdmin += '<a href="' + e.href + '" class="sidebar-enlace' + claseActivo + '">' +
                            '<i class="bi ' + e.icono + '"></i>' +
                            '<span>' + e.texto + '</span>' +
                          '</a>';
    }
    htmlSeccionAdmin = '<div class="sidebar-seccion-titulo">Administración</div>' + htmlEnlacesAdmin;
  }

  // Formatea el primer rol del usuario para mostrarlo legible
  var rolTexto = usuario.rol[0].replace("_", " ").toLowerCase();
  rolTexto = rolTexto.charAt(0).toUpperCase() + rolTexto.slice(1);

  var rutaLogin = rutaBase + "index.html";

  // Construye el HTML completo del sidebar
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
          '<img src="' + usuario.avatar + '" alt="Avatar de ' + nombreCompleto + '">' +
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
}


// Cierra sesión y redirige al login desde cualquier subdirectorio
function cerrarSesionDesde(rutaLogin) {
  localStorage.removeItem("usuarioActual");
  window.location.href = rutaLogin;
}


// Abre o cierra el sidebar en móvil con las clases CSS
function toggleSidebar() {
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("sidebar-overlay");
  if (!sidebar || !overlay) return;
  // classList.toggle añade la clase si no la tiene, la quita si ya la tiene
  sidebar.classList.toggle("abierto");
  overlay.classList.toggle("visible");
}
