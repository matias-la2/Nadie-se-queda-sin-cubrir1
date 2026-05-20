const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verificarToken } = require('../middleware/auth.middleware');
const { requiereRol } = require('../middleware/rol.middleware');
const { registrarAccion } = require('../middleware/log.middleware');
const {
  validar,
  crearGuardiaCreadaSchema, actualizarGuardiaCreadaSchema,
  crearGrupoGuardiaSchema, crearGuardiaAsignadaSchema,
  guardarHorarioSchema, importarCSVSchema
} = require('../validators/guardias.validator');
const controller = require('../controllers/guardias.controller');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'excel');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const uploadExcel = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
      cb(null, unique + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xls', '.xlsx'].includes(ext)) return cb(null, true);
    cb(new Error('Solo se permiten archivos .xls o .xlsx'));
  }
});

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
router.post('/creadas/importar-excel',
  requiereRol('EQUIPO_DIRECTIVO', 'ADMINISTRADOR'),
  uploadExcel.single('archivo'),
  registrarAccion('IMPORTAR_GUARDIAS_EXCEL', 'guardia_creada'),
  controller.importarExcel
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
