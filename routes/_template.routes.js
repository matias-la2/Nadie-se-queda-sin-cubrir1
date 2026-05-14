// ╔═══════════════════════════════════════════════════════════╗
// ║  PLANTILLA DE RUTAS — Copiar y renombrar                ║
// ║  Ejemplo: incidencias.routes.js, reservas.routes.js     ║
// ╚═══════════════════════════════════════════════════════════╝

const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
// const { validar } = require('../validators/tu-modulo.validator');
// const controller = require('../controllers/tu-modulo.controller');

const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(verificarToken);

// ─── Listar (todos los roles autenticados) ─────────────
// GET /api/v1/tu-modulo
// router.get('/', controller.listar);

// ─── Obtener uno por ID ────────────────────────────────
// GET /api/v1/tu-modulo/:id
// router.get('/:id', controller.obtenerPorId);

// ─── Crear (con validación Zod + log) ──────────────────
// POST /api/v1/tu-modulo
// router.post('/',
//   requiereRol('PROFESOR', 'EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
//   validar(tuSchema),
//   registrarAccion('CREAR_RECURSO', 'tu_tabla'),
//   controller.crear
// );

// ─── Actualizar ────────────────────────────────────────
// PUT /api/v1/tu-modulo/:id
// router.put('/:id',
//   requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
//   validar(tuSchemaUpdate),
//   registrarAccion('ACTUALIZAR_RECURSO', 'tu_tabla'),
//   controller.actualizar
// );

// ─── Eliminar ──────────────────────────────────────────
// DELETE /api/v1/tu-modulo/:id
// router.delete('/:id',
//   requiereRol('ADMINISTRADOR'),
//   registrarAccion('ELIMINAR_RECURSO', 'tu_tabla'),
//   controller.eliminar
// );

module.exports = router;
