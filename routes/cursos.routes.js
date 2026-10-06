const { Router } = require('express');
const { verificarToken } = require('../middleware/auth.middleware');
const controller = require('../controllers/cursos.controller');

const router = Router();
router.use(verificarToken);
router.get('/', controller.listarCursos);

module.exports = router;
