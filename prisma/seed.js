const { PrismaClient, UserLevel, TransactionType, PixType, TransactionStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Criar usuário admin
  const adminUser = await prisma.user.create({
    data: {
      realName: 'Administrador',
      phone: '11999999999',
      cpf: '12345678900',
      password: await bcrypt.hash('admin123', 10),
      is_admin: true,
      level: UserLevel.LEVEL_1,
      is_active: true,
      referral_code: 'ADMIN001',
      points: 1000,
    }
  });

  // Criar carteira do admin
  await prisma.wallet.create({
    data: {
      user_id: adminUser.id,
      balance: 10000,
      balance_commission: 1000,
    }
  });

  // Criar planos de investimento
  const plans = await Promise.all([
    prisma.plan.create({
      data: {
        name: 'Plano Iniciante',
        price: 100,
        days: 30,
        profit: 0.5,
        max_buy: 5,
        level: UserLevel.LEVEL_5,
      }
    }),
    prisma.plan.create({
      data: {
        name: 'Plano Intermediário',
        price: 500,
        days: 45,
        profit: 0.8,
        max_buy: 3,
        level: UserLevel.LEVEL_4,
      }
    }),
    prisma.plan.create({
      data: {
        name: 'Plano Avançado',
        price: 1000,
        days: 60,
        profit: 1.2,
        max_buy: 2,
        level: UserLevel.LEVEL_3,
      }
    }),
  ]);

  // Configurar níveis de comissão
  await Promise.all(
    Object.values(UserLevel).map((level) =>
      prisma.commissionLevel.create({
        data: {
          level,
          percentage: level === 'LEVEL_1' ? 15 :
                      level === 'LEVEL_2' ? 12 :
                      level === 'LEVEL_3' ? 10 :
                      level === 'LEVEL_4' ? 8 : 5,
          min_referrals: level === 'LEVEL_1' ? 20 :
                        level === 'LEVEL_2' ? 15 :
                        level === 'LEVEL_3' ? 10 :
                        level === 'LEVEL_4' ? 5 : 0,
        }
      })
    )
  );

  // Criar alguns usuários de exemplo
  const users = await Promise.all(
    Array(5).fill(null).map(async (_, index) => {
      const user = await prisma.user.create({
        data: {
          realName: `Usuário Teste ${index + 1}`,
          phone: `119999${String(index + 1).padStart(5, '0')}`,
          cpf: `${String(index + 1).padStart(11, '0')}`,
          password: await bcrypt.hash('123456', 10),
          is_active: true,
          level: UserLevel.LEVEL_5,
          referral_code: `USER00${index + 1}`,
          invited_by_id: index > 0 ? adminUser.id : null,
        }
      });

      // Criar carteira para cada usuário
      await prisma.wallet.create({
        data: {
          user_id: user.id,
          balance: 1000,
        }
      });

      // Criar alguns investimentos
      if (index < 3) {
        const investment = await prisma.investment.create({
          data: {
            user_id: user.id,
            plan_id: plans[0].id,
            amount: 100,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }
        });

        // Criar alguns ganhos de investimento
        await prisma.investmentEarnings.create({
          data: {
            investment_id: investment.id,
            plan_id: plans[0].id,
            user_id: user.id,
            amount: 5,
          }
        });
      }

      // Criar algumas transações
      await prisma.transaction.create({
        data: {
          user_id: user.id,
          amount: 100,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
        }
      });

      return user;
    })
  );

  // Criar alguns referrals
  await Promise.all(
    users.slice(1).map((user) =>
      prisma.referral.create({
        data: {
          user_id: user.id,
          invited_by_id: adminUser.id,
        }
      })
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 