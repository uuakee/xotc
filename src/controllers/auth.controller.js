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

      const result = await authService.register({
        realName,
        cpf,
        phone,
        password,
        referral_code
      });

      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async me(req, res) {
    try {
      const result = await authService.getMe(req.user.id);
      return res.json(result);
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();
