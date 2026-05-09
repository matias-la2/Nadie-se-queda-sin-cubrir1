// Datos de prueba que simulan lo que vendría de la base de datos

// Usuarios del sistema
var USUARIOS = [
  {
    id: 1,
    nombre: "Elena",
    apellidos: "García Martínez",
    correo: "elena@iesrioarba.es",
    password: "1234",
    rol: ["PROFESOR"],
    departamento: "Matemáticas",
    activo: true,
    avatar: "https://ui-avatars.com/api/?name=Elena+Garcia&background=dbeafe&color=1152d4&bold=true"
  },
  {
    id: 2,
    nombre: "Carlos",
    apellidos: "López Fernández",
    correo: "carlos@iesrioarba.es",
    password: "1234",
    rol: ["PROFESOR"],
    departamento: "Lengua Castellana",
    activo: true,
    avatar: "https://ui-avatars.com/api/?name=Carlos+Lopez&background=dcfce7&color=16a34a&bold=true"
  },
  {
    id: 3,
    nombre: "María",
    apellidos: "Sánchez Ruiz",
    correo: "maria@iesrioarba.es",
    password: "1234",
    rol: ["EQUIPO_DIRECTIVO"],
    departamento: "Dirección",
    activo: true,
    avatar: "https://ui-avatars.com/api/?name=Maria+Sanchez&background=fef9c3&color=b45309&bold=true"
  },
  {
    id: 4,
    nombre: "Admin",
    apellidos: "Sistema IES",
    correo: "admin@iesrioarba.es",
    password: "1234",
    rol: ["ADMINISTRADOR"],
    departamento: "Administración",
    activo: true,
    avatar: "https://ui-avatars.com/api/?name=Admin+Sistema&background=f1f5f9&color=475569&bold=true"
  },
  {
    id: 5,
    nombre: "Jefe",
    apellidos: "Estudios Arba",
    correo: "jefe@iesrioarba.es",
    password: "1234",
    rol: ["PROFESOR", "EQUIPO_DIRECTIVO"], // Tiene dos roles a la vez
    departamento: "Ciencias Naturales",
    activo: true,
    avatar: "https://ui-avatars.com/api/?name=Jefe+Estudios&background=fce7f3&color=9d174d&bold=true"
  }
];


// Edificios del instituto
var EDIFICIOS = [
  { id: 1, nombre: "Edificio Principal" },
  { id: 2, nombre: "Edificio Anexo" }
];


// Aulas y espacios reservables del centro
var ESPACIOS = [
  { id: 1, nombre: "Aula 1A",                 estado: "DISPONIBLE",    capacidad: 30,  id_edificio: 1 },
  { id: 2, nombre: "Aula 1B",                 estado: "DISPONIBLE",    capacidad: 28,  id_edificio: 1 },
  { id: 3, nombre: "Sala de Informática",     estado: "DISPONIBLE",    capacidad: 25,  id_edificio: 1 },
  { id: 4, nombre: "Laboratorio de Ciencias", estado: "MANTENIMIENTO", capacidad: 20,  id_edificio: 2 },
  { id: 5, nombre: "Salón de Actos",          estado: "DISPONIBLE",    capacidad: 150, id_edificio: 2 },
  { id: 6, nombre: "Aula de Música",          estado: "NO_DISPONIBLE", capacidad: 22,  id_edificio: 2 }
];


// Problemas reportados por los profesores
var INCIDENCIAS = [
  {
    id: 1,
    titulo: "Proyector no funciona",
    descripcion: "El proyector del Aula 1A no enciende desde esta mañana. Se ha probado con otro cable y sigue sin funcionar. Necesita revisión técnica urgente.",
    tipo: "EQUIPAMIENTO",
    fecha: "2026-04-28",
    estado: "ABIERTA",
    espacio: "Aula 1A",
    creador: "Elena García Martínez",
    asignado_a: null
  },
  {
    id: 2,
    titulo: "Software desactualizado en informática",
    descripcion: "Los ordenadores de la Sala de Informática tienen el navegador en una versión muy antigua. No se pueden ejecutar algunas prácticas del currículum.",
    tipo: "SOFTWARE",
    fecha: "2026-04-25",
    estado: "EN_PROCESO",
    espacio: "Sala de Informática",
    creador: "Carlos López Fernández",
    asignado_a: "Servicio Técnico"
  },
  {
    id: 3,
    titulo: "Gotera en el techo",
    descripcion: "Hay una gotera en el techo del Laboratorio de Ciencias. Cuando llueve el agua cae cerca de los equipos. Es urgente repararlo antes de que cause daños.",
    tipo: "INFRAESTRUCTURA",
    fecha: "2026-04-20",
    estado: "EN_PROCESO",
    espacio: "Laboratorio de Ciencias",
    creador: "Elena García Martínez",
    asignado_a: "Mantenimiento"
  },
  {
    id: 4,
    titulo: "Silla rota en Aula 1B",
    descripcion: "Una de las sillas del aula tiene una pata partida. Es un riesgo para los alumnos. Se ha apartado pero necesita ser reemplazada.",
    tipo: "EQUIPAMIENTO",
    fecha: "2026-04-15",
    estado: "RESUELTA",
    espacio: "Aula 1B",
    creador: "Carlos López Fernández",
    asignado_a: "Conserjería"
  }
];


