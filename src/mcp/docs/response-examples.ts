/**
 * Response examples for Swagger documentation
 */

/**
 * Example of a successful resource response
 */
export const ResourceResponseExample = {
  data: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    type: 'task',
    properties: {
      title: 'Complete project documentation',
      description: 'Finish the API documentation for the new feature',
      status: 'in_progress',
      priority: 'high',
      due_date: '2025-04-15T14:00:00Z',
    },
    relationships: {
      project: {
        data: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          type: 'project',
        },
      },
      tags: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            type: 'tag',
          },
        ],
      },
    },
  },
  meta: {
    apiVersion: '1.0',
    timestamp: '2025-03-17T20:45:30.123Z',
  },
  links: {
    self: 'http://localhost:3001/api/v1/mcp/resources/task/123e4567-e89b-12d3-a456-426614174000',
  },
};

/**
 * Example of a successful collection response
 */
export const CollectionResponseExample = {
  data: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'task',
      properties: {
        title: 'Complete project documentation',
        description: 'Finish the API documentation for the new feature',
        status: 'in_progress',
        priority: 'high',
        due_date: '2025-04-15T14:00:00Z',
      },
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174003',
      type: 'task',
      properties: {
        title: 'Review pull request',
        description: 'Review and approve the recent pull request',
        status: 'todo',
        priority: 'medium',
        due_date: '2025-04-10T10:00:00Z',
      },
    },
  ],
  meta: {
    apiVersion: '1.0',
    timestamp: '2025-03-17T20:45:30.123Z',
    count: 2,
    totalCount: 42,
    pageCount: 21,
  },
  links: {
    self: 'http://localhost:3001/api/v1/mcp/resources/task?page[number]=1&page[size]=2',
    first:
      'http://localhost:3001/api/v1/mcp/resources/task?page[number]=1&page[size]=2',
    next: 'http://localhost:3001/api/v1/mcp/resources/task?page[number]=2&page[size]=2',
    last: 'http://localhost:3001/api/v1/mcp/resources/task?page[number]=21&page[size]=2',
  },
};

/**
 * Example of an error response
 */
export const ErrorResponseExample = {
  errors: [
    {
      status: '404',
      code: 'resource_not_found',
      title: 'Resource Not Found',
      detail:
        'The requested task with ID 123e4567-e89b-12d3-a456-426614174099 could not be found',
      source: {
        pointer: '/data/id',
      },
    },
  ],
  meta: {
    apiVersion: '1.0',
    timestamp: '2025-03-17T20:45:30.123Z',
  },
};

/**
 * Example of a validation error response
 */
export const ValidationErrorResponseExample = {
  errors: [
    {
      status: '400',
      code: 'validation_error',
      title: 'Validation Error',
      detail: 'The property "priority" must be one of: high, medium, low, none',
      source: {
        pointer: '/data/attributes/priority',
      },
    },
    {
      status: '400',
      code: 'validation_error',
      title: 'Validation Error',
      detail: 'The property "title" is required',
      source: {
        pointer: '/data/attributes/title',
      },
    },
  ],
  meta: {
    apiVersion: '1.0',
    timestamp: '2025-03-17T20:45:30.123Z',
  },
};

/**
 * Example of a schema response
 */
export const SchemaResponseExample = {
  data: {
    type: 'task',
    properties: {
      title: {
        type: 'string',
        description: 'The title of the task',
        required: true,
      },
      description: {
        type: 'string',
        description: 'A detailed description of the task',
        nullable: true,
      },
      status: {
        type: 'string',
        description: 'The current status of the task',
        enum: ['todo', 'in_progress', 'done', 'canceled'],
        default: 'todo',
      },
      priority: {
        type: 'string',
        description: 'The priority level of the task',
        enum: ['high', 'medium', 'low', 'none'],
        default: 'medium',
      },
      due_date: {
        type: 'string',
        format: 'date-time',
        description: 'The due date for the task',
        nullable: true,
      },
    },
    relationships: {
      project: {
        resourceType: 'project',
        cardinality: 'one',
        description: 'The project this task belongs to',
      },
      tags: {
        resourceType: 'tag',
        cardinality: 'many',
        description: 'Tags associated with this task',
      },
    },
  },
  meta: {
    apiVersion: '1.0',
    timestamp: '2025-03-17T20:45:30.123Z',
  },
  links: {
    self: 'http://localhost:3001/api/v1/mcp/resources/task/schema',
  },
};
