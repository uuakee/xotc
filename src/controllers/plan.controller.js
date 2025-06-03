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

    async payInvestmentEarnings(req, res) {
        try {
            const { investmentId } = req.params;

            if (!investmentId) {
                return res.status(400).json({ error: 'ID do investimento é obrigatório' });
            }

            const result = await planService.payInvestmentEarnings(investmentId);

            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }

            return res.json(result);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PlanController();