// Ausencias del profesorado
var AUSENCIAS = [
  {
    id: 1,
    profesor: "Elena García Martínez",
    departamento: "Matemáticas",
    fecha: "2026-05-02",
    tramo_horario: "09:00-10:00",
    comentario: "Cita médica por la mañana",
    estado: "CUBIERTA",
    hay_tarea: true,
    tarea_descripcion: "Ejercicios del tema 7, páginas 112 y 113. Los alumnos deben hacerlos en silencio y entregarlos al sustituto.",
    creado_por: "Elena García Martínez"
  },
  {
    id: 2,
    profesor: "Carlos López Fernández",
    departamento: "Lengua Castellana",
    fecha: "2026-05-05",
    tramo_horario: "11:00-12:00",
    comentario: "Formación externa obligatoria",
    estado: "PENDIENTE",
    hay_tarea: false,
    tarea_descripcion: null,
    creado_por: "Carlos López Fernández"
  },
  {
    id: 3,
    profesor: "Jefe Estudios Arba",
    departamento: "Ciencias Naturales",
    fecha: "2026-04-30",
    tramo_horario: "08:00-09:00",
    comentario: "Reunión de equipo directivo",
    estado: "CUBIERTA",
    hay_tarea: true,
    tarea_descripcion: "Leer el capítulo 5 del libro y responder las preguntas de comprensión al final del capítulo.",
    creado_por: "Jefe Estudios Arba"
  },
  {
    id: 4,
    profesor: "Elena García Martínez",
    departamento: "Matemáticas",
    fecha: "2026-04-22",
    tramo_horario: "10:00-11:00",
    comentario: "",
    estado: "SIN_CUBRIR",
    hay_tarea: false,
    tarea_descripcion: null,
    creado_por: "Elena García Martínez"
  }
];


// Guardias asignadas para cubrir ausencias
var GUARDIAS_ASIGNADAS = [
  {
    id: 1,
    fecha: "2026-05-02",
    tramo: "09:00-10:00",
    profesor_sustituto: "Carlos López Fernández", // Quien cubre
    profesor_ausente: "Elena García Martínez",    // Quien falta
    clase: "1º ESO A",
    tipo_asignacion: "AUTOMATICA",
    estado: "PENDIENTE"
  },
  {
    id: 2,
    fecha: "2026-04-30",
    tramo: "08:00-09:00",
    profesor_sustituto: "Elena García Martínez",
    profesor_ausente: "Jefe Estudios Arba",
    clase: "2º ESO B",
    tipo_asignacion: "MANUAL",
    estado: "REALIZADA"
  },
  {
    id: 3,
    fecha: "2026-05-06",
    tramo: "12:00-13:00",
    profesor_sustituto: "Carlos López Fernández",
    profesor_ausente: "María Sánchez Ruiz",
    clase: "3º ESO C",
    tipo_asignacion: "AUTOMATICA",
    estado: "PENDIENTE"
  }
];


// Reservas de espacios por los profesores
var RESERVAS = [
  {
    id: 1,
    fecha: "2026-05-03",
    tramo: "10:00-11:00",
    espacio: "Sala de Informática",
    profesor: "Elena García Martínez",
    motivo: "Examen de recuperación con ordenadores"
  },
  {
    id: 2,
    fecha: "2026-05-07",
    tramo: "09:00-10:00",
    espacio: "Salón de Actos",
    profesor: "Carlos López Fernández",
    motivo: "Charla orientación vocacional 4º ESO"
  },
  {
    id: 3,
    fecha: "2026-05-10",
    tramo: "11:00-12:00",
    espacio: "Aula 1A",
    profesor: "Elena García Martínez",
    motivo: "Reunión con familias"
  }
];
