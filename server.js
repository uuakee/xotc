const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const figlet = require('figlet');
const database = require('./src/config/database');
const payments = require('./src/config/payments');
require('dotenv').config();
require('./src/cron/investment-earnings.cron');

const app = express();
const port = process.env.PORT || 3000;

// Routes
const authRoutes = require('./src/routes/auth.route');
const userRoutes = require('./src/routes/user.route');
const planRoutes = require('./src/routes/plan.route');
const paymentRoutes = require('./src/routes/payment.route');

app.use(cors());
app.use(bodyParser.json());

const authVersion = 'v1';

// API Routes
app.use(`/api/${authVersion}/auth`, authRoutes);
app.use(`/api/${authVersion}/users`, userRoutes);
app.use(`/api/${authVersion}/plans`, planRoutes);
app.use(`/api/${authVersion}/payments`, paymentRoutes);
app.get('/', (req, res) => {
  res.send('XOTC API - 不要成为入侵者');
});

const startServer = async () => {
  try {
    await database.connect();
    
    // Verifica conexão com gateway de pagamentos
    const gatewayOk = await payments.verifyGatewayConnection();
    
    app.listen(port, () => {
      console.log('\x1b[92m' + figlet.textSync('XOTC', {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      }) + '\x1b[0m');
      console.log(`🌱 Serviço funcionando na porta ${port}`);
      
      if (gatewayOk) {
        console.log('\x1b[92m🚀 Gateways de pagamento configurados com sucesso!\x1b[0m');
      } else {
        console.log('\x1b[31m⚠️  Atenção: Gateway de pagamento não configurado ou com erro\x1b[0m');
      }
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();
