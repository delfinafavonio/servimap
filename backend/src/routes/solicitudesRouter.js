const router = require('express').Router();
const controller = require('../controllers/solicitudesController');
const { autenticar, autorizar } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');

router.use(autenticar);
router.get('/', autorizar('CLIENTE', 'PRESTADOR', 'ADMINISTRADOR'), asyncHandler(controller.listar));
router.post('/', autorizar('CLIENTE'), asyncHandler(controller.crear));
router.get('/:id', autorizar('CLIENTE', 'PRESTADOR', 'ADMINISTRADOR'), asyncHandler(controller.obtener));
router.patch('/:id/estado', autorizar('CLIENTE', 'PRESTADOR'), asyncHandler(controller.cambiarEstado));

module.exports = router;
