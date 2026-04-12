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
| Frontend | 8080 | React + Vite | UI, session state, API proxy target |
| API Gateway | 3000 | Node + Express | Routing, auth verification, rate limiting, health checks |
| Auth Service | 4001 | Node + Express | Login, register, logout, token handling |
| User Service | 4002 | Node + Express | Profile CRUD |
| Notes Service | 4003 | Node + Express + MongoDB | Notes CRUD, pinning, archiving, search |

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