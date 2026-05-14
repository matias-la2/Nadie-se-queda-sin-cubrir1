const { Router } = require('express');
const passport = require('../config/passport');
const { verificarToken } = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');

const router = Router();

// Inicia el flujo OAuth con Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Callback de Google — genera JWT en cookie y redirige
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  authController.googleCallback
);

// Devuelve el usuario actual (requiere token)
router.get('/me', verificarToken, authController.obtenerUsuarioActual);

// Cierra sesión (limpia cookie)
router.post('/logout', verificarToken, authController.logout);

module.exports = router;
