const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const { validar, crearSchema, actualizarSchema } = require('../validators/reservas.validator');
const controller = require('../controllers/reservas.controller');

const router = Router();
router.use(verificarToken);

router.get('/', controller.listar);
router.get('/:id', controller.obtenerPorId);

router.post('/',
  requiereRol('PROFESOR', 'EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(crearSchema),
  registrarAccion('CREAR_RESERVA', 'reserva'),
  controller.crear
);

router.put('/:id',
  requiereRol('PROFESOR', 'EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(actualizarSchema),
  registrarAccion('ACTUALIZAR_RESERVA', 'reserva'),
  controller.actualizar
);

router.delete('/:id',
  requiereRol('PROFESOR', 'EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  registrarAccion('ELIMINAR_RESERVA', 'reserva'),
  controller.eliminar
);

module.exports = router;
