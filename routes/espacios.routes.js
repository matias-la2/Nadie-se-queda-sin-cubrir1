const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const {
  validar,
  crearEdificioSchema, actualizarEdificioSchema,
  crearEspacioSchema, actualizarEspacioSchema,
  crearBloqueoSchema
} = require('../validators/espacios.validator');
const controller = require('../controllers/espacios.controller');

const router = Router();
router.use(verificarToken);

// ─── Edificios (antes de /:id para evitar conflicto) ───
router.get('/edificios', controller.listarEdificios);
router.get('/edificios/:id', controller.obtenerEdificio);
router.post('/edificios',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  validar(crearEdificioSchema),
  registrarAccion('CREAR_EDIFICIO', 'edificio'),
  controller.crearEdificio
);
router.put('/edificios/:id',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  validar(actualizarEdificioSchema),
  registrarAccion('ACTUALIZAR_EDIFICIO', 'edificio'),
  controller.actualizarEdificio
);
router.delete('/edificios/:id',
  requiereRol('ADMINISTRADOR'),
  registrarAccion('ELIMINAR_EDIFICIO', 'edificio'),
  controller.eliminarEdificio
);

// ─── Bloqueos ──────────────────────────────────────────
router.get('/bloqueos', controller.listarBloqueos);
router.post('/bloqueos',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  validar(crearBloqueoSchema),
  registrarAccion('CREAR_BLOQUEO', 'bloqueo_espacio'),
  controller.crearBloqueo
);
router.delete('/bloqueos/:id',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  registrarAccion('ELIMINAR_BLOQUEO', 'bloqueo_espacio'),
  controller.eliminarBloqueo
);

// ─── Espacios ──────────────────────────────────────────
router.get('/', controller.listarEspacios);
router.get('/:id', controller.obtenerEspacio);
router.post('/',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  validar(crearEspacioSchema),
  registrarAccion('CREAR_ESPACIO', 'espacio'),
  controller.crearEspacio
);
router.put('/:id',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  validar(actualizarEspacioSchema),
  registrarAccion('ACTUALIZAR_ESPACIO', 'espacio'),
  controller.actualizarEspacio
);
router.delete('/:id',
  requiereRol('ADMINISTRADOR'),
  registrarAccion('ELIMINAR_ESPACIO', 'espacio'),
  controller.eliminarEspacio
);

module.exports = router;
