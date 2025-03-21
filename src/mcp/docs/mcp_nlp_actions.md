# MCP NLP Actions

This document provides information on using the NLP (Natural Language Processing) capabilities through the Model Context Protocol (MCP) architecture.

## Overview

The MCP server implements an action-based architecture where all operations go through a single endpoint (`/api/v1/mcp/actions`) with the specific operation determined by the `name` field in the request body.

All NLP functionality has been updated to follow this pattern, replacing the traditional REST API endpoints.

## Available NLP Actions

### 1. `parseTask`

Parses natural language text into task data.

**Request Format:**

```json
{
  "name": "parseTask",
  "parameters": {
    "text": "Call John tomorrow at 3pm",
    "confidenceThreshold": 0.6,
    "context": {
      "timezone": "America/New_York"
    },
    "parseRecurrence": true,
    "defaultProjectId": "project-123"
  }
}
```

**Response Format:**

```json
{
  "data": {
    "success": true,
    "result": {
      "request_id": "task-123",
      "parsed_task": {
        "title": "Call John",
        "description": "",
        "due_date": "2023-04-15T15:00:00Z",
        "priority": "medium",
        "estimated_duration_minutes": 30
      },
      "extracted_entities": {
        "projects": [],
        "tags": [],
        "dates": [
          {
            "value": "2023-04-15T15:00:00Z",
            "type": "due_date",
            "confidence": 0.9
          }
        ]
      },
      "alternatives": [],
      "meta": {
        "processing_time_ms": 120,
        "model_version": "1.0.0",
        "tokens_used": 42
      }
    },
    "meta": {
      "processing_time_ms": 120,
      "model_version": "1.0.0",
      "tokens_used": 42
    }
  }
}
```

### 2. `extractEntities`

Extracts entities from natural language text.

**Request Format:**

```json
{
  "name": "extractEntities",
  "parameters": {
    "text": "Schedule a meeting with the marketing team next Monday",
    "entityTypes": ["date", "project", "tag"],
    "confidenceThreshold": 0.7,
    "context": {
      "recentProjects": ["Marketing Campaign", "Product Launch"]
    }
  }
}
```

**Response Format:**

```json
{
  "data": {
    "success": true,
    "result": {
      "request_id": "entity-123",
      "entities": {
        "projects": [
          {
            "name": "Marketing Campaign",
            "confidence": 0.85
          }
        ],
        "tags": [
          {
            "name": "meeting",
            "confidence": 0.9
          }
        ],
        "dates": [
          {
            "value": "2023-04-17T00:00:00Z",
            "type": "due_date",
            "confidence": 0.95
          }
        ]
      },
      "meta": {
        "processing_time_ms": 85,
        "model_version": "1.0.0",
        "tokens_used": 36
      }
    },
    "meta": {
      "processing_time_ms": 85,
      "model_version": "1.0.0",
      "tokens_used": 36
    }
  }
}
```

### 3. `understandQuery`

Analyzes and understands a natural language query.

**Request Format:**

```json
{
  "name": "understandQuery",
  "parameters": {
    "text": "Show me all high priority tasks due this week",
    "maxSuggestions": 5,
    "confidenceThreshold": 0.6,
    "context": {
      "userId": "user-123"
    }
  }
}
```

**Response Format:**

```json
{
  "data": {
    "success": true,
    "result": {
      "request_id": "query-123",
      "understood_query": {
        "intent": "find_tasks",
        "confidence": 0.95,
        "parameters": {
          "priority": "high",
          "due_date": "this_week",
          "sort_by": "due_date"
        }
      },
      "clarification_needed": false,
      "suggested_tasks": [
        {
          "id": "task-1",
          "title": "Finalize quarterly report",
          "score": 0.92
        },
        {
          "id": "task-2",
          "title": "Prepare presentation for client",
          "score": 0.87
        }
      ],
      "meta": {
        "processing_time_ms": 110,
        "model_version": "1.0.0",
        "tokens_used": 48
      }
    },
    "meta": {
      "processing_time_ms": 110,
      "model_version": "1.0.0",
      "tokens_used": 48
    }
  }
}
```

### 4. `createTaskFromNLP`

Creates a new task from natural language input.

**Request Format:**

```json
{
  "name": "createTaskFromNLP",
  "parameters": {
    "input": "Call John tomorrow at 3pm",
    "projectId": "project-123",
    "tagIds": ["tag-1", "tag-2"]
  }
}
```

**Response Format:**

```json
{
  "data": {
    "id": "task-123",
    "type": "task",
    "properties": {
      "title": "Call John",
      "description": "",
      "due_date": "2023-04-15T15:00:00Z",
      "priority": "medium",
      "status": "not_started",
      "created_at": "2023-04-14T10:30:00Z",
      "updated_at": "2023-04-14T10:30:00Z"
    },
    "relationships": {
      "project": {
        "data": {
          "id": "project-123",
          "type": "project"
        }
      },
      "tags": {
        "data": [
          {
            "id": "tag-1",
            "type": "tag"
          },
          {
            "id": "tag-2",
            "type": "tag"
          }
        ]
      }
    }
  }
}
```

## Client Implementation

To use these actions, clients should:

1. Send POST requests to the `/api/v1/mcp/actions` endpoint
2. Include the appropriate action name and parameters in the request body
3. Handle the standardized response format

Example client code:

```typescript
async function parseTask(text: string) {
  const response = await fetch('/api/v1/mcp/actions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer TOKEN',
    },
    body: JSON.stringify({
      name: 'parseTask',
      parameters: {
        text,
        confidenceThreshold: 0.6,
      },
    }),
  });

  return await response.json();
}
```

## Migration from REST Endpoints

For clients currently using the REST endpoints:

| Old REST Endpoint                 | New MCP Action                       |
| --------------------------------- | ------------------------------------ |
| POST /api/v1/nlp/parse-task       | { "name": "parseTask", ... }         |
| POST /api/v1/nlp/extract-entities | { "name": "extractEntities", ... }   |
| POST /api/v1/nlp/understand-query | { "name": "understandQuery", ... }   |
| POST /api/v1/nlp/create-task      | { "name": "createTaskFromNLP", ... } |

The previous REST endpoints will be maintained for backward compatibility but are deprecated and will be removed in a future release.
