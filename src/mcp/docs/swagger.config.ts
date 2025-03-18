import { DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';

/**
 * Creates the Swagger document configuration for the MCP API
 *
 * @returns OpenAPI configuration object
 */
export function createMcpSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('Model Context Protocol (MCP) API')
    .setDescription(
      `
      The Model Context Protocol API provides standardized access to resources and actions
      for AI services and other clients.

      ## Key Features

      - Resource-based API design following REST principles
      - Consistent query parameter patterns for filtering, sorting, and pagination
      - Standardized error responses with machine-readable codes
      - Detailed schema information for resources
      - Support for action execution

      ## Authentication

      All endpoints require authentication using a JWT token.
      Include the token in the Authorization header as a Bearer token:
      \`\`\`
      Authorization: Bearer your-token-here
      \`\`\`

      ## Pagination

      Collection endpoints support pagination using the following parameters:
      - \`page[number]\`: The page number (starts at 1)
      - \`page[size]\`: The number of items per page

      ## Filtering

      Filter resources using the filter parameter with field names:
      - \`filter[field]=value\`: Filter by exact match
      - \`filter[status]=in_progress\`: Filter tasks with status "in_progress"

      ## Inclusion

      Include related resources using the include parameter:
      - \`include=relation1,relation2\`: Include the specified relations
      - \`include=project,tags\`: Include project and tags with tasks

      ## Sorting

      Sort results using the sort parameter:
      - \`sort=field1,-field2\`: Sort by field1 ascending, then field2 descending
      - \`sort=due_date,-priority\`: Sort by due date ascending, then priority descending
    `,
    )
    .setVersion('1.0')
    .addTag('MCP', 'Model Context Protocol endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer(
      'http://localhost:3001/api/v1',
      'Local development server with api/v1 prefix',
    )
    .build();
}
