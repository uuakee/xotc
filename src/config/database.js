const { PrismaClient } = require('@prisma/client');

class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    this.prisma = new PrismaClient({
      log: ['warn', 'error'],
      errorFormat: 'pretty'
    });

    // Adiciona handler de desconexão ao processo
    process.on('beforeExit', async () => {
      console.log('🔌 Desconectando do banco de dados...');
      await this.disconnect();
    });

    Database.instance = this;
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('📦 Conexão com banco de dados estabelecida com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao conectar com banco de dados:', error);
      // Tenta reconectar após 5 segundos
      console.log('🔄 Tentando reconectar em 5 segundos...');
      setTimeout(() => this.connect(), 5000);
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      console.log('📦 Conexão com banco de dados encerrada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao desconectar do banco de dados:', error);
      process.exit(1);
    }
  }

  getClient() {
    return this.prisma;
  }
}

// Exporta uma instância única do banco de dados
module.exports = new Database();
