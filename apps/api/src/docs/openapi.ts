/**
 * OpenAPI Specification for Loa Constructs API
 * @see sprint.md T12.3: Documentation
 */

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Loa Constructs API',
    version: '1.0.0',
    description: `
The Loa Constructs API allows you to manage AI agent constructs, subscriptions, and teams.

## Authentication

Most endpoints require authentication via Bearer token (JWT) or API key.

**JWT Authentication:**
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

**API Key Authentication:**
\`\`\`
Authorization: Bearer sk_<api_key>
\`\`\`

## Rate Limiting

Rate limits are tier-based:
- **Free**: 100 req/min
- **Pro**: 300 req/min
- **Team**: 500 req/min
- **Enterprise**: 1000 req/min

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests per window
- \`X-RateLimit-Remaining\`: Remaining requests
- \`X-RateLimit-Reset\`: Unix timestamp when limit resets
    `,
    contact: {
      name: 'Loa Constructs Support',
      email: 'support@constructs.network',
      url: 'https://constructs.network',
    },
    license: {
      name: 'Proprietary',
      url: 'https://constructs.network/terms',
    },
  },
  servers: [
    {
      url: 'https://api.constructs.network',
      description: 'Production',
    },
    {
      url: 'https://api-staging.constructs.network',
      description: 'Staging',
    },
    {
      url: 'http://localhost:3001',
      description: 'Development',
    },
  ],
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'OAuth', description: 'OAuth provider authentication' },
    { name: 'Skills', description: 'Skill management endpoints' },
    { name: 'Teams', description: 'Team management endpoints' },
    { name: 'Subscriptions', description: 'Subscription management' },
    { name: 'Analytics', description: 'Usage analytics' },
    { name: 'Audit', description: 'Audit log endpoints' },
    { name: 'Creator', description: 'Skill creator endpoints' },
    { name: 'Constructs', description: 'Melange Protocol construct registry' },
  ],
  paths: {
    // Health
    '/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the API health status',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: '1.0.0' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // Auth
    '/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        description: 'Create a new user account with email and password',
        operationId: 'register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '409': { $ref: '#/components/responses/Conflict' },
          '422': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'User login',
        description: 'Authenticate with email and password',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh tokens',
        description: 'Get new access token using refresh token',
        operationId: 'refreshToken',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tokens refreshed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Invalidate current session',
        operationId: 'logout',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset',
        description: 'Send password reset email',
        operationId: 'forgotPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Reset email sent (if account exists)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password',
        description: 'Reset password using token from email',
        operationId: 'resetPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/v1/auth/verify': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email',
        description: 'Verify email using token from email',
        operationId: 'verifyEmail',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email verified',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Get authenticated user profile',
        operationId: 'getCurrentUser',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // OAuth
    '/v1/auth/oauth/github': {
      get: {
        tags: ['OAuth'],
        summary: 'GitHub OAuth',
        description: 'Start GitHub OAuth flow',
        operationId: 'githubOAuth',
        responses: {
          '302': { description: 'Redirect to GitHub' },
        },
      },
    },
    '/v1/auth/oauth/google': {
      get: {
        tags: ['OAuth'],
        summary: 'Google OAuth',
        description: 'Start Google OAuth flow',
        operationId: 'googleOAuth',
        responses: {
          '302': { description: 'Redirect to Google' },
        },
      },
    },

    // Skills
    '/v1/skills': {
      get: {
        tags: ['Skills'],
        summary: 'List skills',
        description: 'Browse available skills with filtering and pagination',
        operationId: 'listSkills',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/SearchQuery' },
          { $ref: '#/components/parameters/Category' },
          { $ref: '#/components/parameters/Tier' },
          { $ref: '#/components/parameters/Tags' },
          { $ref: '#/components/parameters/Sort' },
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/Offset' },
        ],
        responses: {
          '200': {
            description: 'Skills list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SkillsListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Skills', 'Creator'],
        summary: 'Create skill',
        description: 'Publish a new skill (creator only)',
        operationId: 'createSkill',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSkillRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Skill created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SkillResponse' },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/v1/skills/{slug}': {
      get: {
        tags: ['Skills'],
        summary: 'Get skill',
        description: 'Get skill details by slug',
        operationId: 'getSkill',
        parameters: [{ $ref: '#/components/parameters/SkillSlug' }],
        responses: {
          '200': {
            description: 'Skill details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SkillResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/v1/skills/{slug}/versions': {
      get: {
        tags: ['Skills'],
        summary: 'List versions',
        description: 'Get all versions of a skill',
        operationId: 'listSkillVersions',
        parameters: [{ $ref: '#/components/parameters/SkillSlug' }],
        responses: {
          '200': {
            description: 'Version list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VersionsListResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Skills', 'Creator'],
        summary: 'Publish version',
        description: 'Publish a new version of a skill',
        operationId: 'publishVersion',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/SkillSlug' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PublishVersionRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Version published',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VersionResponse' },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/v1/skills/{slug}/download': {
      get: {
        tags: ['Skills'],
        summary: 'Download skill',
        description: 'Download skill files with license',
        operationId: 'downloadSkill',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/SkillSlug' },
          {
            name: 'version',
            in: 'query',
            description: 'Version to download (defaults to latest)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Download details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DownloadResponse' },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/v1/skills/{slug}/validate': {
      get: {
        tags: ['Skills'],
        summary: 'Validate license',
        description: 'Validate a skill license token',
        operationId: 'validateLicense',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/SkillSlug' }],
        responses: {
          '200': {
            description: 'License validation result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LicenseValidationResponse' },
              },
            },
          },
        },
      },
    },

    // Teams
    '/v1/teams': {
      get: {
        tags: ['Teams'],
        summary: 'List teams',
        description: 'Get all teams the user is a member of',
        operationId: 'listTeams',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Teams list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TeamsListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Teams'],
        summary: 'Create team',
        description: 'Create a new team',
        operationId: 'createTeam',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTeamRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Team created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TeamResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/teams/{teamId}': {
      get: {
        tags: ['Teams'],
        summary: 'Get team',
        description: 'Get team details with members',
        operationId: 'getTeam',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/TeamId' }],
        responses: {
          '200': {
            description: 'Team details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TeamDetailResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Teams'],
        summary: 'Update team',
        description: 'Update team details (admin only)',
        operationId: 'updateTeam',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/TeamId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateTeamRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Team updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TeamResponse' },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Teams'],
        summary: 'Delete team',
        description: 'Delete a team (owner only)',
        operationId: 'deleteTeam',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/TeamId' }],
        responses: {
          '200': {
            description: 'Team deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/v1/teams/{teamId}/invitations': {
      get: {
        tags: ['Teams'],
        summary: 'List invitations',
        description: 'List pending team invitations (admin only)',
        operationId: 'listInvitations',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/TeamId' }],
        responses: {
          '200': {
            description: 'Invitations list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InvitationsListResponse' },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Teams'],
        summary: 'Invite member',
        description: 'Send team invitation (admin only)',
        operationId: 'inviteMember',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/TeamId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InviteMemberRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Invitation sent',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InvitationResponse' },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },

    // Subscriptions
    '/v1/subscriptions/checkout': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Create checkout',
        description: 'Create Stripe checkout session',
        operationId: 'createCheckout',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckoutRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Checkout session created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CheckoutResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/subscriptions/portal': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Billing portal',
        description: 'Create Stripe billing portal session',
        operationId: 'createPortal',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Portal session created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PortalResponse' },
              },
            },
          },
        },
      },
    },

    // Analytics
    '/v1/users/me/usage': {
      get: {
        tags: ['Analytics'],
        summary: 'Get usage stats',
        description: 'Get current user usage statistics',
        operationId: 'getUserUsage',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Usage statistics',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UsageResponse' },
              },
            },
          },
        },
      },
    },

    // Audit
    '/v1/audit/me': {
      get: {
        tags: ['Audit'],
        summary: 'Get audit logs',
        description: 'Get audit logs for current user',
        operationId: 'getMyAuditLogs',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/Offset' },
          { $ref: '#/components/parameters/StartDate' },
          { $ref: '#/components/parameters/EndDate' },
        ],
        responses: {
          '200': {
            description: 'Audit logs',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuditLogsResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/audit/teams/{teamId}': {
      get: {
        tags: ['Audit'],
        summary: 'Get team audit logs',
        description: 'Get audit logs for a team (admin only)',
        operationId: 'getTeamAuditLogs',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/TeamId' },
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/Offset' },
        ],
        responses: {
          '200': {
            description: 'Team audit logs',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuditLogsResponse' },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // Constructs (Melange Protocol)
    '/v1/constructs': {
      get: {
        tags: ['Constructs'],
        summary: 'List all constructs',
        description: 'Get the complete registry of Loa-powered Constructs for Melange Protocol',
        operationId: 'listConstructs',
        responses: {
          '200': {
            description: 'Constructs registry',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ConstructsRegistry' },
              },
            },
          },
        },
      },
    },
    '/v1/constructs/operator-map': {
      get: {
        tags: ['Constructs'],
        summary: 'Get operator map',
        description: 'Get Discord operator ID mapping for melange-notify.yml workflow',
        operationId: 'getOperatorMap',
        responses: {
          '200': {
            description: 'Operator mapping',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OperatorMapResponse' },
              },
            },
          },
        },
      },
    },
    '/v1/constructs/list/names': {
      get: {
        tags: ['Constructs'],
        summary: 'List construct names',
        description: 'Get list of all construct names for validation',
        operationId: 'listConstructNames',
        responses: {
          '200': {
            description: 'Construct names',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    names: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['loa', 'loa-constructs', 'sigil', 'hivemind', 'ruggy', 'human'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/constructs/{name}': {
      get: {
        tags: ['Constructs'],
        summary: 'Get construct by name',
        description: 'Get a specific construct by name',
        operationId: 'getConstruct',
        parameters: [{ $ref: '#/components/parameters/ConstructName' }],
        responses: {
          '200': {
            description: 'Construct details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ConstructDetail' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token or API key (sk_...)',
      },
    },
    parameters: {
      SearchQuery: {
        name: 'q',
        in: 'query',
        description: 'Search query',
        schema: { type: 'string' },
      },
      Category: {
        name: 'category',
        in: 'query',
        description: 'Category filter',
        schema: { type: 'string' },
      },
      Tier: {
        name: 'tier',
        in: 'query',
        description: 'Tier filter',
        schema: { type: 'string', enum: ['free', 'pro', 'team', 'enterprise'] },
      },
      Tags: {
        name: 'tags',
        in: 'query',
        description: 'Tag filter (comma-separated)',
        schema: { type: 'string' },
      },
      Sort: {
        name: 'sort',
        in: 'query',
        description: 'Sort field',
        schema: { type: 'string', enum: ['downloads', 'rating', 'newest', 'name'] },
      },
      Limit: {
        name: 'limit',
        in: 'query',
        description: 'Results per page',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
      },
      Offset: {
        name: 'offset',
        in: 'query',
        description: 'Results offset',
        schema: { type: 'integer', minimum: 0, default: 0 },
      },
      StartDate: {
        name: 'startDate',
        in: 'query',
        description: 'Filter start date (ISO 8601)',
        schema: { type: 'string', format: 'date-time' },
      },
      EndDate: {
        name: 'endDate',
        in: 'query',
        description: 'Filter end date (ISO 8601)',
        schema: { type: 'string', format: 'date-time' },
      },
      SkillSlug: {
        name: 'slug',
        in: 'path',
        required: true,
        description: 'Skill slug',
        schema: { type: 'string' },
      },
      TeamId: {
        name: 'teamId',
        in: 'path',
        required: true,
        description: 'Team ID (UUID)',
        schema: { type: 'string', format: 'uuid' },
      },
      ConstructName: {
        name: 'name',
        in: 'path',
        required: true,
        description: 'Construct name (e.g., sigil, hivemind, loa)',
        schema: { type: 'string' },
      },
    },
    schemas: {
      // Auth
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          name: { type: 'string', minLength: 1, maxLength: 255 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string' },
        },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 8, maxLength: 128 },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          access_token: { type: 'string' },
          refresh_token: { type: 'string' },
          expires_in: { type: 'integer' },
          token_type: { type: 'string', example: 'Bearer' },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          email_verified: { type: 'boolean' },
          tier: { type: 'string', enum: ['free', 'pro', 'team', 'enterprise'] },
        },
      },

      // Skills
      CreateSkillRequest: {
        type: 'object',
        required: ['name', 'slug', 'description'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
          description: { type: 'string', maxLength: 5000 },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          tier: { type: 'string', enum: ['free', 'pro', 'team', 'enterprise'] },
        },
      },
      PublishVersionRequest: {
        type: 'object',
        required: ['version'],
        properties: {
          version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
          changelog: { type: 'string' },
        },
      },
      SkillsListResponse: {
        type: 'object',
        properties: {
          skills: { type: 'array', items: { $ref: '#/components/schemas/Skill' } },
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
        },
      },
      SkillResponse: {
        type: 'object',
        properties: {
          skill: { $ref: '#/components/schemas/Skill' },
        },
      },
      Skill: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          tier: { type: 'string' },
          downloads: { type: 'integer' },
          rating: { type: 'number' },
          latestVersion: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      VersionsListResponse: {
        type: 'object',
        properties: {
          versions: { type: 'array', items: { $ref: '#/components/schemas/Version' } },
        },
      },
      VersionResponse: {
        type: 'object',
        properties: {
          version: { $ref: '#/components/schemas/Version' },
        },
      },
      Version: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          version: { type: 'string' },
          changelog: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      DownloadResponse: {
        type: 'object',
        properties: {
          downloadUrl: { type: 'string', format: 'uri' },
          license: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
      LicenseValidationResponse: {
        type: 'object',
        properties: {
          valid: { type: 'boolean' },
          tier: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },

      // Teams
      CreateTeamRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          avatarUrl: { type: 'string', format: 'uri' },
        },
      },
      UpdateTeamRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          avatarUrl: { type: 'string', format: 'uri' },
        },
      },
      InviteMemberRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'member'], default: 'member' },
        },
      },
      TeamsListResponse: {
        type: 'object',
        properties: {
          teams: { type: 'array', items: { $ref: '#/components/schemas/Team' } },
        },
      },
      TeamResponse: {
        type: 'object',
        properties: {
          team: { $ref: '#/components/schemas/Team' },
        },
      },
      TeamDetailResponse: {
        type: 'object',
        properties: {
          team: { $ref: '#/components/schemas/TeamDetail' },
          userRole: { type: 'string', enum: ['owner', 'admin', 'member'] },
        },
      },
      Team: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          name: { type: 'string' },
          avatarUrl: { type: 'string', format: 'uri' },
          memberCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TeamDetail: {
        allOf: [
          { $ref: '#/components/schemas/Team' },
          {
            type: 'object',
            properties: {
              members: { type: 'array', items: { $ref: '#/components/schemas/TeamMember' } },
              subscription: { $ref: '#/components/schemas/Subscription' },
            },
          },
        ],
      },
      TeamMember: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['owner', 'admin', 'member'] },
          joinedAt: { type: 'string', format: 'date-time' },
        },
      },
      InvitationsListResponse: {
        type: 'object',
        properties: {
          invitations: { type: 'array', items: { $ref: '#/components/schemas/Invitation' } },
        },
      },
      InvitationResponse: {
        type: 'object',
        properties: {
          invitation: { $ref: '#/components/schemas/Invitation' },
        },
      },
      Invitation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'member'] },
          expiresAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Subscriptions
      Subscription: {
        type: 'object',
        properties: {
          tier: { type: 'string', enum: ['free', 'pro', 'team', 'enterprise'] },
          status: { type: 'string', enum: ['active', 'past_due', 'canceled', 'trialing'] },
          currentPeriodEnd: { type: 'string', format: 'date-time' },
          seatCount: { type: 'integer' },
          usedSeats: { type: 'integer' },
        },
      },
      CheckoutRequest: {
        type: 'object',
        required: ['priceId'],
        properties: {
          priceId: { type: 'string' },
          teamId: { type: 'string', format: 'uuid' },
          seatCount: { type: 'integer', minimum: 1 },
        },
      },
      CheckoutResponse: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          url: { type: 'string', format: 'uri' },
        },
      },
      PortalResponse: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
        },
      },

      // Analytics
      UsageResponse: {
        type: 'object',
        properties: {
          skillsUsed: { type: 'integer' },
          skillLoads: { type: 'integer' },
          period: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date-time' },
              end: { type: 'string', format: 'date-time' },
            },
          },
          bySkill: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                skillId: { type: 'string' },
                skillName: { type: 'string' },
                loads: { type: 'integer' },
              },
            },
          },
        },
      },

      // Audit
      AuditLogsResponse: {
        type: 'object',
        properties: {
          logs: { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
        },
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          action: { type: 'string' },
          resourceType: { type: 'string' },
          resourceId: { type: 'string' },
          ipAddress: { type: 'string' },
          userAgent: { type: 'string' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Constructs (Melange Protocol)
      ConstructsRegistry: {
        type: 'object',
        properties: {
          version: { type: 'string', example: '2.0.0' },
          org: { type: 'string', example: '0xHoneyJar' },
          last_updated: { type: 'string', format: 'date', example: '2026-01-22' },
          framework: { $ref: '#/components/schemas/FrameworkConstruct' },
          registry: { $ref: '#/components/schemas/RegistryConstruct' },
          constructs: {
            type: 'array',
            items: { $ref: '#/components/schemas/Construct' },
          },
          virtual: {
            type: 'array',
            items: { $ref: '#/components/schemas/VirtualConstruct' },
          },
        },
      },
      Operator: {
        type: 'object',
        description: 'Operator identity for identity validation in Melange Protocol v2',
        properties: {
          display_name: { type: 'string', example: 'soju', description: 'Human-readable display name' },
          github_username: { type: 'string', example: 'zkSoju', description: 'GitHub username for identity validation' },
          discord_id: { type: 'string', example: '970593060553646101', description: 'Discord user ID for notifications' },
        },
        required: ['display_name', 'github_username', 'discord_id'],
      },
      FrameworkConstruct: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'loa' },
          display_name: { type: 'string', example: 'Loa' },
          description: { type: 'string' },
          repo: { type: 'string', example: '0xHoneyJar/loa' },
          operator: { $ref: '#/components/schemas/Operator' },
        },
      },
      RegistryConstruct: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'loa-constructs' },
          display_name: { type: 'string', example: 'Loa Constructs' },
          description: { type: 'string' },
          repo: { type: 'string', example: '0xHoneyJar/loa-constructs' },
          api: { type: 'string', format: 'uri', example: 'https://loa-constructs-api.fly.dev/v1' },
          operator: { $ref: '#/components/schemas/Operator' },
        },
      },
      Construct: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'sigil' },
          display_name: { type: 'string', example: 'Sigil' },
          description: { type: 'string' },
          repo: { type: 'string', example: '0xHoneyJar/sigil' },
          operator: { $ref: '#/components/schemas/Operator' },
          status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
        },
      },
      VirtualConstruct: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'human' },
          display_name: { type: 'string', example: 'Human' },
          description: { type: 'string' },
          note: { type: 'string' },
        },
      },
      ConstructDetail: {
        type: 'object',
        description: 'Detailed construct information returned by GET /v1/constructs/:name',
        properties: {
          type: { type: 'string', enum: ['framework', 'registry', 'construct', 'virtual'] },
          name: { type: 'string' },
          display_name: { type: 'string' },
          description: { type: 'string' },
          repo: { type: 'string' },
          operator: { $ref: '#/components/schemas/Operator' },
          status: { type: 'string' },
          api: { type: 'string', format: 'uri' },
          note: { type: 'string' },
        },
      },
      OperatorMapResponse: {
        type: 'object',
        properties: {
          _comment: { type: 'string', example: 'Copy this to melange-notify.yml OPERATOR_MAP' },
          operator_map: {
            type: 'object',
            additionalProperties: { type: 'string' },
            example: {
              loa: '970593060553646101',
              'loa-constructs': '970593060553646101',
              sigil: '259646475666063360',
              hivemind: '970593060553646101',
              ruggy: '970593060553646101',
            },
          },
        },
      },

      // Common
      MessageResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
          },
          request_id: { type: 'string' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      Conflict: {
        description: 'Resource already exists',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      RateLimited: {
        description: 'Rate limit exceeded',
        headers: {
          'X-RateLimit-Limit': { schema: { type: 'integer' } },
          'X-RateLimit-Remaining': { schema: { type: 'integer' } },
          'X-RateLimit-Reset': { schema: { type: 'integer' } },
          'Retry-After': { schema: { type: 'integer' } },
        },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
};

export default openApiSpec;
