const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const {
  validar,
  crearGuardiaCreadaSchema, actualizarGuardiaCreadaSchema,
  crearGrupoGuardiaSchema, crearGuardiaAsignadaSchema
} = require('../validators/guardias.validator');
const controller = require('../controllers/guardias.controller');

const router = Router();
router.use(verificarToken);

// ─── Guardias de hoy ──────────────────────────────────
router.get('/hoy', controller.guardiasHoy);

// ─── Guardias creadas (planificadas) ───────────────────
router.get('/creadas', controller.listarCreadas);
router.get('/creadas/:id', controller.obtenerCreada);
router.post('/creadas',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(crearGuardiaCreadaSchema),
  registrarAccion('CREAR_GUARDIA', 'guardia_creada'),
  controller.crearCreada
);
router.post('/creadas/grupo',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(crearGrupoGuardiaSchema),
  registrarAccion('CREAR_GUARDIA', 'guardia_creada'),
  controller.crearGrupo
);
router.put('/creadas/:id',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(actualizarGuardiaCreadaSchema),
  registrarAccion('ACTUALIZAR_GUARDIA', 'guardia_creada'),
  controller.actualizarCreada
);
router.delete('/creadas/:id',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  registrarAccion('ELIMINAR_GUARDIA', 'guardia_creada'),
  controller.eliminarCreada
);

// ─── Guardias asignadas ────────────────────────────────
router.get('/asignadas', controller.listarAsignadas);
router.post('/asignadas',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(crearGuardiaAsignadaSchema),
  registrarAccion('ASIGNAR_GUARDIA', 'guardia_asignada'),
  controller.crearAsignada
);
router.patch('/asignadas/:id/responder',
  registrarAccion('RESPONDER_GUARDIA', 'guardia_asignada'),
  controller.responderGuardia
);
router.delete('/asignadas/:id',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  registrarAccion('ELIMINAR_GUARDIA_ASIGNADA', 'guardia_asignada'),
  controller.eliminarAsignada
);

module.exports = router;
