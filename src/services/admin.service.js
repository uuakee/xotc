const database = require('../config/database');

class AdminService {
    constructor() {
        this.prisma = database.getClient();
    }

    // Usuários
    async getUsers() {
        return this.prisma.user.findMany({
            include: {
                wallet: true,
                transactions: {
                    orderBy: { created_at: 'desc' },
                    take: 5
                }
            }
        });
    }

    async getUserDetails(userId) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: true,
                transactions: {
                    orderBy: { created_at: 'desc' },
                    take: 10
                },
                investments: {
                    include: {
                        plan: true
                    }
                }
            }
        });
    }

    async updateUserWallet(userId, data) {
        const { balance, balance_withdrawal, balance_commission } = data;

        return this.prisma.$transaction(async (tx) => {
            // Atualiza a carteira
            const wallet = await tx.wallet.updateMany({
                where: { user_id: userId },
                data: {
                    ...(balance !== undefined && { balance }),
                    ...(balance_withdrawal !== undefined && { balance_withdrawal }),
                    ...(balance_commission !== undefined && { balance_commission })
                }
            });

            // Registra a transação se houver alteração de saldo
            if (balance !== undefined) {
                await tx.transaction.create({
                    data: {
                        user_id: userId,
                        amount: balance,
                        type: 'DEPOSIT',
                        status: 'COMPLETED',
                        by_user_id: 'ADMIN'
                    }
                });
            }

            return wallet;
        });
    }

    // Planos
    async getPlans() {
        return this.prisma.plan.findMany({
            orderBy: { created_at: 'desc' }
        });
    }

    async createPlan(data) {
        const { name, price, days, profit, max_buy, level, points } = data;
        
        return this.prisma.plan.create({
            data: {
                name,
                price,
                days,
                profit,
                max_buy,
                level,
                points: points || 0,
                is_active: true
            }
        });
    }

    async updatePlan(planId, data) {
        const { name, price, days, profit, max_buy, level, points, is_active } = data;
        
        return this.prisma.plan.update({
            where: { id: planId },
            data: {
                ...(name !== undefined && { name }),
                ...(price !== undefined && { price }),
                ...(days !== undefined && { days }),
                ...(profit !== undefined && { profit }),
                ...(max_buy !== undefined && { max_buy }),
                ...(level !== undefined && { level }),
                ...(points !== undefined && { points }),
                ...(is_active !== undefined && { is_active })
            }
        });
    }

    async deletePlan(planId) {
        // Verifica se existem investimentos ativos
        const activeInvestments = await this.prisma.investment.count({
            where: {
                plan_id: planId,
                is_active: true
            }
        });

        if (activeInvestments > 0) {
            throw new Error('Não é possível excluir um plano com investimentos ativos');
        }

        return this.prisma.plan.update({
            where: { id: planId },
            data: { is_active: false }
        });
    }

    // Dashboard
    async getDashboardStats() {
        const [
            totalUsers,
            totalDeposits,
            totalWithdrawals,
            totalInvestments,
            recentTransactions,
            activeInvestments,
            planStats
        ] = await Promise.all([
            // Total de usuários
            this.prisma.user.count(),
            
            // Total de depósitos
            this.prisma.transaction.aggregate({
                where: { type: 'DEPOSIT', status: 'COMPLETED' },
                _sum: { amount: true },
                _count: true
            }),
            
            // Total de saques
            this.prisma.transaction.aggregate({
                where: { type: 'WITHDRAWAL', status: 'COMPLETED' },
                _sum: { amount: true },
                _count: true
            }),
            
            // Total de investimentos
            this.prisma.investment.aggregate({
                where: { is_active: true },
                _sum: { amount: true },
                _count: true
            }),
            
            // Transações recentes
            this.prisma.transaction.findMany({
                take: 10,
                orderBy: { created_at: 'desc' },
                include: {
                    user: {
                        select: {
                            realName: true,
                            cpf: true
                        }
                    }
                }
            }),
            
            // Investimentos ativos
            this.prisma.investment.count({
                where: { is_active: true }
            }),
            
            // Estatísticas por plano
            this.prisma.plan.findMany({
                include: {
                    _count: {
                        select: { investments: true }
                    }
                }
            })
        ]);

        return {
            users: {
                total: totalUsers
            },
            finances: {
                deposits: {
                    total: totalDeposits._sum.amount || 0,
                    count: totalDeposits._count
                },
                withdrawals: {
                    total: totalWithdrawals._sum.amount || 0,
                    count: totalWithdrawals._count
                },
                investments: {
                    total: totalInvestments._sum.amount || 0,
                    count: totalInvestments._count,
                    active: activeInvestments
                }
            },
            recentTransactions,
            plans: planStats.map(plan => ({
                id: plan.id,
                name: plan.name,
                totalInvestments: plan._count.investments
            }))
        };
    }

    // Configurações do Gateway
    async updateGatewaySettings(data) {
        const { clypt_uri, clypt_pk, clypt_sk } = data;

        // Busca configuração existente
        const existingGateway = await this.prisma.gateway.findFirst();

        if (existingGateway) {
            return this.prisma.gateway.update({
                where: { id: existingGateway.id },
                data: {
                    ...(clypt_uri && { clypt_uri }),
                    ...(clypt_pk && { clypt_pk }),
                    ...(clypt_sk && { clypt_sk })
                }
            });
        }

        return this.prisma.gateway.create({
            data: {
                clypt_uri,
                clypt_pk,
                clypt_sk
            }
        });
    }

    // Níveis de Comissão
    async updateCommissionLevels(levels) {
        const updates = levels.map(level => 
            this.prisma.commissionLevel.upsert({
                where: {
                    level: level.level
                },
                update: {
                    percentage: level.percentage,
                    min_referrals: level.min_referrals
                },
                create: {
                    level: level.level,
                    percentage: level.percentage,
                    min_referrals: level.min_referrals
                }
            })
        );

        return Promise.all(updates);
    }
}

module.exports = new AdminService();
