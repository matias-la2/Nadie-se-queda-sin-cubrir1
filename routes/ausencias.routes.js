const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const { upload, parsearMultipart } = require('../middleware/upload.middleware');
const { validar, crearSchema, actualizarSchema, cambiarEstadoSchema } = require('../validators/ausencias.validator');
const controller = require('../controllers/ausencias.controller');

const router = Router();
router.use(verificarToken);

router.get('/', controller.listar);
router.get('/:id', controller.obtenerPorId);

router.post('/',
  requiereRol('PROFESOR', 'EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  upload.single('archivo_tarea'),
  parsearMultipart,
  validar(crearSchema),
  registrarAccion('CREAR_AUSENCIA', 'ausencia'),
  controller.crear
);

router.put('/:id',
  requiereRol('PROFESOR', 'EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  upload.single('archivo_tarea'),
  parsearMultipart,
  validar(actualizarSchema),
  registrarAccion('ACTUALIZAR_AUSENCIA', 'ausencia'),
  controller.actualizar
);

router.patch('/:id/estado',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(cambiarEstadoSchema),
  registrarAccion('CAMBIAR_ESTADO_AUSENCIA', 'ausencia'),
  controller.cambiarEstado
);

router.delete('/:id',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  registrarAccion('ELIMINAR_AUSENCIA', 'ausencia'),
  controller.eliminar
);

module.exports = router;
