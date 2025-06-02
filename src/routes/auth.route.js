const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rotas de autenticação
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authMiddleware.authenticate, authController.me);

module.exports = router;
