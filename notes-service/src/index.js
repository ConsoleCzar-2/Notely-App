const express = require('express');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const notesRoutes = require('./routes/notes.routes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 4003;

app.use(express.json());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ service: 'notes-service', status: 'healthy', timestamp: new Date() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/notes', notesRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => logger.info(`Notes Service running on port ${PORT}`));
    })
    .catch((err) => {
      logger.error('Failed to connect to MongoDB:', err.message);
      process.exit(1);
    });
}

module.exports = app;
