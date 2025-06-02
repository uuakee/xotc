const database = require('./database');
const axios = require('axios');

class PaymentConfig {
    constructor() {
        this.prisma = database.getClient();
    }

    async verifyGatewayConnection() {
        try {
            // Busca as credenciais do gateway
            const gateway = await this.prisma.gateway.findFirst();
            
            if (!gateway || !gateway.clypt_uri || !gateway.clypt_pk || !gateway.clypt_sk) {
                throw new Error('Credenciais do gateway não configuradas');
            }

            // Cria o token Basic Auth em base64
            const credentials = `${gateway.clypt_pk}:${gateway.clypt_sk}`;
            const base64Credentials = Buffer.from(credentials).toString('base64');

            // Faz a requisição para a API do Clypt
            const response = await axios({
                method: 'GET',
                url: `${gateway.clypt_uri}/company`,
                headers: {
                    'accept': 'application/json',
                    'authorization': `Basic ${base64Credentials}`
                }
            });
            // console.log(response.data);
            return response.status === 200;
        } catch (error) {
            console.error('❌ Erro ao verificar gateway:', error.message);
            return false;
        }
    }
}

module.exports = new PaymentConfig();
