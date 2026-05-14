const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const {
  validar,
  actualizarUsuarioSchema, cambiarRolesSchema,
  crearProfesorSchema, actualizarProfesorSchema,
  crearDirectivoSchema, actualizarDirectivoSchema
} = require('../validators/usuarios.validator');
const controller = require('../controllers/usuarios.controller');

const router = Router();
router.use(verificarToken);
router.use(requiereRol('ADMINISTRADOR'));

// ─── Profesores (antes de /:id) ────────────────────────
router.get('/profesores', controller.listarProfesores);
router.post('/profesores',
  validar(crearProfesorSchema),
  registrarAccion('CREAR_PROFESOR', 'profesor'),
  controller.crearProfesor
);
router.put('/profesores/:id',
  validar(actualizarProfesorSchema),
  registrarAccion('ACTUALIZAR_PROFESOR', 'profesor'),
  controller.actualizarProfesor
);
router.delete('/profesores/:id',
  registrarAccion('ELIMINAR_PROFESOR', 'profesor'),
  controller.eliminarProfesor
);

// ─── Equipo Directivo ──────────────────────────────────
router.get('/directivos', controller.listarDirectivos);
router.post('/directivos',
  validar(crearDirectivoSchema),
  registrarAccion('CREAR_DIRECTIVO', 'equipo_directivo'),
  controller.crearDirectivo
);
router.put('/directivos/:id',
  validar(actualizarDirectivoSchema),
  registrarAccion('ACTUALIZAR_DIRECTIVO', 'equipo_directivo'),
  controller.actualizarDirectivo
);
router.delete('/directivos/:id',
  registrarAccion('ELIMINAR_DIRECTIVO', 'equipo_directivo'),
  controller.eliminarDirectivo
);

// ─── Usuarios ──────────────────────────────────────────
router.get('/', controller.listar);
router.get('/:id', controller.obtenerPorId);
router.put('/:id',
  validar(actualizarUsuarioSchema),
  registrarAccion('ACTUALIZAR_USUARIO', 'usuario'),
  controller.actualizar
);
router.patch('/:id/toggle-activo',
  registrarAccion('TOGGLE_ACTIVO_USUARIO', 'usuario'),
  controller.toggleActivo
);
router.put('/:id/roles',
  validar(cambiarRolesSchema),
  registrarAccion('CAMBIAR_ROLES', 'usuario_rol'),
  controller.cambiarRoles
);

module.exports = router;
