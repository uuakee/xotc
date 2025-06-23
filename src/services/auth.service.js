const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../config/database');

console.log('🔍 Iniciando AuthService...');

class AuthService {
  constructor() {
    console.log('🏗️  Inicializando AuthService...');
    try {
      this.prisma = database.getClient();
      console.log('✅ Prisma client obtido no AuthService:', !!this.prisma);
    } catch (error) {
      console.error('❌ Erro ao inicializar AuthService:', error);
      throw error;
    }
  }

  // Método auxiliar para garantir que o Prisma está disponível
  getPrisma() {
    if (!this.prisma) {
      console.log('⚠️  Prisma não encontrado, recriando...');
      this.prisma = database.getClient();
    }
    return this.prisma;
  }

  async login(cpf, password) {
    const prisma = this.getPrisma();
    
    const user = await prisma.user.findFirst({
      where: { cpf },
      include: {
        wallet: true
      }
    });

    if (!user) {
      throw new Error('错误:Usuário não encontrado');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('错误: Senha inválida');
    }

    if (!user.is_active) {
      throw new Error('错误: Usuário inativo');
    }

    // Atualiza último login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    const token = jwt.sign(
      { 
        id: user.id,
        is_admin: user.is_admin,
        level: user.level
      },
      process.env.JWT_SECRET,
      { expiresIn: '29d' }
    );

    return {
      user: {
        id: user.id,
        realName: user.realName,
        cpf: user.cpf,
        phone: user.phone,
        is_admin: user.is_admin,
        level: user.level,
        points: user.points,
        wallet: user.wallet[0]
      },
      token
    };
  }

  async register(userData) {
    console.log('📝 Iniciando registro de usuário...');
    console.log('🔍 Dados recebidos:', { 
      realName: userData.realName, 
      cpf: userData.cpf, 
      phone: userData.phone,
      hasReferralCode: !!userData.referral_code 
    });

    const prisma = this.getPrisma();

    try {
      console.log('🔍 Verificando usuário existente...');
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { cpf: userData.cpf },
            { phone: userData.phone }
          ]
        }
      });

      if (existingUser) {
        throw new Error('错误:CPF ou telefone já cadastrado');
      }

      // Se tiver referral_code, busca o usuário que convidou
      let invited_by_id = null;
      if (userData.referral_code) {
        console.log('🔍 Buscando usuário pelo referral_code:', userData.referral_code);
        const inviter = await prisma.user.findFirst({
          where: { referral_code: userData.referral_code }
        });
        
        if (inviter) {
          invited_by_id = inviter.id;
          console.log('✅ Usuário convidador encontrado:', inviter.id);
        } else {
          throw new Error('错误:Código de convite inválido');
        }
      }

      console.log('🔐 Gerando hash da senha...');
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      console.log('👤 Criando usuário no banco...');
      const user = await prisma.user.create({
        data: {
          realName: userData.realName,
          cpf: userData.cpf,
          phone: userData.phone,
          password: hashedPassword,
          is_active: true,
          referral_code: "0x" + Math.random().toString(36).substring(2, 10).toUpperCase(),
          invited_by_id: invited_by_id,
          wallet: {
            create: {
              balance: 10
            }
          }
        },
        include: {
          wallet: true
        }
      });

      console.log('✅ Usuário criado com sucesso:', user.id);

      // Se tiver código de convite, cria o referral
      if (invited_by_id) {
        console.log('🔗 Criando registro de referral...');
        await prisma.referral.create({
          data: {
            user_id: user.id,
            invited_by_id: invited_by_id
          }
        });

        console.log('📊 Incrementando contador de referrals...');
        // Incrementa contador de referrals do convidador
        await prisma.user.update({
          where: { id: invited_by_id },
          data: {
            referral_count: {
              increment: 1
            }
          }
        });
      }

      const token = jwt.sign(
        { 
          id: user.id,
          is_admin: user.is_admin,
          level: user.level
        },
        process.env.JWT_SECRET,
        { expiresIn: '29d' }
      );

      return {
        user: {
          id: user.id,
          realName: user.realName,
          cpf: user.cpf,
          phone: user.phone,
          is_admin: user.is_admin,
          level: user.level,
          points: user.points,
          wallet: user.wallet[0]
        },
        token
      };
    } catch (error) {
      console.error('❌ Erro ao registrar usuário:', error);
      throw error;
    }
  }

  async getMe(userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true
      }
    });

    if (!user) {
      throw new Error('错误: Usuário não encontrado');
    }

    return {
      user: {
        id: user.id,
        realName: user.realName,
        cpf: user.cpf,
        phone: user.phone,
        is_admin: user.is_admin,
        level: user.level,
        referral_code: user.referral_code,
        points: user.points,
        wallet: user.wallet[0]
      }
    };
  }
}

module.exports = new AuthService();
