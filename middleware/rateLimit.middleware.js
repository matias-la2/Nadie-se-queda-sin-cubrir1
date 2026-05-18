const rateLimit = require('express-rate-limit');

const limiteGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { ok: false, mensaje: 'Demasiadas peticiones, intenta de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});

const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, mensaje: 'Demasiados intentos de login, intenta de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { limiteGeneral, limiteAuth };
