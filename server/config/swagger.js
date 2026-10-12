/**
 * Static OpenAPI 3.0 spec for the LMS API, served via swagger-ui-express.
 * Kept as plain data (not JSDoc-scanned) so it's fast to maintain and
 * guaranteed to match the actual route tables in routes/*.js.
 */
const bearerAuth = { bearerAuth: [] };

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Leave Management System API',
    version: '1.0.0',
    description:
      'REST API for the LMS (employee / manager / HR verticals). All routes ' +
      'except /auth/register and /auth/login require a Bearer JWT.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { success: { type: 'boolean' }, message: { type: 'string' } },
      },
    },
  },
  tags: [
    { name: 'Auth' },
    { name: 'Leaves (Employee)' },
    { name: 'Manager' },
    { name: 'Users (HR)' },
    { name: 'Leave Types (HR)' },
    { name: 'Reports (HR)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Auth'],
        summary: 'Health check',
        responses: { 200: { description: 'API is running' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 201: { description: 'Created' }, 400: { description: 'Validation error' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in, receive a JWT',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { 200: { description: 'OK, returns token' }, 401: { description: 'Invalid credentials' } },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: "Current user's profile", security: [bearerAuth], responses: { 200: { description: 'OK' } } },
    },
    '/leaves': {
      post: { tags: ['Leaves (Employee)'], summary: 'Apply for leave', security: [bearerAuth], responses: { 201: { description: 'Created' } } },
    },
    '/leaves/me': {
      get: { tags: ['Leaves (Employee)'], summary: 'My leave requests', security: [bearerAuth], responses: { 200: { description: 'OK' } } },
    },
    '/leaves/me/balances': {
      get: { tags: ['Leaves (Employee)'], summary: 'My leave balances', security: [bearerAuth], responses: { 200: { description: 'OK' } } },
    },
    '/leaves/{id}/cancel': {
      patch: {
        tags: ['Leaves (Employee)'], summary: 'Cancel my pending request', security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/manager/team': {
      get: { tags: ['Manager'], summary: "My team's leave requests", security: [bearerAuth], responses: { 200: { description: 'OK' } } },
    },
    '/manager/leaves/{id}/approve': {
      patch: {
        tags: ['Manager'], summary: 'Approve a pending request', security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/manager/leaves/{id}/reject': {
      patch: {
        tags: ['Manager'], summary: 'Reject a pending request (comment required)', security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/users': {
      get: { tags: ['Users (HR)'], summary: 'List users', security: [bearerAuth], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Users (HR)'], summary: 'Create user', security: [bearerAuth], responses: { 201: { description: 'Created' } } },
    },
    '/users/managers': {
      get: { tags: ['Users (HR)'], summary: 'List managers/HR (for dropdowns)', security: [bearerAuth], responses: { 200: { description: 'OK' } } },
    },
    '/users/{id}': {
      get: { tags: ['Users (HR)'], summary: 'Get one user', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      put: { tags: ['Users (HR)'], summary: 'Edit a user', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/users/{id}/status': {
      patch: { tags: ['Users (HR)'], summary: 'Activate / deactivate user', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/users/{id}/password': {
      patch: { tags: ['Users (HR)'], summary: 'Reset user password', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/users/{id}/balances': {
      get: { tags: ['Users (HR)'], summary: "User's leave balances", security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/users/{id}/balances/initialize': {
      post: { tags: ['Users (HR)'], summary: 'Create missing balances for a user', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/users/{id}/balances/{leaveTypeId}': {
      put: {
        tags: ['Users (HR)'], summary: 'Set total days for one leave type', security: [bearerAuth],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'leaveTypeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/leave-types': {
      get: { tags: ['Leave Types (HR)'], summary: 'List leave types', security: [bearerAuth], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Leave Types (HR)'], summary: 'Create a leave type', security: [bearerAuth], responses: { 201: { description: 'Created' } } },
    },
    '/leave-types/{id}': {
      get: { tags: ['Leave Types (HR)'], summary: 'Get one leave type', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      put: { tags: ['Leave Types (HR)'], summary: 'Update leave type / quota', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { tags: ['Leave Types (HR)'], summary: 'Delete an unused leave type', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/leave-types/{id}/allocate': {
      post: { tags: ['Leave Types (HR)'], summary: 'Allocate this leave type to all users', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/leave-types/reset-balances': {
      post: { tags: ['Leave Types (HR)'], summary: 'Year-end balance reset', security: [bearerAuth], responses: { 200: { description: 'OK' } } },
    },
    '/reports/summary': {
      get: { tags: ['Reports (HR)'], summary: 'Headline numbers', security: [bearerAuth], responses: { 200: { description: 'OK' } } },
    },
    '/reports/by-leave-type': {
      get: { tags: ['Reports (HR)'], summary: 'Breakdown per leave type', security: [bearerAuth], responses: { 200: { description: 'OK' } } },
    },
    '/reports/by-department': {
      get: { tags: ['Reports (HR)'], summary: 'Breakdown per department', security: [bearerAuth], responses: { 200: { description: 'OK' } } },
    },
    '/reports/monthly': {
      get: {
        tags: ['Reports (HR)'], summary: 'Approved days per month', security: [bearerAuth],
        parameters: [{ name: 'year', in: 'query', schema: { type: 'integer' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/reports/requests': {
      get: {
        tags: ['Reports (HR)'], summary: 'All requests (filterable)', security: [bearerAuth],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'leaveType', in: 'query', schema: { type: 'string' } },
          { name: 'employee', in: 'query', schema: { type: 'string' } },
          { name: 'department', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/reports/requests/export': {
      get: { tags: ['Reports (HR)'], summary: 'Same as /reports/requests, as CSV', security: [bearerAuth], responses: { 200: { description: 'CSV file' } } },
    },
    '/reports/audit-logs': {
      get: {
        tags: ['Reports (HR)'], summary: 'Audit trail', security: [bearerAuth],
        parameters: [
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'performedBy', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
  },
};

module.exports = swaggerSpec;
