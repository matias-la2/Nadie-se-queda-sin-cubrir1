const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const {
  validar,
  crearGuardiaCreadaSchema, actualizarGuardiaCreadaSchema,
  crearGrupoGuardiaSchema, crearGuardiaAsignadaSchema,
  guardarHorarioSchema, importarCSVSchema, confirmarExcelSchema
} = require('../validators/guardias.validator');
const controller = require('../controllers/guardias.controller');

const uploadExcelMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xls', '.xlsx'].includes(ext)) return cb(null, true);
    cb(new Error('Solo se permiten archivos .xls o .xlsx'));
  }
});

const router = Router();
router.use(verificarToken);

// ─── Tramos horarios ──────────────────────────────────
router.get('/tramos', controller.listarTramos);

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
router.post('/creadas/horario',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(guardarHorarioSchema),
  registrarAccion('GUARDAR_HORARIO', 'guardia_creada'),
  controller.guardarHorario
);
router.post('/creadas/importar',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(importarCSVSchema),
  registrarAccion('IMPORTAR_GUARDIAS', 'guardia_creada'),
  controller.importarCSV
);
router.post('/creadas/importar-excel/analizar',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  uploadExcelMem.array('archivos', 2),
  controller.analizarExcel
);
router.post('/creadas/importar-excel/confirmar',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  validar(confirmarExcelSchema),
  registrarAccion('IMPORTAR_GUARDIAS_EXCEL', 'guardia_creada'),
  controller.confirmarExcel
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
