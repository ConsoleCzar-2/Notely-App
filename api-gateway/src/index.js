const express = require('express');
const morgan = require('morgan');
const compression = require('compression');
const cors = require('cors');
const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { requestIdMiddleware } = require('./middleware/requestId');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const notesRoutes = require('./routes/notes.routes');
const config = require('./config');
const logger = require('./utils/logger');
const { getFullHealthStatus } = require('./utils/healthCheck');
const { metricsMiddleware, metricsHandler } = require('./utils/metrics');
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS Configuration ───────────────────────────────────────────────────────
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(compression());
app.use(globalLimiter);
app.use(requestIdMiddleware);
app.use(metricsMiddleware);

// ─── Health Checks ────────────────────────────────────────────────────────────
/**
 * @openapi
 * /:
 *   get:
 *     tags: [Health]
 *     summary: Gateway landing page
 *     description: Returns an HTML landing page describing the gateway.
 *     security: []
 *     responses:
 *       200:
 *         description: HTML landing page
 *         content:
 *           text/html:
 *             schema: { type: string }
 */
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
              <a href="/api/v1/auth">/api/v1/auth</a>, <a href="/api/v1/users">/api/v1/users</a>, <a href="/api/v1/notes">/api/v1/notes</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  `);
});

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Gateway health check
 *     description: Returns the gateway's own health status and upstream service URLs.
 *     security: []
 *     responses:
 *       200:
 *         description: Gateway is healthy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/HealthCheck' }
 */
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

/**
 * @openapi
 * /health/all:
 *   get:
 *     tags: [Health]
 *     summary: Aggregate health check
 *     description: Pings all downstream services and returns the complete system status.
 *     security: []
 *     responses:
 *       200:
 *         description: All services healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allHealthy: { type: boolean, example: true }
 *                 services:
 *                   type: object
 *                   properties:
 *                     auth: { type: object }
 *                     user: { type: object }
 *                     notes: { type: object }
 *       503:
 *         description: One or more services unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allHealthy: { type: boolean, example: false }
 *                 services: { type: object }
 */
// Aggregate health — pings all downstream services and returns complete system status
app.get('/health/all', async (req, res) => {
  const healthStatus = await getFullHealthStatus(config);
  res.status(healthStatus.allHealthy ? 200 : 503).json(healthStatus);
});

// ─── Prometheus Metrics ───────────────────────────────────────────────────────
/**
 * @openapi
 * /metrics:
 *   get:
 *     tags: [Metrics]
 *     summary: Prometheus metrics
 *     description: Returns Prometheus-format metrics for the gateway.
 *     security: []
 *     responses:
 *       200:
 *         description: Prometheus metrics in text format
 *         content:
 *           text/plain:
 *             schema: { type: string }
 */
app.get('/metrics', metricsHandler);
/**
 * @openapi
 * /metrics/json:
 *   get:
 *     tags: [Metrics]
 *     summary: Prometheus metrics (JSON)
 *     description: Returns gateway metrics in JSON format.
 *     security: []
 *     responses:
 *       200:
 *         description: Metrics in JSON format
 *         content:
 *           application/json:
 *             schema: { type: object }
 */
app.get('/metrics/json', async (req, res) => {
  const { metricsJsonHandler } = require('./utils/metrics');
  await metricsJsonHandler(req, res);
});

// ─── Swagger API Documentation ────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth',  authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notes', notesRoutes);

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
