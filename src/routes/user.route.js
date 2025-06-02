const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware.authenticate);

router.get('/balance', userController.getBalance);
router.put('/profile', userController.updateProfile);
router.post('/investment', userController.buyInvestment);
router.get('/investments', userController.getInvestments);

module.exports = router;

