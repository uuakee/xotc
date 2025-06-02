const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../config/database');

class AuthService {
  constructor() {
    this.prisma = database.getClient();
  }

  async login(cpf, password) {
    const user = await this.prisma.user.findFirst({
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
    await this.prisma.user.update({
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
    const existingUser = await this.prisma.user.findFirst({
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

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        wallet: {
          create: {
            balance: 0
          }
        }
      },
      include: {
        wallet: true
      }
    });

    // Se tiver código de convite, cria o referral
    if (userData.invited_by_id) {
      await this.prisma.referral.create({
        data: {
          user_id: user.id,
          invited_by_id: userData.invited_by_id
        }
      });

      // Incrementa contador de referrals do convidador
      await this.prisma.user.update({
        where: { id: userData.invited_by_id },
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
