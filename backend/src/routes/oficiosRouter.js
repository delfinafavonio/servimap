const router = require('express').Router();
const controller = require('../controllers/oficiosController');
const { autenticar, autorizar } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');

router.get('/', asyncHandler(controller.obtenerOficios));
router.get('/admin', autenticar, autorizar('ADMINISTRADOR'), asyncHandler(controller.obtenerOficios));
router.post('/', autenticar, autorizar('ADMINISTRADOR'), asyncHandler(controller.crearOficio));
router.get('/:id', asyncHandler(controller.obtenerOficio));
router.put('/:id', autenticar, autorizar('ADMINISTRADOR'), asyncHandler(controller.actualizarOficio));
router.patch('/:id/estado', autenticar, autorizar('ADMINISTRADOR'), asyncHandler(controller.actualizarOficio));

module.exports = router;
