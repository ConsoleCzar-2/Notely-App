# Notely App

Notely is a microservices notes platform with a React/Vite frontend, an API gateway, and three backend services for auth, user profiles, and notes.

## Architecture

```text
Browser
  └─ Frontend (:8080) → API Gateway (:3000)
                          ├─ Auth Service (:4001) → Redis
                          ├─ User Service (:4002) → PostgreSQL
                          └─ Notes Service (:4003) → MongoDB
```

## Services

| Service | Port | Stack | Responsibility |
|---|---:|---|---|
| **Frontend** | 8080 | React + Vite | UI, session state, API proxy target |
| **API Gateway** | 3000 | Node + Express | Routing, auth verification, rate limiting, health checks |
| **Auth Service** | 4001 | Node + Express | Login, register, logout, token handling |
| **User Service** | 4002 | Node + Express | Profile CRUD |
| **Notes Service** | 4003 | Node + Express + MongoDB | Notes CRUD, pinning, archiving, search |

## Frameworks and Tools by Layer

### Frontend Layer (Port 8080)

- **React**: component-based UI rendering and state-driven interactions.
- **Vite**: fast local development server and production bundling.
- **Nginx**: serves static frontend assets and proxies `/api` and health routes to the gateway.

### API Gateway Layer (Port 3000)

- **Node.js + Express**: single ingress service and route orchestration.
- **node-fetch**: forwards requests to downstream microservices.
- **express-rate-limit**: protects endpoints from bursts/abuse.
- **Morgan + Winston**: request logging and structured service logs.
- **Gateway auth middleware**: verifies JWT and forwards user context headers.

### Auth Service Layer (Port 4001)

- **Node.js + Express**: authentication endpoints.
- **jsonwebtoken**: token generation and verification.
- **bcryptjs**: password hashing and password checks.
- **ioredis + Redis**: token blacklist storage for logout/session invalidation.
- **uuid**: stable user id generation during registration.
- **In-memory credential store (`Map`)**: lightweight credential persistence in current implementation.

### User Service Layer (Port 4002)

- **Node.js + Express**: profile APIs.
- **pg (node-postgres) + PostgreSQL**: persistent user profile storage.
- **SQL upsert pattern**: create-or-update profile records in a single operation.

### Notes Service Layer (Port 4003)

- **Node.js + Express**: notes APIs.
- **Mongoose + MongoDB**: document schema/modeling and persistence.
- **MongoDB text indexes**: keyword search across title/content/tags.

### Infrastructure and Testing

- **Docker Compose**: orchestrates all containers and internal networking.
- **MongoDB/PostgreSQL/Redis containers**: data stores for notes, profiles, and auth token state.
- **Jest + Supertest**: backend API and integration tests.
- **Nodemon**: automatic restart for local backend development.

## Getting Started

### Docker

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:8080
- API Gateway: http://localhost:3000
- Gateway health: http://localhost:3000/health
- Full health: http://localhost:3000/health/all

### Local development

Start the backing stores first, then each service in its own folder:

```bash
# infrastructure
docker run -d -p 27017:27017 mongo:7
docker run -d -p 5432:5432 -e POSTGRES_DB=userdb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres123 postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine

# services
cd auth-service && npm install && npm run dev
cd user-service && npm install && npm run dev
cd notes-service && npm install && npm run dev
cd api-gateway && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## API Summary

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users

- `GET /api/users/profile`
- `PUT /api/users/profile`
- `DELETE /api/users/account`

### Notes

- `POST /api/notes`
- `GET /api/notes`
- `GET /api/notes/:id`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`
- `GET /api/notes/search`

## Tests

Run Jest in each backend service:

```bash
cd auth-service && npm test
cd user-service && npm test
cd notes-service && npm test
cd api-gateway && npm test
```

The frontend has a build step instead of a dedicated test suite:

```bash
cd frontend && npm run build
```

## Environment Variables

Each service has its own `.env.example`. Copy the file to `.env` and set values for local development or deployment.