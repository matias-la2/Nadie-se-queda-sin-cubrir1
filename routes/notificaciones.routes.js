const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const controller = require('../controllers/notificaciones.controller');

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/v1/notificaciones — listar mis notificaciones (?leida=0|1)
router.get('/', controller.listar);

// PATCH /api/v1/notificaciones/leer-todas — marcar todas como leídas
router.patch('/leer-todas', controller.marcarTodasLeidas);

// PATCH /api/v1/notificaciones/:id/leer — marcar una como leída
router.patch('/:id/leer', controller.marcarLeida);

// POST /api/v1/notificaciones — crear (solo admin/directivo)
router.post('/',
  requiereRol('ADMINISTRADOR', 'EQUIPO_DIRECTIVO'),
  registrarAccion('CREAR_NOTIFICACION', 'notificacion'),
  controller.crear
);

module.exports = router;
