const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const { validar, crearSchema, actualizarSchema } = require('../validators/clases.validator');
const controller = require('../controllers/clases.controller');

const router = Router();
router.use(verificarToken);

router.get('/', controller.listar);
router.get('/:id', controller.obtenerPorId);

router.post('/',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(crearSchema),
  registrarAccion('CREAR_CLASE', 'clase'),
  controller.crear
);

router.put('/:id',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(actualizarSchema),
  registrarAccion('ACTUALIZAR_CLASE', 'clase'),
  controller.actualizar
);

router.delete('/:id',
  requiereRol('ADMINISTRADOR'),
  registrarAccion('ELIMINAR_CLASE', 'clase'),
  controller.eliminar
);

module.exports = router;
