const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const {
  validar,
  actualizarUsuarioSchema, cambiarRolesSchema,
  crearProfesorSchema, actualizarProfesorSchema,
  crearDirectivoSchema, actualizarDirectivoSchema,
  asignarPlazaSchema
} = require('../validators/usuarios.validator');
const controller = require('../controllers/usuarios.controller');

const router = Router();
router.use(verificarToken);

// ─── Profesores (antes de /:id) ────────────────────────
router.get('/profesores',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  controller.listarProfesores
);
router.post('/profesores',
  requiereRol('ADMINISTRADOR'),
  validar(crearProfesorSchema),
  registrarAccion('CREAR_PROFESOR', 'profesor'),
  controller.crearProfesor
);
router.put('/profesores/:id',
  requiereRol('ADMINISTRADOR'),
  validar(actualizarProfesorSchema),
  registrarAccion('ACTUALIZAR_PROFESOR', 'profesor'),
  controller.actualizarProfesor
);
router.delete('/profesores/:id',
  requiereRol('ADMINISTRADOR'),
  registrarAccion('ELIMINAR_PROFESOR', 'profesor'),
  controller.eliminarProfesor
);

// ─── Equipo Directivo ──────────────────────────────────
router.get('/directivos',
  requiereRol('ADMINISTRADOR'),
  controller.listarDirectivos
);
router.post('/directivos',
  requiereRol('ADMINISTRADOR'),
  validar(crearDirectivoSchema),
  registrarAccion('CREAR_DIRECTIVO', 'equipo_directivo'),
  controller.crearDirectivo
);
router.put('/directivos/:id',
  requiereRol('ADMINISTRADOR'),
  validar(actualizarDirectivoSchema),
  registrarAccion('ACTUALIZAR_DIRECTIVO', 'equipo_directivo'),
  controller.actualizarDirectivo
);
router.delete('/directivos/:id',
  requiereRol('ADMINISTRADOR'),
  registrarAccion('ELIMINAR_DIRECTIVO', 'equipo_directivo'),
  controller.eliminarDirectivo
);

// ─── Plazas pendientes ────────────────────────────────
router.get('/plazas-pendientes',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  controller.listarPlazasPendientes
);
router.delete('/plazas/:codigo/desvincular',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  registrarAccion('DESVINCULAR_PLAZA', 'plaza_pendiente'),
  controller.desvincularPlaza
);

// ─── Log de actividad ─────────────────────────────────
router.get('/logs',
  requiereRol('ADMINISTRADOR'),
  controller.listarLogs
);

// ─── Usuarios ──────────────────────────────────────────
router.get('/',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  controller.listar
);
router.get('/:id',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  controller.obtenerPorId
);
router.put('/:id',
  requiereRol('ADMINISTRADOR'),
  validar(actualizarUsuarioSchema),
  registrarAccion('ACTUALIZAR_USUARIO', 'usuario'),
  controller.actualizar
);
router.patch('/:id/toggle-activo',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  registrarAccion('TOGGLE_ACTIVO_USUARIO', 'usuario'),
  controller.toggleActivo
);
router.put('/:id/roles',
  requiereRol('ADMINISTRADOR'),
  validar(cambiarRolesSchema),
  registrarAccion('CAMBIAR_ROLES', 'usuario_rol'),
  controller.cambiarRoles
);
router.post('/:id/asignar-plaza',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  validar(asignarPlazaSchema),
  registrarAccion('ASIGNAR_PLAZA', 'plaza_pendiente'),
  controller.asignarPlaza
);

module.exports = router;
