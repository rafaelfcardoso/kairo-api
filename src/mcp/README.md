# Model Context Protocol (MCP) Module

This module implements the Model Context Protocol (MCP) server for standardizing context sharing with AI services. The implementation allows AI services to discover and retrieve resources from the system in a standardized way.

## Architecture

The MCP module provides:

1. Resource schemas - describing the structure of resources
2. Resource retrieval - allowing querying for resources with filtering
3. Resource by ID - fetching specific resources
4. Resource creation - creating new resources
5. MCP tools/actions - executing operations like natural language task creation

## Endpoints

| Method | Endpoint                      | Description                           |
| ------ | ----------------------------- | ------------------------------------- |
| GET    | `/mcp/resources/:type/schema` | Get the schema for a resource type    |
| GET    | `/mcp/resources/:type`        | Get resources with optional filtering |
| GET    | `/mcp/resources/:type/:id`    | Get a specific resource by ID         |
| POST   | `/mcp/resources/:type`        | Create a new resource                 |
| GET    | `/mcp/tools`                  | Get available MCP tools/actions       |
| POST   | `/mcp/actions`                | Execute an MCP action                 |

## Resource Types

Currently supported resource types:

- `task` - Tasks in the system with properties like title, description, status, etc.

## Authentication

All MCP endpoints are protected by JWT authentication. Clients must include a valid Bearer token in the Authorization header.

## Query Parameters

When retrieving resources, the following query parameters are supported:

- `filter[field]=value` - Filter resources by field values
- `include=relation1,relation2` - Include related resources
- `sort=field1,-field2` - Sort results (prefix with - for descending)
- `page[number]=1&page[size]=10` - Pagination

## MCP Actions

The following MCP actions are available:

### createTaskFromNLP

Creates a new task from a natural language description.

**Parameters:**

- `input` (string, required): Natural language description of the task to create
- `projectId` (string, optional): ID of the project to assign the task to

**Returns:**

- The newly created task resource

## Example Usage

### Get Task Schema

```
GET /mcp/resources/task/schema
```

### Get All Tasks

```
GET /mcp/resources/task
```

### Get Tasks Filtered by Status

```
GET /mcp/resources/task?filter[status]=in_progress
```

### Get Tasks with Related Resources

```
GET /mcp/resources/task?include=project,tags
```

### Get Specific Task

```
GET /mcp/resources/task/123e4567-e89b-12d3-a456-426614174000
```

### Create a New Task

```
POST /mcp/resources/task
Content-Type: application/json

{
  "properties": {
    "title": "Complete documentation",
    "description": "Finish writing the API documentation",
    "priority": "high",
    "dueDate": "2025-01-01T12:00:00Z"
  },
  "relationships": {
    "project": {
      "data": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "type": "project"
      }
    }
  }
}
```

### Get Available MCP Tools

```
GET /mcp/tools
```

### Create Task from Natural Language

```
POST /mcp/actions
Content-Type: application/json

{
  "name": "createTaskFromNLP",
  "parameters": {
    "input": "Remind me to call John tomorrow at 9am",
    "projectId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```
