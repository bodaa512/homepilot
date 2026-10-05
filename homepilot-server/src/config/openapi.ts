export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'HomePilot API',
    version: '1.0.0',
    description:
      'The digital operating system for your home — home, asset, maintenance, expense, service-marketplace, and property management API.',
  },
  servers: [{ url: '/api', description: 'Current server' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth' },
    { name: 'Homes' },
    { name: 'Assets' },
    { name: 'Maintenance' },
    { name: 'Documents' },
    { name: 'Expenses' },
    { name: 'Subscriptions' },
    { name: 'Service Marketplace' },
    { name: 'AI' },
    { name: 'Properties' },
    { name: 'Payments' },
    { name: 'Admin' },
    { name: 'Achievements' },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new account',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password'],
                properties: {
                  fullName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Account created' }, '409': { description: 'Email already exists' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Logged in' }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Get my account (name, phone, plan, email status)', responses: { '200': { description: 'OK' } } },
      patch: {
        tags: ['Auth'],
        summary: 'Update my name and/or phone (an empty phone clears it)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', properties: { fullName: { type: 'string' }, phone: { type: 'string' } } },
            },
          },
        },
        responses: { '200': { description: 'Updated' }, '400': { description: 'Validation failed' } },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change my password (returns a fresh access token and rotates the refresh cookie)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Changed' }, '401': { description: 'Current password is incorrect' } },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Email me a new verification link (no-op if already verified)',
        responses: { '200': { description: 'Sent / already verified' }, '429': { description: 'Too many requests' } },
      },
    },
    '/homes': {
      get: { tags: ['Homes'], summary: 'List the homes I am a member of', responses: { '200': { description: 'OK' } } },
      post: {
        tags: ['Homes'],
        summary: 'Create a home',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type'],
                properties: { name: { type: 'string' }, type: { type: 'string' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' }, '400': { description: 'Plan home limit reached' } },
      },
    },
    '/homes/{homeId}': {
      get: {
        tags: ['Homes'],
        summary: 'Get a home by ID',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not a member of this home' } },
      },
    },
    '/homes/{homeId}/health-score': {
      get: {
        tags: ['Homes'],
        summary: 'Compute the transparent 0-100 Home Health Score',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/homes/{homeId}/calendar': {
      get: {
        tags: ['Homes'],
        summary: 'Unified calendar: maintenance, appointments, subscription renewals, warranty expirations',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/homes/{homeId}/memory': {
      get: {
        tags: ['Homes'],
        summary: "Home Memory — the home's narrative timeline",
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/homes/{homeId}/assets': {
      get: {
        tags: ['Assets'],
        summary: 'List assets for a home',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Assets'],
        summary: 'Register a new asset',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/homes/{homeId}/maintenance': {
      get: {
        tags: ['Maintenance'],
        summary: 'List maintenance tasks',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Maintenance'],
        summary: 'Create a one-time or recurring maintenance task',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/maintenance/{taskId}/complete': {
      patch: {
        tags: ['Maintenance'],
        summary: 'Mark a task complete (auto-schedules the next occurrence if recurring)',
        parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/homes/{homeId}/documents': {
      get: {
        tags: ['Documents'],
        summary: 'List documents for a home',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Documents'],
        summary: 'Upload a document (runs OCR automatically for images)',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' }, type: { type: 'string' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Uploaded' }, '400': { description: 'Disallowed file type or too large' } },
      },
    },
    '/documents/{documentId}/download': {
      get: {
        tags: ['Documents'],
        summary: 'Download a document (or redirect to Cloudinary URL if cloud storage is configured)',
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'File stream' }, '404': { description: 'Not found or not authorized' } },
      },
    },
    '/homes/{homeId}/expenses/analytics': {
      get: {
        tags: ['Expenses'],
        summary: 'Monthly/yearly totals and category breakdown',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/homes/{homeId}/subscriptions': {
      get: {
        tags: ['Subscriptions'],
        summary: 'List subscriptions and total annualized cost',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/homes/{homeId}/service-requests': {
      post: {
        tags: ['Service Marketplace'],
        summary: 'Create a service request',
        parameters: [{ name: 'homeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/service-requests/{requestId}/offers': {
      post: {
        tags: ['Service Marketplace'],
        summary: 'Submit an offer as a provider',
        parameters: [{ name: 'requestId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/offers/{offerId}/accept': {
      patch: {
        tags: ['Service Marketplace'],
        summary: 'Accept an offer (auto-schedules an appointment)',
        parameters: [{ name: 'offerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/ai/chat': {
      post: {
        tags: ['AI'],
        summary: "Ask the AI assistant about a specific home's data",
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['homeId', 'message'],
                properties: { homeId: { type: 'string' }, message: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' }, '502': { description: 'AI provider not configured or errored' } },
      },
    },
    '/ai/repair-vs-replace': {
      post: {
        tags: ['AI'],
        summary: 'Deterministic repair-vs-replace economics calculator (no AI call)',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/properties': {
      get: { tags: ['Properties'], summary: 'List properties I manage', responses: { '200': { description: 'OK' } } },
      post: { tags: ['Properties'], summary: 'Create a property', responses: { '201': { description: 'Created' } } },
    },
    '/payments/plans': {
      get: { tags: ['Payments'], summary: 'List billing plans', security: [], responses: { '200': { description: 'OK' } } },
    },
    '/payments/checkout': {
      post: {
        tags: ['Payments'],
        summary: 'Create a Stripe Checkout session for a paid plan',
        responses: { '200': { description: 'OK' }, '402': { description: 'Stripe not configured' } },
      },
    },
    '/admin/analytics': {
      get: {
        tags: ['Admin'],
        summary: 'Platform-wide analytics (platform_admin only)',
        responses: { '200': { description: 'OK' }, '403': { description: 'Not a platform admin' } },
      },
    },
    '/achievements': {
      get: { tags: ['Achievements'], summary: 'List my unlocked achievements', responses: { '200': { description: 'OK' } } },
    },
  },
};
