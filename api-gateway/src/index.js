const express = require('express');
const morgan = require('morgan');
const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const notesRoutes = require('./routes/notes.routes');
const config = require('./config');
const logger = require('./utils/logger');
const { getFullHealthStatus } = require('./utils/healthCheck');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(globalLimiter);

// ─── Health Checks ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Notely API Gateway</title>
        <style>
          :root {
            color-scheme: dark;
            --bg: #08101f;
            --panel: #0f1b31;
            --panel-2: #13213b;
            --text: #eaf1ff;
            --muted: #9ab0d1;
            --accent: #63d6b8;
            --accent-2: #7ea8ff;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at top, rgba(126, 168, 255, 0.18), transparent 28%),
              radial-gradient(circle at 80% 20%, rgba(99, 214, 184, 0.16), transparent 24%),
              linear-gradient(160deg, var(--bg), #050913 72%);
            color: var(--text);
          }
          .card {
            width: min(760px, calc(100vw - 32px));
            padding: 40px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            background: linear-gradient(180deg, rgba(19, 33, 59, 0.96), rgba(11, 20, 39, 0.96));
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
          }
          .eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(126, 168, 255, 0.1);
            color: var(--accent-2);
            font-size: 13px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          h1 {
            margin: 18px 0 12px;
            font-size: clamp(2.2rem, 5vw, 4rem);
            line-height: 1;
          }
          p {
            margin: 0 0 18px;
            color: var(--muted);
            font-size: 1.05rem;
            line-height: 1.6;
          }
          .grid {
            display: grid;
            gap: 14px;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            margin-top: 28px;
          }
          .tile {
            padding: 16px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
          }
          .tile strong {
            display: block;
            margin-bottom: 6px;
            color: var(--accent);
          }
          a {
            color: var(--accent-2);
            text-decoration: none;
          }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <main class="card">
          <span class="eyebrow">Notely API Gateway</span>
          <h1>Online Notes & Study Platform</h1>
          <p>
            The gateway is running. Use it to route requests to auth, user, and notes services,
            or check service health before testing the stack.
          </p>
          <div class="grid">
            <div class="tile">
              <strong>Status</strong>
              Gateway ready
            </div>
            <div class="tile">
              <strong>Health</strong>
              <a href="/health">/health</a> and <a href="/health/all">/health/all</a>
            </div>
            <div class="tile">
              <strong>API Routes</strong>
              <a href="/api/auth">/api/auth</a>, <a href="/api/users">/api/users</a>, <a href="/api/notes">/api/notes</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date(),
    upstreams: {
      auth:  config.services.auth,
      user:  config.services.user,
      notes: config.services.notes,
    },
  });
});

// Aggregate health — pings all downstream services and returns complete system status
app.get('/health/all', async (req, res) => {
  const healthStatus = await getFullHealthStatus(config);
  res.status(healthStatus.allHealthy ? 200 : 503).json(healthStatus);
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notes', notesRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
    logger.info(`Auth  Service → ${config.services.auth}`);
    logger.info(`User  Service → ${config.services.user}`);
    logger.info(`Notes Service → ${config.services.notes}`);
  });
}

module.exports = app;
