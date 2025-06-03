const adminService = require('../services/admin.service');

class AdminController {
    // Usuários
    async getUsers(req, res) {
        try {
            const users = await adminService.getUsers();
            return res.json(users);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getUserDetails(req, res) {
        try {
            const { userId } = req.params;
            const user = await adminService.getUserDetails(userId);
            
            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            return res.json(user);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async updateUserWallet(req, res) {
        try {
            const { userId } = req.params;
            const { balance, balance_withdrawal, balance_commission } = req.body;

            const wallet = await adminService.updateUserWallet(userId, {
                balance,
                balance_withdrawal,
                balance_commission
            });

            return res.json(wallet);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Planos
    async getPlans(req, res) {
        try {
            const plans = await adminService.getPlans();
            return res.json(plans);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async createPlan(req, res) {
        try {
            const { name, price, days, profit, max_buy, level, points } = req.body;

            if (!name || !price || !days || !profit || !max_buy || !level) {
                return res.status(400).json({ error: 'Dados incompletos' });
            }

            const plan = await adminService.createPlan({
                name,
                price,
                days,
                profit,
                max_buy,
                level,
                points
            });

            return res.json(plan);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async updatePlan(req, res) {
        try {
            const { planId } = req.params;
            const { name, price, days, profit, max_buy, level, points, is_active } = req.body;

            const plan = await adminService.updatePlan(planId, {
                name,
                price,
                days,
                profit,
                max_buy,
                level,
                points,
                is_active
            });

            return res.json(plan);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async deletePlan(req, res) {
        try {
            const { planId } = req.params;
            await adminService.deletePlan(planId);
            return res.json({ message: 'Plano desativado com sucesso' });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Dashboard
    async getDashboard(req, res) {
        try {
            const stats = await adminService.getDashboardStats();
            return res.json(stats);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Configurações do Gateway
    async updateGatewaySettings(req, res) {
        try {
            const { clypt_uri, clypt_pk, clypt_sk } = req.body;

            if (!clypt_uri || !clypt_pk || !clypt_sk) {
                return res.status(400).json({ error: 'Dados incompletos' });
            }

            const gateway = await adminService.updateGatewaySettings({
                clypt_uri,
                clypt_pk,
                clypt_sk
            });

            return res.json(gateway);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Níveis de Comissão
    async updateCommissionLevels(req, res) {
        try {
            const { levels } = req.body;

            if (!Array.isArray(levels)) {
                return res.status(400).json({ error: 'Formato inválido' });
            }

            const updatedLevels = await adminService.updateCommissionLevels(levels);
            return res.json(updatedLevels);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AdminController(); 