const router = require('express').Router();
const controller = require('../controllers/clientesController');
const { autenticar, autorizar } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');

router.use(autenticar, autorizar('CLIENTE'));
router.get('/me', asyncHandler(controller.miPerfil));
router.put('/me', asyncHandler(controller.actualizarPerfil));
router.post('/me/foto', asyncHandler(controller.subirFoto));

module.exports = router;
