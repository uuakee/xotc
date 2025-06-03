const database = require('../config/database');
const axios = require('axios');

class PaymentService {
    constructor() {
        this.prisma = database.getClient();
    }

    async createDeposit(userId, amount) {
        try {
            // Busca as credenciais do gateway
            const gateway = await this.prisma.gateway.findFirst();
            if (!gateway) {
                throw new Error('Gateway não configurado');
            }

            // Busca dados do usuário
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            // Verifica se a URL da API está configurada
            const apiUrl = process.env.API_URL || 'https://srv.xotc.lat';
            if (!apiUrl) {
                throw new Error('URL da API não configurada');
            }

            // Prepara os dados para a Clypt
            const credentials = `${gateway.clypt_pk}:${gateway.clypt_sk}`;
            const base64Credentials = Buffer.from(credentials).toString('base64');

            const depositData = {
                paymentMethod: 'pix',
                items: [{
                    title: 'Depósito XOTC',
                    unitPrice: amount * 100, // Converte para centavos
                    quantity: 1,
                    tangible: false
                }],
                amount: amount * 100,
                customer: {
                    name: user.realName,
                    email: 'no-reply@xotc.com', // Email padrão para transações
                    document: {
                        number: user.cpf.replace(/\D/g, ''),
                        type: 'cpf'
                    }
                },
                postbackUrl: `${apiUrl}/api/v1/payments/callback`,
                metadata: JSON.stringify({ userId, type: 'deposit' })
            };

            console.log('Enviando requisição para Clypt:', {
                url: `${gateway.clypt_uri}/transactions`,
                headers: {
                    'authorization': `Basic ${base64Credentials}`,
                    'content-type': 'application/json'
                },
                data: depositData
            });

            // Faz a requisição para a Clypt
            const response = await axios({
                method: 'POST',
                url: `${gateway.clypt_uri}/transactions`,
                headers: {
                    'accept': 'application/json',
                    'authorization': `Basic ${base64Credentials}`,
                    'content-type': 'application/json'
                },
                data: depositData
            });

            console.log('Resposta da Clypt:', response.data);

            if (!response.data || !response.data.pix) {
                throw new Error('Resposta inválida do gateway de pagamento');
            }

            // Cria a transação no banco
            const transaction = await this.prisma.transaction.create({
                data: {
                    user_id: userId,
                    amount: amount,
                    type: 'DEPOSIT',
                    status: 'PENDING'
                }
            });

            return {
                transaction_id: transaction.id,
                pix_qrcode: response.data.pix?.qrcode,
                pix_key: response.data.pix?.key,
                amount: amount,
                status: 'PENDING'
            };
        } catch (error) {
            console.error('Erro detalhado:', error.response?.data || error);
            if (error.response?.data?.message) {
                throw new Error(`Erro do gateway: ${error.response.data.message}`);
            }
            throw new Error(`Erro ao criar depósito: ${error.message}`);
        }
    }

    async handlePaymentCallback(data) {
        try {
            console.log('Dados recebidos no callback:', data);

            // Verifica se os dados vieram no objeto data
            const paymentData = data.data || data;
            
            let metadata;
            try {
                metadata = typeof paymentData.metadata === 'string' 
                    ? JSON.parse(paymentData.metadata) 
                    : paymentData.metadata;
            } catch (error) {
                console.error('Erro ao parsear metadata:', error);
                throw new Error('Formato de metadata inválido');
            }

            const userId = metadata?.userId;
            const type = metadata?.type;

            if (!userId || !type) {
                console.error('Metadata inválido:', metadata);
                throw new Error('Dados de metadata inválidos');
            }

            if (type !== 'deposit') {
                throw new Error('Tipo de transação não suportado');
            }

            // Mapeia os status do gateway para os status internos
            const statusMap = {
                'waiting_payment': 'PENDING',
                'pending': 'PENDING',
                'approved': 'COMPLETED',
                'paid': 'COMPLETED',
                'refused': 'REFUSED',
                'in_protest': 'DISPUTED',
                'refunded': 'REFUNDED',
                'cancelled': 'CANCELLED',
                'chargeback': 'CHARGEBACK'
            };

            const internalStatus = statusMap[paymentData.status] || 'PENDING';
            const amount = paymentData.amount / 100; // Converte de centavos para reais

            console.log('Atualizando transação:', {
                userId,
                status: internalStatus,
                amount
            });

            // Atualiza a transação com mais informações
            const updatedTransaction = await this.prisma.transaction.updateMany({
                where: {
                    user_id: userId,
                    type: 'DEPOSIT',
                    status: 'PENDING'
                },
                data: {
                    status: internalStatus,
                    external_id: paymentData.id?.toString(),
                    payment_method: paymentData.paymentMethod,
                    updated_at: new Date(),
                    paid_at: paymentData.paidAt ? new Date(paymentData.paidAt) : null,
                    gateway_response: paymentData
                }
            });

            console.log('Transação atualizada:', updatedTransaction);

            // Atualiza a carteira apenas se o pagamento foi aprovado/pago
            if (['approved', 'paid'].includes(paymentData.status)) {
                const updatedWallet = await this.prisma.wallet.updateMany({
                    where: { user_id: userId },
                    data: {
                        balance: { increment: amount },
                        total_deposit: { increment: amount }
                    }
                });

                console.log('Carteira atualizada:', updatedWallet);
            }

            return { 
                success: true,
                status: internalStatus,
                message: `Transação atualizada com sucesso para status: ${internalStatus}`
            };
        } catch (error) {
            console.error('Erro no callback:', error);
            throw new Error(`Erro ao processar callback: ${error.message}`);
        }
    }

    async processWithdrawal(userId, amount, pixKey, pixType) {
        try {
            // Validações básicas
            if (!pixKey || !pixType) {
                throw new Error('Chave PIX e tipo são obrigatórios');
            }

            const wallet = await this.prisma.wallet.findFirst({
                where: { user_id: userId }
            });

            if (!wallet) {
                throw new Error('Carteira não encontrada');
            }

            if (amount > wallet.balance_withdrawal) {
                throw new Error('Saldo insuficiente para saque');
            }

            // Processa o saque
            const result = await this.prisma.$transaction(async (tx) => {
                // Atualiza o saldo da carteira
                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance_withdrawal: { decrement: amount },
                        total_withdrawal: { increment: amount }
                    }
                });
                
                // Cria a transação de saque
                const transaction = await tx.transaction.create({
                    data: {
                        user_id: userId,
                        amount: amount,
                        type: 'WITHDRAWAL',
                        status: 'PENDING',
                        pix_key: pixKey,
                        pix_type: pixType
                    }
                });

                return transaction;
            });

            return {
                success: true,
                transaction_id: result.id,
                amount: amount,
                status: 'PENDING'
            };
        } catch (error) {
            throw new Error(`Erro ao processar saque: ${error.message}`);
        }
    }
}

module.exports = new PaymentService(); 