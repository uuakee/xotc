const authService = require('../services/auth.service');

class AuthController {
  async login(req, res) {
    try {
      const { cpf, password } = req.body;

      if (!cpf || !password) {
        return res.status(400).json({ error: 'CPF e senha são obrigatórios' });
      }

      const result = await authService.login(cpf, password);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async register(req, res) {
    try {
      const { realName, cpf, phone, password, referral_code } = req.body;

      if (!realName || !cpf || !phone || !password) {
        return res.status(400).json({ 
          error: 'Nome completo, CPF, telefone e senha são obrigatórios' 
        });
      }

      let invited_by_id = null;
      if (referral_code) {
        const inviter = await prisma.user.findFirst({
          where: { referral_code }
        });
        if (inviter) {
          invited_by_id = inviter.id;
        }
      }

      const result = await authService.register({
        realName,
        cpf,
        phone,
        password,
        invited_by_id
      });

      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();
