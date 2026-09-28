const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const apiLimiter = require('./common/middlewares/rateLimiter');
const winstonLogger = require('./common/logger');
const notFound = require('./common/middlewares/notFound');
const errorHandler = require('./common/middlewares/errorHandler');
const healthRouter = require('./modules/health/health.routes');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors(
    env.CORS_ORIGIN === '*'
      ? { origin: '*', credentials: false }
      : { origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean), credentials: true }
  )
);
app.use(logger('combined', { stream: { write: (msg) => winstonLogger.info(msg.trim()) } }));
app.use('/api', apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

//router
const usersRouter = require('./modules/users/users.routes');
const authRouter = require('./modules/auth/auth.routes');
const businessesRouter = require('./modules/businesses/businesses.routes');

app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Welcome to my awsome project REST API', docs: 'https://docs.example.com', author: 'programmer magang' });
});

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/businesses', businessesRouter);
app.use('/api/v1/chart-of-accounts', require('./modules/chart-of-accounts/chart-of-accounts.routes'));
app.use('/api/v1/taxes', require('./modules/taxes/taxes.routes'));
app.use('/api/v1/cash-bank-accounts', require('./modules/cash-bank-accounts/cash-bank-accounts.routes'));
app.use('/api/v1/cash-bank-transfers', require('./modules/cash-bank-transfers/cash-bank-transfers.routes'));
app.use('/api/v1/products', require('./modules/products/products.routes'));
app.use('/api/v1/customers', require('./modules/customers/customers.routes'));
app.use('/api/v1/suppliers', require('./modules/suppliers/suppliers.routes'));
app.use('/api/v1/stock-movements', require('./modules/stock-movements/stock-movements.routes'));
app.use('/api/v1/sales-invoices', require('./modules/sales-invoices/sales-invoices.routes'));
app.use('/api/v1/receipts', require('./modules/receipts/receipts.routes'));
app.use('/api/v1/purchase-invoices', require('./modules/purchase-invoices/purchase-invoices.routes'));
app.use('/api/v1/purchase-payments', require('./modules/purchase-payments/purchase-payments.routes'));
app.use('/api/v1/journals', require('./modules/journals/journals.routes'));
app.use('/api/v1/fixed-assets', require('./modules/fixed-assets/fixed-assets.routes'));
app.use('/api/v1/asset-depreciations', require('./modules/asset-depreciations/asset-depreciations.routes'));
app.use('/api/v1/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/v1/reports', require('./modules/reports/reports.routes'));
app.use('/api/v1/periods', require('./modules/periods/periods.routes'));
app.use('/api/v1/capital-movements', require('./modules/capital-movements/capital-movements.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
