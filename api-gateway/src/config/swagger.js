/**
 * Swagger/OpenAPI Configuration for API Gateway
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Notely API Gateway',
      version: '1.0.0',
      description: `
        API Gateway for the Notely microservices architecture.
        This gateway routes requests to the appropriate backend services:
        - **Auth Service**: Authentication and authorization
        - **User Service**: User profile management
        - **Notes Service**: Notes CRUD operations
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
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.notely.app',
        description: 'Production server',
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
        HealthCheck: {
          type: 'object',
          properties: {
            service: { type: 'string', example: 'api-gateway' },
            status: { type: 'string', enum: ['healthy', 'unhealthy'], example: 'healthy' },
            timestamp: { type: 'string', format: 'date-time' },
            upstreams: {
              type: 'object',
              properties: {
                auth: { type: 'string', example: 'http://localhost:4001' },
                user: { type: 'string', example: 'http://localhost:4002' },
                notes: { type: 'string', example: 'http://localhost:4003' },
              },
            },
          },
        },
        Note: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '65a1f0c2e4b0a1b2c3d4e5f6' },
            title: { type: 'string', example: 'My first note' },
            content: { type: 'string', example: 'This is the note body.' },
            tags: { type: 'array', items: { type: 'string' }, example: ['work', 'ideas'] },
            isPinned: { type: 'boolean', example: false },
            isArchived: { type: 'boolean', example: false },
            userId: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
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
      { name: 'Auth', description: 'Authentication endpoints (proxied to Auth Service)' },
      { name: 'Users', description: 'User management endpoints (proxied to User Service)' },
      { name: 'Notes', description: 'Notes management endpoints (proxied to Notes Service)' },
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
    customSiteTitle: 'Notely API Gateway - API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  },
};