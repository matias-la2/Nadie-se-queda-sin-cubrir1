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
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        console.error('[Auth] Error OAuth:', err.message);
        return res.redirect('/?error=' + encodeURIComponent('Error de autenticación'));
      }
      if (!user) {
        const mensaje = info?.message || 'Acceso denegado';
        return res.redirect('/?error=' + encodeURIComponent(mensaje));
      }
      req.user = user;
      authController.googleCallback(req, res);
    })(req, res, next);
  }
);

// Devuelve el usuario actual (requiere token)
router.get('/me', verificarToken, authController.obtenerUsuarioActual);

// Cierra sesión (limpia cookie)
router.post('/logout', verificarToken, authController.logout);

module.exports = router;
