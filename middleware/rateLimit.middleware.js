const rateLimit = require('express-rate-limit');

const limiteGeneral = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  keyGenerator: (req) => req.ip,
  message: { ok: false, mensaje: 'Demasiadas peticiones, espera un momento e inténtalo de nuevo' },
  standardHeaders: true,
  legacyHeaders: false,
});

const limiteAuth = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV !== 'production' ? 100 : 20,
  keyGenerator: (req) => req.ip,
  message: { ok: false, mensaje: 'Demasiadas peticiones, espera un momento e inténtalo de nuevo' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { limiteGeneral, limiteAuth };
