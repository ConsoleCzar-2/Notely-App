const express = require('express');
const morgan = require('morgan');
const compression = require('compression');
const cors = require('cors');
const { initDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { requestIdMiddleware } = require('./middleware/requestId');
const userRoutes = require('./routes/user.routes');
const logger = require('./utils/logger');
const { metricsMiddleware, metricsHandler, metricsJsonHandler } = require('./utils/metrics');
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 4002;

// ─── CORS Configuration ───────────────────────────────────────────────────────
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(compression());
app.use(requestIdMiddleware);
app.use(metricsMiddleware);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ service: 'user-service', status: 'healthy', timestamp: new Date() });
});

// ─── Prometheus Metrics ───────────────────────────────────────────────────────
app.get('/metrics', metricsHandler);
app.get('/metrics/json', metricsJsonHandler);

// ─── Swagger API Documentation ────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/users', userRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
if (require.main === module) {
  initDB()
    .then(() => {
      app.listen(PORT, () => logger.info(`User Service running on port ${PORT}`));
    })
    .catch((err) => {
      logger.error('Failed to initialize DB:', err.message);
      process.exit(1);
    });
}

module.exports = app;
