const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');

router.get('/list', planController.getPlans);

module.exports = router;

