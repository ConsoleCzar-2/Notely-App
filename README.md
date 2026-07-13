# Notely

A microservices-based online notes and study platform. The system is composed of a React single-page application fronted by nginx, an Express API gateway, and three backend services (auth, user, notes) backed by PostgreSQL, MongoDB, and Redis. All services are containerized with Docker and orchestrated via Docker Compose.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Service Inventory](#service-inventory)
3. [Technology Stack](#technology-stack)
4. [Repository Layout](#repository-layout)
5. [Getting Started with Docker](#getting-started-with-docker)
6. [Local Development](#local-development)
7. [Database Migrations](#database-migrations)
8. [API Reference](#api-reference)
9. [Cross-Cutting Concerns](#cross-cutting-concerns)
10. [Observability](#observability)
11. [Testing](#testing)
12. [Environment Variables](#environment-variables)
13. [License](#license)

---

## Architecture

```mermaid
flowchart LR
    Browser["Browser<br/>(React SPA)"] --> Nginx["nginx :80<br/>(frontend container)"]
    Nginx -- "/api/*" --> Gateway["API Gateway<br/>(Express :3000)"]
    Nginx -- "/health" --> Gateway
    Gateway -- "/api/v1/auth" --> Auth["Auth Service :4001"]
    Gateway -- "/api/v1/users" --> User["User Service :4002"]
    Gateway -- "/api/v1/notes" --> Notes["Notes Service :4003"]
    Auth --> Redis[("Redis 7<br/>token store")]
    Auth --> PGAuth[("PostgreSQL 16<br/>auth_users, refresh_tokens")]
    User --> PGUser[("PostgreSQL 16<br/>users")]
    Notes --> Mongo[("MongoDB 7<br/>notes")]
```

Request flow:

- The browser loads the SPA from nginx (port 8080 on the host). nginx serves static assets and proxies `/api/*` and `/health` to the API gateway.
- The API gateway is the single public entry point for all backend calls. It performs JWT verification, rate limiting, request validation, circuit breaking, retry with backoff, and metrics collection before forwarding to the downstream service.
- Each downstream service owns its data store and exposes a private HTTP API. Services authenticate requests by verifying the JWT locally using a shared secret and reading the injected `x-user-id`, `x-user-email`, and `x-user-username` headers.

All containers run on a single Docker bridge network (`notes_network`). Infrastructure containers (`mongo`, `postgres`, `redis`) define healthchecks, and application containers use `depends_on` with `condition: service_healthy` so startup order is deterministic.

---

## Service Inventory

| Service | Container port | Host port | Stack | Data store | Responsibility |
|---|---|---|---|---|---|
| frontend | 80 | 8080 | React 18, Vite 5, nginx | none | SPA UI; proxies API calls to the gateway |
| api-gateway | 3000 | 3000 | Express 4, node-fetch, opossum, prom-client | none | Routing, auth, rate limiting, circuit breaking, retry, metrics, Swagger |
| auth-service | 4001 | - | Express 4, jsonwebtoken, bcryptjs, ioredis, pg | PostgreSQL, Redis | Registration, login, token issuance, refresh token rotation, logout, token verification |
| user-service | 4002 | - | Express 4, pg, jsonwebtoken | PostgreSQL | User profile CRUD, avatar URL validation, account deletion, internal user lookup |
| notes-service | 4003 | - | Express 4, mongoose 8, jsonwebtoken | MongoDB | Notes CRUD, soft delete and restore, pagination, filtering, full-text search |

Only the API gateway and frontend publish host ports. The backend services are reachable only within the Docker network.

---

## Technology Stack

**Frontend**
- React 18 with hooks-based state management and context for auth
- Vite 5 for development server and production builds
- nginx for serving the built SPA and reverse-proxying API requests
- Custom fetch-based API client with typed error handling (`ApiError`)

**API Gateway**
- Express 4 with `express.json`, `compression`, `cors`, `morgan` logging
- `node-fetch` for upstream proxying with retry and exponential backoff
- `opossum` circuit breakers per downstream service
- `express-rate-limit` for tiered rate limiting
- `jsonwebtoken` for local JWT verification
- `prom-client` for Prometheus metrics
- `swagger-jsdoc` and `swagger-ui-express` for OpenAPI 3.0.3 docs

**Auth Service**
- `jsonwebtoken` for access and refresh token signing and verification
- `bcryptjs` with 12 salt rounds for password hashing
- `ioredis` for refresh token storage and access token blacklisting with TTL
- `pg` for PostgreSQL access to `auth_users` and `refresh_tokens` tables
- `uuid` v4 for user IDs
- `node-pg-migrate` for schema migrations

**User Service**
- `pg` for PostgreSQL access to the `users` table
- Upsert pattern with `ON CONFLICT DO UPDATE` and `COALESCE` for partial updates
- `node-pg-migrate` for schema migrations

**Notes Service**
- `mongoose` 8 for MongoDB access with schema validation and middleware
- Text index on `title`, `content`, and `tags` for full-text search
- Compound indexes on `userId + createdAt` and `userId + isDeleted + createdAt`
- `pre-find` middleware that excludes soft-deleted notes by default

**Infrastructure**
- MongoDB 7
- PostgreSQL 16-alpine
- Redis 7-alpine
- Docker with multi-stage builds per service
- Docker Compose with healthchecks and dependency ordering

**Testing**
- Jest 29 and `supertest` for backend service tests
- Vite build for frontend verification

---

## Repository Layout

```
Notely-App/
├── docker-compose.yml          # Full stack orchestration
├── .env.example                # Root environment template
├── README.md
├── api-gateway/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Express app, middleware, route mounting
│       ├── config/             # Service URLs, JWT secret, Swagger spec
│       ├── middleware/         # authenticate, rateLimiter, validation, errorHandler, requestId
│       ├── routes/             # auth, user, notes proxy routes
│       └── utils/              # proxy, circuitBreaker, healthCheck, logger, metrics
├── auth-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── migration.config.js
│   ├── migrations/             # auth_users, refresh_tokens tables
│   └── src/
│       ├── index.js
│       ├── config/             # db, redis, jwt, swagger
│       ├── middleware/         # validation, errorHandler, requestId
│       ├── models/             # authUser.model.js
│       ├── routes/             # auth.controller, auth.routes
│       └── utils/              # jwt, logger, metrics
├── user-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── migration.config.js
│   ├── migrations/             # users table
│   └── src/
│       ├── index.js
│       ├── config/             # db, swagger
│       ├── middleware/        # authenticate, validation, errorHandler, requestId
│       ├── models/             # user.model.js
│       └── routes/             # user.controller, user.routes
├── notes-service/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── config/             # db, swagger
│       ├── middleware/        # authenticate, validation, errorHandler, requestId
│       ├── models/             # note.model.js
│       └── routes/             # notes.controller, notes.routes
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── api/                # client, auth, users, notes, index
│       ├── components/         # AuthPanel, LoginForm, RegisterForm, NotesList, NoteCard, NoteEditor, ProfilePanel
│       ├── context/           # AuthContext
│       ├── hooks/             # useForm, useNotes, useProfile
│       └── utils/             # constants
└── tests/                      # Gateway integration tests
```

---

## Getting Started with Docker

This is the recommended way to run the entire stack. Docker Compose builds all images, starts infrastructure with healthchecks, and brings up the services in dependency order.

### Prerequisites

- Docker 20+ with the Compose v2 plugin
- A copy of the root `.env` file (see [Environment Variables](#environment-variables))

### Steps

1. Clone the repository and navigate into it:

   ```bash
   git clone <repo-url> Notely-App
   cd Notely-App
   ```

2. Create the environment file from the template and set a strong JWT secret:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and replace `JWT_SECRET` with a random string of at least 32 characters. Adjust `POSTGRES_PASSWORD` and other values as needed.

3. Build and start the entire stack:

   ```bash
   docker compose up --build
   ```

   This builds all five service images and starts `mongo`, `postgres`, `redis`, then the three backend services, then the API gateway, then the frontend. Each application container waits for its dependencies to report healthy before starting.

4. Once all containers are healthy, the application is available at:

   - Frontend SPA: `http://localhost:8080`
   - API gateway: `http://localhost:3000`
   - Gateway health: `http://localhost:3000/health`
   - Aggregate health: `http://localhost:3000/health/all`
   - Swagger docs: `http://localhost:3000/api-docs`

5. To stop the stack:

   ```bash
   docker compose down
   ```

   To remove the data volumes as well:

   ```bash
   docker compose down -v
   ```

### Notes on Docker startup

- The `auth-service` and `user-service` containers verify their database connection on startup but do not run migrations automatically. Migrations are applied by the migration tooling inside each service directory (see [Database Migrations](#database-migrations)). In a fresh environment, run the migrations once before the first request.
- The `notes-service` creates its indexes via Mongoose schema definitions; no explicit migration step is required.
- The frontend nginx config resolves the `api-gateway` service name dynamically via Docker's embedded DNS so that upstream IP changes after container recreation do not break proxying.

---

## Local Development

For development without Docker for the application code, run the infrastructure containers and the services natively with `nodemon`.

### 1. Start infrastructure with Docker Compose

Bring up only the data stores:

```bash
docker compose up -d mongo postgres redis
```

Wait until all three report healthy:

```bash
docker compose ps
```

### 2. Run database migrations

Migrations must be applied before the auth and user services can function. From the repository root:

```bash
cd auth-service
npm install
npm run migrate up
cd ../user-service
npm install
npm run migrate up
cd ..
```

See [Database Migrations](#database-migrations) for details.

### 3. Start each service

Each service reads its environment from a local `.env` file. Copy the provided `.env.example` in each service directory to `.env` and adjust values for localhost connectivity.

Open a terminal per service and run:

```bash
# Terminal 1 - Auth Service (port 4001)
cd auth-service
npm install
npm run dev

# Terminal 2 - User Service (port 4002)
cd user-service
npm install
npm run dev

# Terminal 3 - Notes Service (port 4003)
cd notes-service
npm install
npm run dev

# Terminal 4 - API Gateway (port 3000)
cd api-gateway
npm install
npm run dev

# Terminal 5 - Frontend (Vite dev server, port 5173)
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:3000` (configured in `vite.config.js`). The frontend is then available at `http://localhost:5173`.

### Local environment files

Each service directory contains an `.env.example` with the required variables. The key values for local development:

- `auth-service/.env`: `PORT=4001`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REDIS_URL=redis://localhost:6379`, `DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/userdb`
- `user-service/.env`: `PORT=4002`, `DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/userdb`, `JWT_SECRET`
- `notes-service`: `MONGO_URI=mongodb://localhost:27017/notesdb`, `JWT_SECRET` (no `.env.example` provided; create one or export the variables)
- `api-gateway/.env`: `PORT=3000`, `AUTH_SERVICE_URL=http://localhost:4001`, `USER_SERVICE_URL=http://localhost:4002`, `NOTES_SERVICE_URL=http://localhost:4003`, `JWT_SECRET`

The `JWT_SECRET` must be identical across the API gateway and all backend services because the gateway verifies tokens locally and the services re-verify the same token.

---

## Database Migrations

Migrations are managed with `node-pg-migrate` and are run separately from service startup. The `initDB` function in each service only verifies the database connection; it does not create tables.

### Auth Service migrations

Creates the `auth_users` and `refresh_tokens` tables.

- `auth_users`: `id` (UUID PK), `user_id` (unique varchar), `email` (unique), `username`, `password_hash`, timestamps. Indexes on `email`, `user_id`, `username`. A trigger updates `updated_at` automatically.
- `refresh_tokens`: `id` (UUID PK), `user_id` (FK to `auth_users.id`, `ON DELETE CASCADE`), `token_hash` (unique), `expires_at`, `created_at`, `revoked_at`, `replaced_by_token_hash`, `user_agent`, `ip_address`. Indexes on `user_id`, `token_hash`, `expires_at`, `revoked_at`.

Run from the `auth-service` directory:

```bash
npm run migrate up      # apply all pending migrations
npm run migrate down    # roll back the last migration
npm run migrate:create  # create a new migration file (prompts for name)
```

### User Service migrations

Creates the `users` table.

- `users`: `id` (UUID PK), `user_id` (unique varchar), `email` (unique), `username`, `full_name`, `bio`, `avatar_url`, timestamps. Unique indexes on `user_id` and `email`, index on `username`.

Run from the `user-service` directory:

```bash
npm run migrate up
npm run migrate down
npm run migrate:create
```

### Notes Service

The notes service uses Mongoose schema definitions and does not require explicit migrations. Indexes (text index and compound indexes) are created automatically by Mongoose on connection.

---

## API Reference

All public API routes are exposed through the API gateway under the `/api/v1` prefix. The gateway forwards requests to the downstream service after authentication, validation, rate limiting, and circuit breaking.

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | none | Register a new user. Body: `{ email, username, password }`. Returns access and refresh tokens. |
| POST | `/api/v1/auth/login` | none | Authenticate. Body: `{ email, password }`. Returns access and refresh tokens. |
| POST | `/api/v1/auth/refresh` | none | Rotate refresh token. Body: `{ refreshToken }`. Detects token reuse and revokes all tokens for the user if the provided token has already been replaced. |
| POST | `/api/v1/auth/logout` | Bearer | Invalidate the current access token (blacklisted in Redis with TTL) and delete the refresh token if provided. Body: `{ refreshToken? }`. |
| GET | `/api/v1/auth/me` | Bearer | Returns the decoded user identity (`userId`, `email`, `username`) from the verified JWT. |

The auth service also exposes `GET /auth/verify` for internal gateway use; it checks the access token blacklist and verifies the token signature.

Token details:
- Access token: signed with `JWT_SECRET`, expires per `JWT_EXPIRES_IN` (default `15m` in the service config; the root `.env.example` shows `7d` as an example).
- Refresh token: signed with `JWT_SECRET`, expires per `JWT_REFRESH_EXPIRES_IN` (default `7d`), stored in Redis keyed by `refresh_token:userId` with a TTL matching the expiry.
- Refresh token rotation: each refresh issues a new refresh token and marks the old one as replaced. If a replaced token is presented again, all refresh tokens for that user are deleted (reuse detection).

### Users

All user routes require a valid Bearer token. The gateway applies the `userLimiter` (200 requests per 15 minutes keyed by `x-user-id`).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/users/profile` | Bearer | Returns the authenticated user's profile. If no profile row exists yet (first request after registration), one is auto-created from the JWT claims (bootstrapping pattern). |
| PUT | `/api/v1/users/profile` | Bearer | Update profile fields. Body: `{ fullName?, bio?, avatarUrl? }`. Uses an upsert with `COALESCE` so omitted fields retain their existing values. `avatarUrl` must be an `http`, `https`, `data`, or relative (`/`) URL. |
| DELETE | `/api/v1/users/account` | Bearer | Permanently deletes the user's profile row. |
| GET | `/api/v1/users/:userId` | Bearer | Internal lookup of any user by UUID. Returns `userId`, `username`, `fullName`, `avatarUrl`. |

### Notes

All notes routes require a valid Bearer token. The gateway applies the `userLimiter`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/notes` | Bearer | Create a note. Body: `{ title (1-200 chars), content (1-50000 chars), tags? (array of strings, max 50 chars each) }`. |
| GET | `/api/v1/notes` | Bearer | List notes with pagination and filtering. Query: `page` (default 1), `limit` (default 20), `archived` (`true`/`false`, default `false`), `pinned` (`true`/`false`). Results are sorted by `isPinned: -1, createdAt: -1`. Soft-deleted notes are excluded by default via Mongoose `pre-find` middleware. |
| GET | `/api/v1/notes/search` | Bearer | Full-text search. Query: `query` (keyword). Uses MongoDB `$text` search against the text index on `title`, `content`, and `tags`, sorted by `textScore` relevance. |
| GET | `/api/v1/notes/:id` | Bearer | Fetch a single note by ObjectId. Must belong to the authenticated user. |
| PUT | `/api/v1/notes/:id` | Bearer | Partial update of a note. Body: any of `{ title?, content?, tags?, isPinned?, isArchived? }`. |
| DELETE | `/api/v1/notes/:id` | Bearer | Soft delete. Sets `isDeleted: true` and `deletedAt` to the current timestamp. The note is excluded from default list and search results. |
| POST | `/api/v1/notes/:id/restore` | Bearer | Restore a soft-deleted note. Clears `isDeleted` and `deletedAt`. |

The `/search` route is declared before `/:id` in the router so that Express does not interpret `search` as an ObjectId parameter.

### Response format

All endpoints return JSON with the following shape:

```json
{
  "success": true,
  "data": { },
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [ { "field": "email", "message": "...", "value": "..." } ]
}
```

The `errors` array is present for validation failures. The gateway and each service include an `X-Request-ID` response header for tracing.

---

## Cross-Cutting Concerns

### Authentication and authorization

- The API gateway verifies the JWT locally using `JWT_SECRET` with `jsonwebtoken`. On success it injects `x-user-id`, `x-user-email`, and `x-user-username` headers into the proxied request.
- Each downstream service re-verifies the JWT with the same shared secret and reads the user identity from the token payload (not from the gateway headers) for authorization decisions.
- `TokenExpiredError` returns 401; `JsonWebTokenError` returns 401. Missing tokens on protected routes return 401.

### Rate limiting

The gateway applies three tiers of rate limiting using `express-rate-limit`:

- `globalLimiter`: 200 requests per 15 minutes per IP, applied to all gateway routes.
- `authLimiter`: 20 requests per 15 minutes per IP, applied to `/api/v1/auth/register` and `/api/v1/auth/login`.
- `userLimiter`: 200 requests per 15 minutes keyed by `x-user-id`, applied to authenticated user, notes, and auth logout routes. Unauthenticated requests skip this limiter.

When a limit is exceeded, the gateway returns HTTP 429 and increments the `rate_limit_exceeded` Prometheus counter.

### Circuit breaking

Each downstream service is protected by an `opossum` circuit breaker created lazily on first request and cached per service name. Options:

- `timeout`: 5000 ms
- `errorThresholdPercentage`: 50
- `resetTimeout`: 30000 ms
- `rollingCountTimeout`: 10000 ms
- `rollingCountBuckets`: 10

When the circuit is open, the gateway returns HTTP 503 `SERVICE_UNAVAILABLE` from the fallback handler. Breaker state transitions (`open`, `close`, `halfOpen`) update the `circuit_breaker_state` Prometheus gauge.

### Retry and backoff

The gateway proxies upstream requests with `fetchWithRetry`:

- Maximum of 2 retry attempts after the initial request.
- Exponential backoff: `100 * 2^attempt` ms, capped at 1000 ms.
- Request timeout: 5000 ms per attempt.
- Retries are attempted on network errors and 5xx responses.

### Request validation

The gateway uses `express-validator` to validate request bodies, params, and queries before proxying. Validation failures return HTTP 400 with a detailed `errors` array. Each downstream service also performs its own validation.

### Request ID tracing

The `requestIdMiddleware` generates or propagates an `X-Request-ID` header. The ID is attached to all log entries and returned in the response header for end-to-end tracing across the gateway and downstream services.

### Compression and CORS

- `compression` middleware enables gzip responses on all services.
- CORS is configured with `credentials: true`, allowed methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`, allowed headers including `Content-Type`, `Authorization`, `X-Request-ID`, and a 24-hour preflight cache. The default allowed origin is `http://localhost:5173` (overridable via `CORS_ORIGIN`).

---

## Observability

### Health checks

| Endpoint | Scope | Behavior |
|---|---|---|
| `GET /health` | Each service | Returns `{ service, status: "healthy", timestamp }`. The gateway response also includes the configured upstream URLs. |
| `GET /health/all` | Gateway only | Pings all three downstream services and returns an aggregate status. Responds 200 if all upstreams are healthy, 503 if any are unreachable. |
| `GET /` | Gateway | Returns an HTML landing page with links to health and API docs. |

Docker Compose healthchecks use `wget --spider` against each service's `/health` endpoint. The frontend nginx proxies `/health` and `/health/all` to the gateway.

### Prometheus metrics

Every service exposes `GET /metrics` (Prometheus text format) and `GET /metrics/json` (JSON). The gateway uses the `gateway_` prefix for default metrics; backend services use their own prefixes.

Gateway custom metrics:

- `http_requests_total` - total HTTP requests by method, route, status
- `http_request_duration_seconds` - request latency histogram
- `http_request_size_bytes`, `http_response_size_bytes` - request/response size histograms
- `active_connections` - current in-flight connections gauge
- `upstream_requests_total` - proxied requests by service, method, status
- `upstream_request_duration_seconds` - upstream latency histogram
- `circuit_breaker_state` - breaker state gauge per service (0 closed, 1 open, 2 halfOpen)
- `rate_limit_exceeded_total` - rate limit hits by limiter type
- `auth_failures_total` - authentication failure counter

Backend services expose equivalent request metrics via their own `metricsMiddleware`.

### Swagger / OpenAPI docs

Each service generates an OpenAPI 3.0.3 spec with `swagger-jsdoc` from JSDoc annotations and serves interactive docs with `swagger-ui-express`:

- Gateway: `http://localhost:3000/api-docs`
- Auth service: `http://localhost:4001/api-docs`
- User service: `http://localhost:4002/api-docs`
- Notes service: `http://localhost:4003/api-docs`

Each service also exposes the raw spec at `/api-docs.json`.

### Logging

All services use `winston` with `morgan` (combined format) piped into the logger. Every log entry includes the request ID for correlation. Log level is controlled by `LOG_LEVEL` (default `info`).

---

## Testing

Each backend service has a Jest test suite using `supertest`. The gateway has an integration test suite in the root `tests/` directory.

### Run all backend tests

From the repository root:

```bash
cd api-gateway && npm install && npm test
cd ../auth-service && npm install && npm test
cd ../user-service && npm install && npm test
cd ../notes-service && npm install && npm test
```

The test command in each service is `jest --forceExit --detectOpenHandles`. Tests are located in the `tests/` directory of each service:

- `api-gateway/tests/gateway.test.js` (also referenced from the root `tests/` directory)
- `auth-service/tests/auth.test.js`
- `user-service/tests/user.test.js`
- `notes-service/tests/notes.test.js`

### Frontend build verification

The frontend does not have a unit test suite. Verify it builds successfully:

```bash
cd frontend
npm install
npm run build
```

The production build output is served by nginx in the Docker image. To preview the build locally:

```bash
npm run preview
```

### Running tests against local infrastructure

Backend tests that hit a database require the infrastructure containers to be running. Start them with:

```bash
docker compose up -d mongo postgres redis
```

Ensure migrations have been applied (see [Database Migrations](#database-migrations)) before running the auth and user service tests.

---

## Environment Variables

### Root `.env` (used by Docker Compose)

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | (none, required) | Shared secret for JWT signing and verification. Must be at least 32 characters in production. |
| `JWT_EXPIRES_IN` | `7d` | Access token expiry. The auth service config defaults to `15m` if unset. |
| `POSTGRES_DB` | `userdb` | PostgreSQL database name. |
| `POSTGRES_USER` | `postgres` | PostgreSQL user. |
| `POSTGRES_PASSWORD` | `postgres123` | PostgreSQL password. Change in production. |
| `AUTH_SERVICE_URL` | `http://auth-service:4001` | Auth service URL (Docker network). |
| `USER_SERVICE_URL` | `http://user-service:4002` | User service URL (Docker network). |
| `NOTES_SERVICE_URL` | `http://notes-service:4003` | Notes service URL (Docker network). |
| `MONGO_URI` | `mongodb://mongo:27017/notesdb` | MongoDB connection URI. |
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL. |

### Per-service environment

Each service directory contains an `.env.example` with the variables it reads. The `JWT_SECRET` must be consistent across the gateway and all backend services. Service-specific variables:

- `auth-service`: `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `REDIS_URL`, `DATABASE_URL`, `LOG_LEVEL`, `NODE_ENV`
- `user-service`: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `LOG_LEVEL`, `NODE_ENV`
- `notes-service`: `PORT`, `MONGO_URI`, `JWT_SECRET`, `LOG_LEVEL`, `NODE_ENV`
- `api-gateway`: `PORT`, `AUTH_SERVICE_URL`, `USER_SERVICE_URL`, `NOTES_SERVICE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `LOG_LEVEL`, `NODE_ENV`

---

## License

This project is licensed under the terms in the `LICENSE` file.