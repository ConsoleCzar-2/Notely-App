/**
 * Swagger/OpenAPI Configuration for Notes Service
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Notely Notes Service',
      version: '1.0.0',
      description: `
        Notes CRUD Microservice for Notely.
        Handles note creation, retrieval, updating, deletion, archiving, pinning, and search.
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
        url: 'http://localhost:4003',
        description: 'Development server',
      },
      {
        url: 'https://api.notely.app/notes',
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
        Note: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            userId: { type: 'string', example: 'usr_abc123' },
            title: { type: 'string', example: 'My Note Title' },
            content: { type: 'string', example: 'This is the note content with **markdown** support.' },
            tags: { type: 'array', items: { type: 'string' }, example: ['work', 'important'] },
            isPinned: { type: 'boolean', example: false },
            isArchived: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateNoteRequest: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200, example: 'My Note Title' },
            content: { type: 'string', maxLength: 50000, example: 'Note content here...' },
            tags: { type: 'array', items: { type: 'string' }, example: ['work', 'personal'] },
          },
        },
        UpdateNoteRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200, example: 'Updated Title' },
            content: { type: 'string', maxLength: 50000, example: 'Updated content...' },
            tags: { type: 'array', items: { type: 'string' }, example: ['updated', 'tags'] },
            isPinned: { type: 'boolean', example: true },
            isArchived: { type: 'boolean', example: false },
          },
        },
        NoteResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Note created successfully' },
            data: { $ref: '#/components/schemas/Note' },
          },
        },
        NotesListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Note' },
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
        SearchNotesRequest: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query', example: 'meeting notes' },
            tags: { type: 'string', description: 'Comma-separated tags', example: 'work,meeting' },
            isPinned: { type: 'boolean', example: false },
            isArchived: { type: 'boolean', example: false },
            page: { type: 'integer', minimum: 1, default: 1, example: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, example: 20 },
            sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'title'], default: 'updatedAt', example: 'updatedAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc', example: 'desc' },
          },
        },
        BulkActionRequest: {
          type: 'object',
          required: ['noteIds', 'action'],
          properties: {
            noteIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 1,
              maxItems: 50,
              example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
            },
            action: { type: 'string', enum: ['archive', 'unarchive', 'pin', 'unpin', 'delete'], example: 'archive' },
          },
        },
        BulkActionResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Bulk action completed' },
            data: {
              type: 'object',
              properties: {
                modifiedCount: { type: 'integer', example: 2 },
                failedIds: { type: 'array', items: { type: 'string' }, example: [] },
              },
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            service: { type: 'string', example: 'notes-service' },
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
      { name: 'Notes', description: 'Notes CRUD operations' },
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
    customSiteTitle: 'Notely Notes Service - API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  },
};