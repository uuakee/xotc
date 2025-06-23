const { PrismaClient } = require('@prisma/client');

console.log('🔍 Iniciando configuração do banco de dados...');

let prismaClient = null;

const createPrismaClient = () => {
  try {
    console.log('🔧 Criando novo Prisma Client...');
    prismaClient = new PrismaClient({
      log: ['warn', 'error'],
      errorFormat: 'pretty'
    });
    console.log('✅ Prisma Client criado com sucesso!');
    return prismaClient;
  } catch (error) {
    console.error('❌ Erro ao criar Prisma Client:', error);
    throw error;
  }
};

class Database {
  constructor() {
    console.log('🏗️  Inicializando classe Database...');
    
    if (Database.instance) {
      console.log('🔄 Retornando instância existente do Database');
      return Database.instance;
    }

    this.prisma = createPrismaClient();
    Database.instance = this;
    console.log('✅ Instância do Database criada com sucesso!');
  }

  async connect() {
    try {
      console.log('🔌 Tentando conectar ao banco de dados...');
      
      if (!this.prisma) {
        console.log('⚠️  Prisma client não encontrado, criando novo...');
        this.prisma = createPrismaClient();
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
    console.log('🔍 Obtendo cliente Prisma...');
    
    if (!this.prisma) {
      console.log('⚠️  Prisma client não encontrado, criando novo...');
      this.prisma = createPrismaClient();
    }
    
    console.log('✅ Cliente Prisma obtido com sucesso!');
    return this.prisma;
  }
}

// Adiciona handler de desconexão ao processo
process.on('beforeExit', async () => {
  console.log('🔌 Desconectando do banco de dados...');
  if (prismaClient) {
    await prismaClient.$disconnect();
  }
});

// Cria e exporta a instância
console.log('📤 Exportando instância do Database...');
const databaseInstance = new Database();

module.exports = databaseInstance;
