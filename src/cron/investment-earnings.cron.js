const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Função para processar os pagamentos dos investimentos
async function processInvestmentEarnings() {
  try {
    console.log('🔄 Iniciando processamento de ganhos de investimentos...');

    // Buscar todos os ganhos SCHEDULED
    const scheduledEarnings = await prisma.investmentEarnings.findMany({
      where: {
        type: 'SCHEDULED'
      },
      include: {
        plan: true,
        user: true
      }
    });

    for (const earning of scheduledEarnings) {
      // Verificar se o investimento ainda está ativo
      const investment = await prisma.investment.findFirst({
        where: {
          id: earning.investment_id,
          is_active: true
        }
      });

      // Se o investimento não existir ou não estiver mais ativo, marcar como UNVALIDATED
      if (!investment) {
        await prisma.investmentEarnings.update({
          where: { id: earning.id },
          data: { type: 'UNVALIDATED' }
        });
        continue;
      }

      // Verificar se o investimento não expirou
      if (investment.expires_at < new Date()) {
        // Marcar investimento como inativo
        await prisma.investment.update({
          where: { id: investment.id },
          data: { is_active: false }
        });

        // Marcar earning como UNVALIDATED
        await prisma.investmentEarnings.update({
          where: { id: earning.id },
          data: { type: 'UNVALIDATED' }
        });
        continue;
      }

      // Processar o pagamento
      await prisma.$transaction(async (tx) => {
        // 1. Atualizar o saldo da wallet
        await tx.wallet.updateMany({
          where: { user_id: earning.user_id },
          data: {
            balance: { increment: earning.amount }
          }
        });

        // 2. Marcar o earning atual como PAID
        await tx.investmentEarnings.update({
          where: { id: earning.id },
          data: {
            type: 'PAID',
            paid_at: new Date()
          }
        });

        // 3. Criar novo earning para o próximo pagamento
        await tx.investmentEarnings.create({
          data: {
            investment_id: earning.investment_id,
            plan_id: earning.plan_id,
            user_id: earning.user_id,
            amount: earning.amount,
            type: 'SCHEDULED'
          }
        });
      });

      console.log(`✅ Processado pagamento para usuário ${earning.user_id}`);
    }

    console.log('✨ Processamento de ganhos finalizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao processar ganhos:', error);
  }
}

// Agendar o cron para rodar todos os dias às 23:59
cron.schedule('59 23 * * *', processInvestmentEarnings, {
  timezone: "America/Sao_Paulo"
});

module.exports = {
  processInvestmentEarnings
}; 