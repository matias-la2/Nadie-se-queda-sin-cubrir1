// Login simulado y control de sesión con localStorage

// Busca el usuario por correo y lo autentica
function iniciarSesion(correo, password) {

  // .find() recorre USUARIOS y devuelve el primero que tenga ese correo
  var usuario = USUARIOS.find(function(u) {
    return u.correo === correo;
  });

  if (!usuario) {
    mostrarError("No existe ninguna cuenta con ese correo.");
    return;
  }

  if (password !== "1234") {
    mostrarError("Contraseña incorrecta. Usa: 1234");
    return;
  }

  // Login correcto: guardamos el usuario en localStorage como texto JSON
  localStorage.setItem("usuarioActual", JSON.stringify(usuario));

  // Redirigimos según el rol
  if (usuario.rol.includes("ADMINISTRADOR")) {
    window.location.href = "pages/admin/dashboard.html";
  } else {
    window.location.href = "pages/profesor/dashboard.html";
  }
}


// Borra la sesión y vuelve al login
function cerrarSesion() {
  localStorage.removeItem("usuarioActual");
  window.location.href = "/index.html";
}


// Devuelve el objeto del usuario logueado o null si no hay sesión
function obtenerUsuarioActual() {
  var datos = localStorage.getItem("usuarioActual");
  if (!datos) {
    return null;
  }
  // JSON.parse convierte el texto guardado de vuelta a objeto
  return JSON.parse(datos);
}


// Redirige al login si no hay sesión activa
function verificarSesion() {
  var usuario = obtenerUsuarioActual();
  if (!usuario) {
    window.location.href = "../../index.html";
  }
}


// Comprueba si el usuario actual tiene un rol concreto
function tieneRol(rolBuscado) {
  var usuario = obtenerUsuarioActual();
  if (!usuario) {
    return false;
  }
  return usuario.rol.includes(rolBuscado);
}


// Muestra el error en el formulario o en un alert si no hay div de error
function mostrarError(mensaje) {
  var elementoError = document.getElementById("error-login");
  if (elementoError) {
    elementoError.textContent = mensaje;
    elementoError.style.display = "block";
  } else {
    alert(mensaje);
  }
}
