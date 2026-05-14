const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const { validar, crearSchema, actualizarSchema, cambiarEstadoSchema } = require('../validators/incidencias.validator');
const controller = require('../controllers/incidencias.controller');

const router = Router();
router.use(verificarToken);

router.get('/', controller.listar);
router.get('/:id', controller.obtenerPorId);

router.post('/',
  requiereRol('PROFESOR', 'EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(crearSchema),
  registrarAccion('CREAR_INCIDENCIA', 'incidencia'),
  controller.crear
);

router.put('/:id',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(actualizarSchema),
  registrarAccion('ACTUALIZAR_INCIDENCIA', 'incidencia'),
  controller.actualizar
);

router.patch('/:id/estado',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(cambiarEstadoSchema),
  registrarAccion('CAMBIAR_ESTADO_INCIDENCIA', 'incidencia'),
  controller.cambiarEstado
);

router.delete('/:id',
  requiereRol('ADMINISTRADOR'),
  registrarAccion('ELIMINAR_INCIDENCIA', 'incidencia'),
  controller.eliminar
);

module.exports = router;
