const multer = require('multer');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, '..', 'uploads', 'tareas');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

const TIPOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (TIPOS.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Tipo de archivo no permitido. Formatos aceptados: PDF, Word, Excel, PowerPoint, JPG, PNG, WEBP'));
  }
});

function parsearMultipart(req, _res, next) {
  if (req.body.hay_tarea !== undefined && typeof req.body.hay_tarea === 'string') {
    req.body.hay_tarea = req.body.hay_tarea === 'true' || req.body.hay_tarea === '1';
  }
  if (req.body.espacios && typeof req.body.espacios === 'string') {
    try { req.body.espacios = JSON.parse(req.body.espacios); } catch { /* se queda como está */ }
  }
  if (req.body.id_profesor && typeof req.body.id_profesor === 'string') {
    req.body.id_profesor = parseInt(req.body.id_profesor, 10) || undefined;
  }
  next();
}

module.exports = { upload, parsearMultipart };
