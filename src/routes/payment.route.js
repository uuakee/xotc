const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');


// Depósito
router.post('/deposit', authMiddleware.authenticate, paymentController.createDeposit);

// Saque
router.post('/withdrawal', authMiddleware.authenticate, paymentController.requestWithdrawal);

// Listar transações
router.get('/transactions', authMiddleware.authenticate, paymentController.listTransactions);

// Callback do gateway (não precisa de autenticação)
router.post('/callback', paymentController.handleCallback);

module.exports = router; 