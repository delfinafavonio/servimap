const router = require('express').Router();
const controller = require('../controllers/calificacionesController');
const { autenticar, autorizar } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');

router.use(autenticar);
router.post('/', autorizar('CLIENTE'), asyncHandler(controller.crear));
router.get('/moderacion', autorizar('ADMINISTRADOR'), asyncHandler(controller.listarModeracion));
router.patch('/:id/moderacion', autorizar('ADMINISTRADOR'), asyncHandler(controller.moderar));

module.exports = router;
