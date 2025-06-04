const database = require('../config/database');
const bcrypt = require('bcryptjs');

class UserService {
    constructor() {
        this.prisma = database.getClient();
    }

    async getBalance(userId) {
        const wallet = await this.prisma.wallet.findFirst({
            where: { user_id: userId }
        });

        if (!wallet) {
            throw new Error('错误: Carteira não encontrada');
        }

        return {
            balance: wallet.balance,
            balance_commission: wallet.balance_commission,
            balance_withdrawal: wallet.balance_withdrawal,
            total_investment: wallet.total_investment,
            total_commission: wallet.total_commission,
            total_deposit: wallet.total_deposit
        };
    }

    async updateProfile(userId, data) {
        const { password, ...updateData } = data;

        // Se tiver senha nova, faz o hash
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                realName: true,
                phone: true,
                cpf: true,
                level: true,
                points: true,
                is_active: true
            }
        });

        return user;
    }

    async buyInvestment(userId, planId) {
        // Busca o plano
        const plan = await this.prisma.plan.findUnique({
            where: { id: planId }
        });

        if (!plan) {
            throw new Error('Plano não encontrado');
        }

        if (!plan.is_active) {
            throw new Error('Este plano não está mais disponível');
        }

        // Busca o usuário e sua carteira
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: true
            }
        });

        if (!user || !user.wallet[0]) {
            throw new Error('Usuário ou carteira não encontrados');
        }

        const wallet = user.wallet[0];

        // Verifica se o usuário tem nível adequado
        const userLevelValue = this.getLevelValue(user.level);
        const planLevelValue = this.getLevelValue(plan.level);

        if (userLevelValue > planLevelValue) {
            throw new Error('Seu nível não é suficiente para este plano');
        }

        // Verifica se o usuário tem saldo suficiente
        if (wallet.balance < plan.price) {
            throw new Error('Saldo insuficiente para comprar este plano');
        }

        // Verifica quantidade máxima de compras
        const activeInvestments = await this.prisma.investment.count({
            where: {
                user_id: userId,
                plan_id: planId,
                is_active: true
            }
        });

        if (activeInvestments >= plan.max_buy) {
            throw new Error('Você atingiu o limite máximo de compras para este plano');
        }

        // Calcula a data de expiração
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + plan.days);

        // Processa comissão se o usuário foi convidado por alguém
        let commissionAmount = 0;
        let invitedBy = null;

        if (user.invited_by_id) {
            // Busca o usuário que convidou e seu nível de comissão
            const inviter = await this.prisma.user.findUnique({
                where: { id: user.invited_by_id }
            });

            if (inviter) {
                const commissionLevel = await this.prisma.commissionLevel.findFirst({
                    where: { level: inviter.level }
                });

                if (commissionLevel) {
                    commissionAmount = (plan.price * commissionLevel.percentage) / 100;
                    invitedBy = inviter;
                }
            }
        }

        // Cria o investimento e atualiza a carteira em uma transação
        const result = await this.prisma.$transaction(async (tx) => {
            // Cria o investimento
            const investment = await tx.investment.create({
                data: {
                    user_id: userId,
                    plan_id: planId,
                    amount: plan.price,
                    expires_at: expiresAt
                }
            });

            // Atualiza a carteira do comprador
            await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: {
                        decrement: plan.price
                    },
                    total_investment: {
                        increment: plan.price
                    }
                }
            });

            // Cria a transação do investimento
            await tx.transaction.create({
                data: {
                    user_id: userId,
                    amount: plan.price,
                    type: 'INVESTMENT',
                    status: 'COMPLETED',
                    plan_id: planId
                }
            });

            // Cria o primeiro earning programado
            await tx.investmentEarnings.create({
                data: {
                    investment_id: investment.id,
                    amount: plan.price * (plan.profit / 100),
                    type: 'SCHEDULED',
                    user_id: userId,
                    plan_id: planId
                }
            });

            // Processa comissão se houver
            if (commissionAmount > 0 && invitedBy) {
                // Atualiza a carteira do convidante
                await tx.wallet.updateMany({
                    where: { user_id: invitedBy.id },
                    data: {
                        balance_commission: { increment: commissionAmount },
                        total_commission: { increment: commissionAmount }
                    }
                });

                // Registra a transação de comissão
                await tx.transaction.create({
                    data: {
                        user_id: invitedBy.id,
                        amount: commissionAmount,
                        type: 'COMMISSION',
                        status: 'COMPLETED',
                        by_user_id: userId
                    }
                });
            }

            return {
                investment,
                commissionPaid: commissionAmount > 0 ? {
                    amount: commissionAmount,
                    to: invitedBy.id
                } : null
            };
        });

        return result;
    }

    // Função auxiliar para converter nível em valor numérico
    getLevelValue(level) {
        const levelMap = {
            'LEVEL_1': 1,
            'LEVEL_2': 2,
            'LEVEL_3': 3,
            'LEVEL_4': 4,
            'LEVEL_5': 5
        };
        return levelMap[level] || 5;
    }

    async getInvestments(userId) {
        const investments = await this.prisma.investment.findMany({
            where: { user_id: userId },
            include: {
                plan: true
            }
        });
        if (investments.length === 0) {
            return [];
        }
        return investments;
    }

    async getReferralStats(userId) {
        // Busca os referidos diretos e seus usuários
        const directReferrals = await this.prisma.referral.findMany({
            where: { invited_by_id: userId },
            include: {
                invited_by: true
            }
        });

        // Busca os usuários referidos
        const referredUsers = await this.prisma.user.findMany({
            where: {
                id: {
                    in: directReferrals.map(ref => ref.user_id)
                }
            },
            include: {
                wallet: true
            }
        });

        // Busca a carteira do usuário para comissões
        const wallet = await this.prisma.wallet.findFirst({
            where: { user_id: userId }
        });

        // Busca as transações de comissão
        const commissionTransactions = await this.prisma.transaction.findMany({
            where: {
                user_id: userId,
                type: 'COMMISSION'
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 10 // Limita a 10 últimas transações
        });

        // Formata os referidos com dados relevantes
        const formattedReferrals = referredUsers.map(user => ({
            id: user.id,
            name: user.realName,
            level: user.level,
            joined_at: user.created_at,
            total_invested: user.wallet[0]?.total_investment || 0
        }));

        return {
            total_referrals: directReferrals.length,
            total_commission: wallet?.total_commission || 0,
            available_commission: wallet?.balance_commission || 0,
            referrals: formattedReferrals,
            recent_commissions: commissionTransactions
        };
    }

    // Listar todos os saques do usuário
    async listWithdrawals(userId) {
        const withdrawals = await this.prisma.transaction.findMany({
            where: { user_id: userId, type: 'WITHDRAWAL' },
            orderBy: { created_at: 'desc' }
        });
        return withdrawals;
    }

}

module.exports = new UserService();