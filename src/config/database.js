const { PrismaClient } = require('@prisma/client');

let prisma = null;

const initializePrisma = () => {
  if (!prisma) {
    try {
      prisma = new PrismaClient({
        log: ['warn', 'error'],
        errorFormat: 'pretty'
      });
      console.log('✅ Prisma Client inicializado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao inicializar Prisma Client:', error);
      throw error;
    }
  }
  return prisma;
};

class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    
    this.prisma = initializePrisma();
    Database.instance = this;
  }

  async connect() {
    try {
      if (!this.prisma) {
        this.prisma = initializePrisma();
      }
      
      await this.prisma.$connect();
      console.log('📦 Conexão com banco de dados estabelecida com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao conectar com banco de dados:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.prisma) {
        await this.prisma.$disconnect();
        console.log('📦 Conexão com banco de dados encerrada com sucesso!');
      }
    } catch (error) {
      console.error('❌ Erro ao desconectar do banco de dados:', error);
    }
  }

  getClient() {
    if (!this.prisma) {
      this.prisma = initializePrisma();
    }
    return this.prisma;
  }
}

// Adiciona handler de desconexão ao processo
process.on('beforeExit', async () => {
  console.log('🔌 Desconectando do banco de dados...');
  if (prisma) {
    await prisma.$disconnect();
  }
});

// Exporta uma instância única do banco de dados
module.exports = new Database();
