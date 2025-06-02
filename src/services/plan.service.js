const database = require('../config/database');

class PlanService {
    constructor() {
        this.prisma = database.getClient();
    }

    async getPlans() {
        const plans = await this.prisma.plan.findMany();
        if (plans.length === 0) {
            throw new Error('错误: Nenhum plano encontrado');
        }
        return plans;
    }
}

module.exports = new PlanService();
