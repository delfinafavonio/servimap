const express = require('express');
const router = express.Router();
const { obtenerOficios } = require('../controllers/oficiosController');

router.get('/', obtenerOficios);

module.exports = router;