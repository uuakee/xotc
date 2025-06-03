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

    // Função para pagar o ganho do investimento 
    async payInvestmentEarnings(investmentId) {
        try {
            // Buscar o investimento
            const investment = await this.prisma.investment.findUnique({
                where: { id: investmentId },
                include: {
                    plan: true
                }
            });

            if (!investment || !investment.is_active) {
                throw new Error('Investimento não encontrado ou inativo');
            }

            // Verificar se o investimento não expirou
            if (investment.expires_at < new Date()) {
                await this.prisma.investment.update({
                    where: { id: investmentId },
                    data: { is_active: false }
                });
                throw new Error('Investimento expirado');
            }

            // Buscar os earnings pendentes
            const investmentEarnings = await this.prisma.investmentEarnings.findMany({
                where: {
                    investment_id: investmentId,
                    type: 'SCHEDULED'
                },
                include: {
                    plan: true,
                    user: true
                }
            });

            const results = [];

            for (const earning of investmentEarnings) {
                try {
                    await this.prisma.$transaction(async (tx) => {
                        // 1. Atualizar o saldo da wallet
                        await tx.wallet.updateMany({
                            where: { user_id: earning.user_id },
                            data: {
                                balance: { increment: earning.amount }
                            }
                        });

                        // 2. Atualizar o total de ganhos do investimento
                        await tx.investment.update({
                            where: { id: investmentId },
                            data: {
                                total_earnings: { increment: earning.amount }
                            }
                        });

                        // 3. Marcar o earning atual como PAID
                        await tx.investmentEarnings.update({
                            where: { id: earning.id },
                            data: {
                                type: 'PAID',
                                paid_at: new Date()
                            }
                        });

                        // 4. Criar novo earning para o próximo pagamento se o investimento ainda não expirou
                        if (investment.expires_at > new Date()) {
                            await tx.investmentEarnings.create({
                                data: {
                                    investment_id: earning.investment_id,
                                    plan_id: earning.plan_id,
                                    user_id: earning.user_id,
                                    amount: earning.amount,
                                    type: 'SCHEDULED'
                                }
                            });
                        }
                    });

                    results.push({
                        earningId: earning.id,
                        status: 'success',
                        message: 'Pagamento processado com sucesso'
                    });
                } catch (error) {
                    results.push({
                        earningId: earning.id,
                        status: 'error',
                        message: `Erro ao processar pagamento: ${error.message}`
                    });
                }
            }

            return {
                success: true,
                investmentId,
                results
            };
        } catch (error) {
            return {
                success: false,
                investmentId,
                error: error.message
            };
        }
    }
}

module.exports = new PlanService();
