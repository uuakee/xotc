const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware.authenticate);

router.get('/balance', userController.getBalance);
router.put('/profile', userController.updateProfile);
router.post('/investments/buy', userController.buyInvestment);
router.get('/investments', userController.getInvestments);
router.get('/referral/stats', userController.getReferralStats);
router.get('/withdrawals', userController.listWithdrawals);

module.exports = router;

