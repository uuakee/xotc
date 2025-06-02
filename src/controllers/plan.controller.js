const planService = require('../services/plan.service');

class PlanController {
    async getPlans(req, res) {
        try {
            const plans = await planService.getPlans();
            return res.json(plans);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new PlanController();