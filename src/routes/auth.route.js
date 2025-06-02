const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Rotas de autenticação
router.post('/login', authController.login);
router.post('/register', authController.register);

module.exports = router;
