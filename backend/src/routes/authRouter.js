const router = require('express').Router();
const controller = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');

router.post('/registro', asyncHandler(controller.registro));
router.post('/login', asyncHandler(controller.login));
router.get('/me', autenticar, asyncHandler(controller.me));
router.post('/logout', controller.logout);

module.exports = router;
