require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const passport = require('./config/passport');
const { manejadorErrores } = require('./middleware/error.middleware');

const app = express();

// ─── Middlewares globales ──────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

// ─── Archivos estáticos (frontend) ────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Rutas API ─────────────────────────────────────────────
app.use('/api/v1/auth',           require('./routes/auth.routes'));
app.use('/api/v1/notificaciones', require('./routes/notificaciones.routes'));

// TODO: Antonio — descomentar a medida que cree las rutas
// app.use('/api/v1/guardias',     require('./routes/guardias.routes'));
// app.use('/api/v1/incidencias',  require('./routes/incidencias.routes'));
// app.use('/api/v1/ausencias',    require('./routes/ausencias.routes'));
// app.use('/api/v1/reservas',     require('./routes/reservas.routes'));
// app.use('/api/v1/espacios',     require('./routes/espacios.routes'));
// app.use('/api/v1/usuarios',     require('./routes/usuarios.routes'));

// ─── Health check ──��──────────────────────────────────��────
app.get('/api/v1/health', (req, res) => {
  res.json({ ok: true, mensaje: 'API funcionando', timestamp: new Date().toISOString() });
});

// ─── Manejador de errores global ───────────────────────────
app.use(manejadorErrores);

// ─── Arrancar servidor ───���─────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api/v1/`);
});
