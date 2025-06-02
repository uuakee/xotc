const jwt = require('jsonwebtoken');
const database = require('../config/database');

class AuthMiddleware {
  constructor() {
    this.prisma = database.getClient();
  }

  // Middleware para verificar se o token é válido
  authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const [, token] = authHeader.split(' ');

      if (!token) {
        return res.status(401).json({ error: 'Token mal formatado' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verifica se o usuário ainda existe e está ativo
        const user = await this.prisma.user.findUnique({
          where: { id: decoded.id }
        });

        if (!user || !user.is_active) {
          return res.status(401).json({ error: 'Usuário não existe ou está inativo' });
        }

        // Adiciona dados do usuário ao request
        req.user = {
          id: decoded.id,
          is_admin: decoded.is_admin,
          level: decoded.level
        };

        return next();
      } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Middleware para verificar se o usuário é admin
  isAdmin = (req, res, next) => {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador' });
    }

    return next();
  };

  // Middleware para verificar o nível do usuário
  hasLevel = (requiredLevel) => {
    return (req, res, next) => {
      const userLevel = req.user.level;
      const levels = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'];
      
      const userLevelIndex = levels.indexOf(userLevel);
      const requiredLevelIndex = levels.indexOf(requiredLevel);

      if (userLevelIndex === -1 || requiredLevelIndex === -1) {
        return res.status(500).json({ error: 'Nível inválido' });
      }

      // Quanto menor o índice, maior o nível (LEVEL_1 é o mais alto)
      if (userLevelIndex > requiredLevelIndex) {
        return res.status(403).json({ 
          error: `Acesso negado. Requer nível ${requiredLevel} ou superior` 
        });
      }

      return next();
    };
  };

  // Middleware para verificar se o usuário tem acesso aos dados
  isSelfOrAdmin = (req, res, next) => {
    const userId = req.params.userId || req.body.user_id;

    if (!req.user.is_admin && req.user.id !== userId) {
      return res.status(403).json({ 
        error: 'Acesso negado. Você só pode acessar seus próprios dados' 
      });
    }

    return next();
  };
}

module.exports = new AuthMiddleware();
