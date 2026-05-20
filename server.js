require('dotenv').config();
const { validarEntorno } = require('./config/env.validator');
validarEntorno();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const passport = require('./config/passport');
const { manejadorErrores } = require('./middleware/error.middleware');
const { limiteGeneral, limiteAuth } = require('./middleware/rateLimit.middleware');
const pool = require('./config/db');

const app = express();
app.set('trust proxy', 1);

// ─── Middlewares globales ──────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan(':method :url :status :response-time ms - :remote-addr'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

// ─── Archivos estáticos (frontend) ────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Rate limiting ────────────────────────────────────────
app.use('/api/v1/', limiteGeneral);
app.use('/api/v1/auth/google', limiteAuth);

// ─── Rutas API ─────────────────────────────────────────────
app.use('/api/v1/auth',           require('./routes/auth.routes'));
app.use('/api/v1/notificaciones', require('./routes/notificaciones.routes'));

app.use('/api/v1/espacios',     require('./routes/espacios.routes'));
app.use('/api/v1/incidencias',  require('./routes/incidencias.routes'));
app.use('/api/v1/ausencias',    require('./routes/ausencias.routes'));
app.use('/api/v1/guardias',     require('./routes/guardias.routes'));
app.use('/api/v1/reservas',     require('./routes/reservas.routes'));
app.use('/api/v1/usuarios',     require('./routes/usuarios.routes'));
app.use('/api/v1/clases',       require('./routes/clases.routes'));

// ─── Health check ─────────────────────────────────────────
app.get('/api/v1/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, mensaje: 'API funcionando', db: 'conectada', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, mensaje: 'API funcionando pero BD no disponible', db: 'desconectada', error: err.message });
  }
});

// ─── Manejador de errores global ───────────────────────────
app.use(manejadorErrores);

// ─── Arrancar servidor ────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`Google Group: ${process.env.GOOGLE_GROUP_EMAIL || 'no configurado'}`);
    console.log(`API disponible en http://localhost:${PORT}/api/v1/`);
  });
}

module.exports = app;
