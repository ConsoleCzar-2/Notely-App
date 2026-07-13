/**
 * Swagger/OpenAPI Configuration for Auth Service
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Notely Auth Service',
      version: '1.0.0',
      description: `
        Authentication microservice for the Notely application.
        Handles user registration, login, token management, and authentication.
      `,
      contact: {
        name: 'Notely Team',
        email: 'support@notely.app',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:4001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['email', 'username', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            username: { type: 'string', minLength: 3, maxLength: 30, example: 'johndoe' },
            password: { type: 'string', minLength: 8, maxLength: 128, example: 'securePassword123' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', example: 'securePassword123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', example: 'usr_abc123' },
                    email: { type: 'string', format: 'email' },
                    username: { type: 'string' },
                  },
                },
                accessToken: { type: 'string', description: 'JWT access token (15 min expiry)' },
                refreshToken: { type: 'string', description: 'Refresh token (7 day expiry)' },
              },
            },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', description: 'Refresh token from login response' },
          },
        },
        TokenResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Token refreshed successfully' },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string', description: 'New JWT access token' },
                refreshToken: { type: 'string', description: 'New refresh token (rotated)' },
              },
            },
          },
        },
        VerifyTokenRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', description: 'JWT token to verify' },
          },
        },
        VerifyTokenResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Token is valid' },
            data: {
              type: 'object',
              properties: {
                valid: { type: 'boolean', example: true },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    username: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        LogoutRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', description: 'Refresh token to revoke' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
            requestId: { type: 'string', format: 'uuid' },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            service: { type: 'string', example: 'auth-service' },
            status: { type: 'string', enum: ['healthy', 'unhealthy'], example: 'healthy' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Metrics', description: 'Prometheus metrics endpoints' },
    ],
  },
  apis: ['./src/routes/*.js', './src/index.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions: {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Notely Auth Service - API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  },
};