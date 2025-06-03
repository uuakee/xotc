const paymentService = require('../services/payment.service');

class PaymentController {
    async createDeposit(req, res) {
        try {
            const { amount } = req.body;
            const userId = req.user.id;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Valor inválido para depósito' });
            }

            const result = await paymentService.createDeposit(userId, amount);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async handleCallback(req, res) {
        try {
            const result = await paymentService.handlePaymentCallback(req.body);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async requestWithdrawal(req, res) {
        try {
            const { amount, pix_key, pix_type } = req.body;
            const userId = req.user.id;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Valor inválido para saque' });
            }

            if (!pix_key || !pix_type) {
                return res.status(400).json({ error: 'Dados PIX incompletos' });
            }

            const result = await paymentService.processWithdrawal(userId, amount, pix_key, pix_type);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async listTransactions(req, res) {
        try {
            const userId = req.user.id;
            const transactions = await paymentService.listTransactions(userId);
            return res.json(transactions);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PaymentController(); 