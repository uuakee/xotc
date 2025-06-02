const userService = require('../services/user.service');

class UserController {
    async getBalance(req, res) {
        try {
            const balance = await userService.getBalance(req.user.id);
            return res.json(balance);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const { password, realName, phone } = req.body;
            
            if (!realName && !phone && !password) {
                return res.status(400).json({ 
                    error: 'Nenhum dado fornecido para atualização' 
                });
            }

            const user = await userService.updateProfile(req.user.id, {
                password,
                realName,
                phone
            });

            return res.json(user);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async buyInvestment(req, res) {
        try {
            const { plan_id } = req.body;

            if (!plan_id) {
                return res.status(400).json({ 
                    error: 'ID do plano é obrigatório' 
                });
            }

            const investment = await userService.buyInvestment(
                req.user.id,
                plan_id
            );

            return res.status(201).json(investment);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getInvestments(req, res) {
        try {
            const investments = await userService.getInvestments(req.user.id);
            return res.json(investments);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getReferralStats(req, res) {
        try {
            const stats = await userService.getReferralStats(req.user.id);
            return res.json(stats);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async listWithdrawals(req, res) {
        try {
            const withdrawals = await userService.listWithdrawals(req.user.id);
            return res.json(withdrawals);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    
}

module.exports = new UserController(); 