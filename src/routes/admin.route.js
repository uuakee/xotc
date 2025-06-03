const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Middleware para verificar se é admin
const isAdmin = [authMiddleware.authenticate, authMiddleware.isAdmin];

// Dashboard
router.get('/dashboard', isAdmin, adminController.getDashboard);

// Usuários
router.get('/users', isAdmin, adminController.getUsers);
router.get('/users/:userId', isAdmin, adminController.getUserDetails);
router.put('/users/:userId/wallet', isAdmin, adminController.updateUserWallet);

// Planos
router.get('/plans', isAdmin, adminController.getPlans);
router.post('/plans', isAdmin, adminController.createPlan);
router.put('/plans/:planId', isAdmin, adminController.updatePlan);
router.delete('/plans/:planId', isAdmin, adminController.deletePlan);

// Configurações do Gateway
router.put('/settings/gateway', isAdmin, adminController.updateGatewaySettings);

// Níveis de Comissão
router.put('/settings/commission-levels', isAdmin, adminController.updateCommissionLevels);

module.exports = router; 