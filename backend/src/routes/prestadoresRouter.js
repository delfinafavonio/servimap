const router = require('express').Router();
const controller = require('../controllers/prestadoresController');
const { autenticar, autorizar } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');

router.get('/', asyncHandler(controller.buscar));
router.get('/me', autenticar, autorizar('PRESTADOR'), asyncHandler(controller.miPerfil));
router.put('/me', autenticar, autorizar('PRESTADOR'), asyncHandler(controller.actualizarPerfil));
router.post('/me/foto', autenticar, autorizar('PRESTADOR'), asyncHandler(controller.subirFoto));
router.put('/me/oficios/:oficioId', autenticar, autorizar('PRESTADOR'), asyncHandler(controller.guardarOficio));
router.delete('/me/oficios/:oficioId', autenticar, autorizar('PRESTADOR'), asyncHandler(controller.eliminarOficio));
router.get('/:id', asyncHandler(controller.obtener));

module.exports = router;
