# Zenith API Documentation

This document provides comprehensive documentation for all endpoints available in the Zenith API.

**Base URL:** https://zenith-api-development.up.railway.app/

## Table of Contents

- [Authentication](#authentication)
- [Health](#health)
- [NLP Services](#nlp-services)
- [Task Management](#task-management)
- [Focus Sessions](#focus-sessions)
- [API Metrics](#api-metrics)
- [AB Testing](#ab-testing)

## Authentication

All API requests require authentication using a Bearer token.

### Headers

```
Authorization: Bearer {your_api_token}
```

### Endpoints

#### POST /auth/login

Authenticate a user and get an access token.

**Request:**

```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Health

Endpoints for checking system health and status.

#### GET /health

Get basic health status of the API.

**Response:**

```json
{
  "status": "ok",
  "uptime": 1234567,
  "timestamp": "2023-05-15T14:00:00Z"
}
```

#### GET /health/detailed

Get detailed health information including database status, memory usage, and dependencies.

**Response:**

```json
{
  "status": "ok",
  "services": {
    "database": {
      "status": "connected",
      "latency_ms": 5,
      "active_connections": 10
    },
    "nlp_engine": {
      "status": "operational",
      "model_version": "v2.3.1"
    }
  },
  "system": {
    "memory_usage_mb": 256,
    "cpu_usage_percent": 12.5,
    "disk_usage_percent": 45
  },
  "database_metrics": {
    "size_mb": 1024,
    "active_queries": 5,
    "transactions_per_second": 25
  },
  "uptime_seconds": 345600,
  "last_restart": "2023-05-10T00:00:00Z"
}
```

## NLP Services

Natural language processing endpoints for parsing tasks, extracting entities, and understanding user queries.

#### POST /nlp/parse-task

Parse natural language input into structured task data.

**Request:**

```json
{
  "text": "Meet with John about the Zenith project tomorrow at 2pm"
}
```

**Response:**

```json
{
  "parsed_task": {
    "title": "Meet with John about the Zenith project",
    "description": null,
    "due_date": "2023-05-16T14:00:00Z",
    "priority": "medium",
    "estimated_duration_minutes": 60
  },
  "extracted_entities": {
    "projects": [{ "name": "Zenith", "confidence": 0.92 }],
    "tags": [],
    "dates": [
      {
        "value": "2023-05-16T14:00:00Z",
        "type": "due_date",
        "confidence": 0.96
      }
    ],
    "people": [{ "name": "John", "confidence": 0.95 }]
  },
  "alternatives": [
    {
      "title": "Zenith project meeting with John",
      "confidence": 0.84
    }
  ],
  "meta": {
    "processing_time_ms": 128,
    "model_version": "task-parser-v2.3",
    "tokens_used": 42
  }
}
```

#### POST /nlp/extract-entities

Extract entities from text without creating a task structure.

**Request:**

```json
{
  "text": "I need to submit the report to Sarah by Friday"
}
```

**Response:**

```json
{
  "entities": {
    "actions": [{ "name": "submit", "confidence": 0.93 }],
    "subjects": [{ "name": "report", "confidence": 0.97 }],
    "people": [{ "name": "Sarah", "confidence": 0.95 }],
    "dates": [
      {
        "value": "2023-05-19T23:59:59Z",
        "type": "deadline",
        "confidence": 0.91
      }
    ]
  },
  "meta": {
    "processing_time_ms": 85,
    "model_version": "entity-extractor-v1.7",
    "tokens_used": 25
  }
}
```

#### POST /nlp/understand-query

Parse a natural language query into structured search parameters.

**Request:**

```json
{
  "text": "Show me high priority tasks for the Zenith project due this week"
}
```

**Response:**

```json
{
  "understood_query": {
    "intent": "find_tasks",
    "confidence": 0.95,
    "parameters": {
      "project": "Zenith",
      "time_frame": "this week",
      "priority": "high",
      "sort_by": "due_date"
    }
  },
  "clarification_needed": false,
  "suggested_tasks": [
    {
      "id": "task-123",
      "title": "Complete API documentation",
      "score": 0.89
    },
    {
      "id": "task-145",
      "title": "Review client feedback",
      "score": 0.76
    }
  ],
  "meta": {
    "processing_time_ms": 110,
    "model_version": "query-parser-v1.5",
    "tokens_used": 35
  }
}
```

#### POST /nlp/feedback

Submit feedback on NLP processing results to improve future responses.

**Request:**

```json
{
  "original_request": {
    "endpoint": "/nlp/parse-task",
    "input_text": "Meet with John tomorrow about Zenith"
  },
  "original_response_id": "nlp-response-123456",
  "corrections": {
    "title": "Discuss Zenith project with John",
    "project": "Zenith",
    "due_date": "2023-05-16T10:00:00Z"
  },
  "feedback_type": "correction",
  "user_notes": "The API didn't correctly identify this as a morning meeting"
}
```

**Response:**

```json
{
  "status": "success",
  "feedback_id": "feedback-789012",
  "message": "Thank you for your feedback. It will be used to improve our models.",
  "improvement_expected": "next_training_cycle"
}
```

## Task Management

Endpoints for creating, retrieving, updating, and deleting tasks.

#### GET /tasks

Get a list of tasks, with optional filtering.

**Query Parameters:**

- `status` (optional): Filter by status (open, completed, archived)
- `priority` (optional): Filter by priority (low, medium, high)
- `project` (optional): Filter by project ID
- `due_before` (optional): ISO date string
- `due_after` (optional): ISO date string
- `limit` (optional): Maximum number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

```json
{
  "tasks": [
    {
      "id": "task-123",
      "title": "Complete API documentation",
      "description": "Write comprehensive documentation for all API endpoints",
      "status": "open",
      "priority": "high",
      "due_date": "2023-05-18T17:00:00Z",
      "created_at": "2023-05-12T09:23:45Z",
      "updated_at": "2023-05-14T14:12:30Z",
      "project_id": "project-456",
      "tags": ["documentation", "api"]
    },
    {
      "id": "task-124",
      "title": "Review pull request #42",
      "description": "Code review for new features",
      "status": "open",
      "priority": "medium",
      "due_date": "2023-05-17T12:00:00Z",
      "created_at": "2023-05-14T11:45:22Z",
      "updated_at": "2023-05-14T11:45:22Z",
      "project_id": "project-456",
      "tags": ["code-review"]
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

#### POST /tasks

Create a new task.

**Request:**

```json
{
  "title": "Prepare client presentation",
  "description": "Create slides for the quarterly review",
  "priority": "high",
  "due_date": "2023-05-20T15:00:00Z",
  "project_id": "project-456",
  "tags": ["presentation", "client"]
}
```

**Response:**

```json
{
  "id": "task-125",
  "title": "Prepare client presentation",
  "description": "Create slides for the quarterly review",
  "status": "open",
  "priority": "high",
  "due_date": "2023-05-20T15:00:00Z",
  "created_at": "2023-05-15T16:42:10Z",
  "updated_at": "2023-05-15T16:42:10Z",
  "project_id": "project-456",
  "tags": ["presentation", "client"]
}
```

#### GET /tasks/{id}

Get details of a specific task.

**Response:**

```json
{
  "id": "task-123",
  "title": "Complete API documentation",
  "description": "Write comprehensive documentation for all API endpoints",
  "status": "open",
  "priority": "high",
  "due_date": "2023-05-18T17:00:00Z",
  "created_at": "2023-05-12T09:23:45Z",
  "updated_at": "2023-05-14T14:12:30Z",
  "project_id": "project-456",
  "tags": ["documentation", "api"],
  "subtasks": [
    {
      "id": "subtask-1",
      "title": "Document authentication endpoints",
      "completed": true
    },
    {
      "id": "subtask-2",
      "title": "Document task management endpoints",
      "completed": false
    }
  ],
  "comments": [
    {
      "id": "comment-1",
      "text": "Don't forget to include rate limiting information",
      "created_by": "user-789",
      "created_at": "2023-05-13T11:22:33Z"
    }
  ]
}
```

#### PUT /tasks/{id}

Update an existing task.

**Request:**

```json
{
  "title": "Complete API documentation with examples",
  "status": "in_progress",
  "priority": "high"
}
```

**Response:**

```json
{
  "id": "task-123",
  "title": "Complete API documentation with examples",
  "description": "Write comprehensive documentation for all API endpoints",
  "status": "in_progress",
  "priority": "high",
  "due_date": "2023-05-18T17:00:00Z",
  "created_at": "2023-05-12T09:23:45Z",
  "updated_at": "2023-05-15T16:45:22Z",
  "project_id": "project-456",
  "tags": ["documentation", "api"]
}
```

#### DELETE /tasks/{id}

Delete a task.

**Response:**

```json
{
  "status": "success",
  "message": "Task deleted successfully"
}
```

#### POST /tasks/{id}/complete

Mark a task as completed.

**Response:**

```json
{
  "id": "task-123",
  "status": "completed",
  "completed_at": "2023-05-15T16:50:12Z",
  "updated_at": "2023-05-15T16:50:12Z"
}
```

#### POST /tasks/batch

Create multiple tasks in a single request.

**Request:**

```json
{
  "tasks": [
    {
      "title": "Task 1",
      "priority": "medium"
    },
    {
      "title": "Task 2",
      "priority": "low",
      "due_date": "2023-05-25T12:00:00Z"
    }
  ]
}
```

**Response:**

```json
{
  "created": [
    {
      "id": "task-126",
      "title": "Task 1",
      "priority": "medium"
    },
    {
      "id": "task-127",
      "title": "Task 2",
      "priority": "low",
      "due_date": "2023-05-25T12:00:00Z"
    }
  ],
  "failed": []
}
```

#### POST /tasks/recurring

Create a recurring task.

**Request:**

```json
{
  "title": "Weekly team meeting",
  "description": "Discuss project progress and blockers",
  "priority": "medium",
  "recurrence": {
    "pattern": "weekly",
    "day_of_week": "monday",
    "time": "10:00:00",
    "start_date": "2023-05-22",
    "end_date": "2023-08-28"
  },
  "project_id": "project-456",
  "duration_minutes": 60
}
```

**Response:**

```json
{
  "id": "recurring-task-001",
  "title": "Weekly team meeting",
  "description": "Discuss project progress and blockers",
  "priority": "medium",
  "recurrence": {
    "pattern": "weekly",
    "day_of_week": "monday",
    "time": "10:00:00",
    "start_date": "2023-05-22",
    "end_date": "2023-08-28",
    "occurrences": 15
  },
  "project_id": "project-456",
  "duration_minutes": 60,
  "created_at": "2023-05-15T17:00:00Z",
  "updated_at": "2023-05-15T17:00:00Z",
  "next_occurrence": "2023-05-22T10:00:00Z"
}
```

## Focus Sessions

Endpoints for managing focus sessions.

#### POST /focus-sessions/start

Start a new focus session.

**Request:**

```json
{
  "duration_minutes": 25,
  "task_id": "task-123"
}
```

**Response:**

```json
{
  "id": "session-001",
  "task_id": "task-123",
  "start_time": "2023-05-15T17:05:00Z",
  "planned_end_time": "2023-05-15T17:30:00Z",
  "status": "in_progress"
}
```

#### POST /focus-sessions/{id}/complete

Complete a focus session.

**Request:**

```json
{
  "notes": "Made good progress on documentation",
  "actual_duration_minutes": 23
}
```

**Response:**

```json
{
  "id": "session-001",
  "task_id": "task-123",
  "start_time": "2023-05-15T17:05:00Z",
  "end_time": "2023-05-15T17:28:00Z",
  "planned_duration_minutes": 25,
  "actual_duration_minutes": 23,
  "status": "completed",
  "notes": "Made good progress on documentation"
}
```

#### GET /focus-sessions

Get a list of focus sessions.

**Query Parameters:**

- `from_date` (optional): ISO date string
- `to_date` (optional): ISO date string
- `task_id` (optional): Filter by task ID
- `status` (optional): Filter by status (in_progress, completed, interrupted)

**Response:**

```json
{
  "sessions": [
    {
      "id": "session-001",
      "task_id": "task-123",
      "start_time": "2023-05-15T17:05:00Z",
      "end_time": "2023-05-15T17:28:00Z",
      "planned_duration_minutes": 25,
      "actual_duration_minutes": 23,
      "status": "completed",
      "notes": "Made good progress on documentation"
    },
    {
      "id": "session-002",
      "task_id": "task-124",
      "start_time": "2023-05-16T10:00:00Z",
      "planned_end_time": "2023-05-16T10:45:00Z",
      "planned_duration_minutes": 45,
      "status": "in_progress"
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

## API Metrics

Endpoints for retrieving API usage metrics.

#### GET /api-metrics

Get metrics on API usage.

**Query Parameters:**

- `from_date` (required): ISO date string
- `to_date` (required): ISO date string
- `group_by` (optional): endpoint, user, hour, day (default: day)

**Response:**

```json
{
  "total_requests": 2145,
  "average_response_time_ms": 127,
  "error_rate": 0.012,
  "metrics_by_day": [
    {
      "date": "2023-05-14",
      "requests": 1050,
      "average_response_time_ms": 124,
      "error_rate": 0.01
    },
    {
      "date": "2023-05-15",
      "requests": 1095,
      "average_response_time_ms": 130,
      "error_rate": 0.014
    }
  ],
  "top_endpoints": [
    {
      "endpoint": "/nlp/parse-task",
      "requests": 875,
      "average_response_time_ms": 145
    },
    {
      "endpoint": "/tasks",
      "requests": 520,
      "average_response_time_ms": 95
    }
  ]
}
```

## AB Testing

Endpoints for the A/B testing framework.

#### GET /ab-testing/models

Get information about available NLP models for A/B testing.

**Response:**

```json
{
  "models": [
    {
      "id": "model-a",
      "name": "Task Parser v2.3",
      "type": "task_parsing",
      "description": "Standard task parsing model",
      "current_traffic_percentage": 70,
      "metrics": {
        "accuracy": 0.92,
        "average_confidence": 0.87,
        "processing_time_ms": 125
      }
    },
    {
      "id": "model-b",
      "name": "Task Parser v3.0-beta",
      "type": "task_parsing",
      "description": "Enhanced task parsing with better date recognition",
      "current_traffic_percentage": 30,
      "metrics": {
        "accuracy": 0.94,
        "average_confidence": 0.89,
        "processing_time_ms": 135
      }
    }
  ]
}
```

#### POST /ab-testing/feedback

Submit feedback specifically for A/B test comparison.

**Request:**

```json
{
  "model_id": "model-b",
  "request_id": "nlp-request-123456",
  "correct": true,
  "user_rating": 5,
  "notes": "Date recognition was perfect"
}
```

**Response:**

```json
{
  "status": "success",
  "feedback_id": "ab-feedback-789012",
  "message": "Feedback recorded for A/B testing comparison"
}
```

#### GET /ab-testing/dashboard

Get metrics dashboard for A/B testing results.

**Query Parameters:**

- `model_type` (optional): Filter by model type (task_parsing, entity_extraction, etc.)
- `from_date` (optional): ISO date string
- `to_date` (optional): ISO date string

**Response:**

```json
{
  "comparison_results": [
    {
      "model_type": "task_parsing",
      "models": [
        {
          "id": "model-a",
          "name": "Task Parser v2.3",
          "metrics": {
            "accuracy": 0.92,
            "average_confidence": 0.87,
            "processing_time_ms": 125,
            "user_satisfaction": 4.2,
            "error_rate": 0.03
          }
        },
        {
          "id": "model-b",
          "name": "Task Parser v3.0-beta",
          "metrics": {
            "accuracy": 0.94,
            "average_confidence": 0.89,
            "processing_time_ms": 135,
            "user_satisfaction": 4.6,
            "error_rate": 0.02
          },
          "improvement": {
            "accuracy": "+2.2%",
            "user_satisfaction": "+9.5%",
            "error_rate": "-33.3%"
          }
        }
      ],
      "statistical_significance": {
        "accuracy": true,
        "user_satisfaction": true,
        "processing_time": false
      },
      "recommendation": "Consider making model-b the default"
    }
  ],
  "test_period": {
    "start_date": "2023-04-15T00:00:00Z",
    "end_date": "2023-05-15T00:00:00Z",
    "total_samples": 24500
  }
}
```

#### PUT /ab-testing/traffic-allocation

Update traffic allocation between A/B test models.

**Request:**

```json
{
  "allocations": [
    {
      "model_id": "model-a",
      "percentage": 50
    },
    {
      "model_id": "model-b",
      "percentage": 50
    }
  ]
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Traffic allocation updated",
  "current_allocations": [
    {
      "model_id": "model-a",
      "percentage": 50,
      "previous_percentage": 70
    },
    {
      "model_id": "model-b",
      "percentage": 50,
      "previous_percentage": 30
    }
  ],
  "updated_at": "2023-05-15T17:30:45Z"
}
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found",
    "details": {
      "resource_type": "task",
      "resource_id": "task-999"
    }
  },
  "status_code": 404,
  "timestamp": "2023-05-15T17:45:30Z",
  "request_id": "req-abcdef123456"
}
```

Common error codes:

- `INVALID_REQUEST`: The request format is invalid
- `UNAUTHORIZED`: Authentication is required
- `FORBIDDEN`: The authenticated user doesn't have permission
- `RESOURCE_NOT_FOUND`: The requested resource was not found
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMITED`: Too many requests
- `SERVER_ERROR`: Internal server error
