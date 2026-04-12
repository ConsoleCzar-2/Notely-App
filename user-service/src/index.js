const express = require('express');
const morgan = require('morgan');
const { initDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const userRoutes = require('./routes/user.routes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 4002;

app.use(express.json());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ service: 'user-service', status: 'healthy', timestamp: new Date() });
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
