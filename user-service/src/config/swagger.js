/**
 * Swagger/OpenAPI Configuration for User Service
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Notely User Service',
      version: '1.0.0',
      description: `
        User Profile Management Microservice for Notely.
        Handles user profiles, preferences, and account management.
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
        url: 'http://localhost:4002',
        description: 'Development server',
      },
      {
        url: 'https://api.notely.app/users',
        description: 'Production server (via API Gateway)',
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
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            userId: { type: 'string', example: 'usr_abc123' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            username: { type: 'string', example: 'johndoe' },
            fullName: { type: 'string', example: 'John Doe' },
            bio: { type: 'string', example: 'Software developer' },
            avatarUrl: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UserProfileResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/User' },
          },
        },
        UserListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 100 },
                totalPages: { type: 'integer', example: 5 },
              },
            },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            fullName: { type: 'string', maxLength: 255, example: 'John Doe' },
            bio: { type: 'string', maxLength: 1000, example: 'Software developer' },
            avatarUrl: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            service: { type: 'string', example: 'user-service' },
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
      { name: 'Users', description: 'User profile management' },
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
    customSiteTitle: 'Notely User Service - API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  },
};