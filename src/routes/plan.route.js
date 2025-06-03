const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/list', planController.getPlans);

router.post(
    '/investment/:investmentId/pay',
    authMiddleware.authenticate,
    authMiddleware.isAdmin,
    planController.payInvestmentEarnings
);

module.exports = router;

