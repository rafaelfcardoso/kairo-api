# Zenith API - Model Context Protocol (MCP) Server

## Overview

The Zenith API implements a comprehensive Model Context Protocol (MCP) server that provides intelligent natural language processing capabilities for task management. The API is currently hosted in the development environment at:

https://zenith-api-development.up.railway.app/api

## Key Improvements

The MCP server has been significantly enhanced with the following improvements:

### 1. Enhanced NLP Capabilities

- **Server-Side NLP Processing**: Full server-side implementation of NLP capabilities, reducing client complexity
- **Confidence Scoring System**: Detailed confidence metrics (0.0-1.0) for all entity extractions and interpretations
- **Threshold Configuration**: Configurable confidence thresholds with client-hint capability
- **Ambiguity Resolution**: Multiple alternative interpretations when confidence is below thresholds
- **Intelligent Entity Recognition**: Context-aware extraction of dates, projects, tags, and other entities

### 2. A/B Testing Framework

- **Multiple Model Support**: Infrastructure to run multiple NLP models concurrently
- **Traffic Distribution**: Smart traffic allocation between different models based on configuration
- **Performance Metrics**: Comprehensive tracking of model performance metrics
- **Analytics Dashboard**: Visual interface for comparing model effectiveness
- **Feedback Collection**: Endpoints for recording user feedback to improve models

### 3. Standardized Response Formats

- **Consistent Response Structure**: Well-defined response formats for all NLP operations
- **Rich Metadata**: Processing metadata included with all responses
- **Error Handling**: Standardized error responses with descriptive information

## Using the NLP API

### NLP Endpoints

| Endpoint                       | Method | Description                                           |
| ------------------------------ | ------ | ----------------------------------------------------- |
| `/api/v1/nlp/parse-task`       | POST   | Parse natural language into structured task data      |
| `/api/v1/nlp/extract-entities` | POST   | Extract entities (projects, tags, dates) from text    |
| `/api/v1/nlp/understand-query` | POST   | Understand user queries and extract intent/parameters |
| `/api/v1/nlp/feedback`         | POST   | Submit feedback about NLP processing results          |

### Task Parsing

Parse natural language text into structured task data.

**Request:**

```json
POST /api/v1/nlp/parse-task
{
  "text": "Finish the project proposal by next Friday",
  "confidenceThreshold": 0.6,
  "defaultProjectId": "project-123",
  "context": {
    "recentProjects": ["Project A", "Project B"]
  }
}
```

**Response:**

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "parsed_task": {
    "title": "Finish the project proposal",
    "description": "",
    "due_date": "2023-05-12T23:59:59Z",
    "priority": "medium",
    "estimated_duration_minutes": 60
  },
  "extracted_entities": {
    "projects": [{ "name": "Project A", "confidence": 0.92 }],
    "tags": [],
    "dates": [
      {
        "value": "2023-05-12T23:59:59Z",
        "type": "due_date",
        "confidence": 0.95
      }
    ]
  },
  "alternatives": [],
  "meta": {
    "processing_time_ms": 145,
    "model_version": "default-1.0.0",
    "tokens_used": 42
  }
}
```

### Entity Extraction

Extract specific entities from text without creating a task.

**Request:**

```json
POST /api/v1/nlp/extract-entities
{
  "text": "Schedule meeting with marketing team next Tuesday about the Zenith launch",
  "entityTypes": ["projects", "dates", "tags"],
  "confidenceThreshold": 0.5
}
```

**Response:**

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440001",
  "entities": {
    "projects": [{ "name": "Zenith", "confidence": 0.83 }],
    "tags": [
      { "name": "meeting", "confidence": 0.91 },
      { "name": "marketing", "confidence": 0.87 }
    ],
    "dates": [
      {
        "value": "2023-05-09T12:00:00Z",
        "type": "due_date",
        "confidence": 0.88
      }
    ]
  },
  "meta": {
    "processing_time_ms": 120,
    "model_version": "default-1.0.0",
    "tokens_used": 38
  }
}
```

### Query Understanding

Understand natural language queries from users.

**Request:**

```json
POST /api/v1/nlp/understand-query
{
  "text": "Show me high priority tasks due this week",
  "maxSuggestions": 3
}
```

**Response:**

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440002",
  "understood_query": {
    "intent": "find_tasks",
    "confidence": 0.95,
    "parameters": {
      "priority": "high",
      "time_frame": "this week",
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
      "id": "task-456",
      "title": "Review pull request",
      "score": 0.76
    }
  ],
  "meta": {
    "processing_time_ms": 135,
    "model_version": "default-1.0.0",
    "tokens_used": 45
  }
}
```

### Providing Feedback

Submit feedback to improve NLP results.

**Request:**

```json
POST /api/v1/nlp/feedback
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "task_parsing",
  "correctedOutput": {
    "title": "Finish the project proposal",
    "due_date": "2023-05-19T23:59:59Z"
  },
  "wasHelpful": false,
  "feedbackText": "The due date was incorrect, it should be next Friday (May 19th)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Feedback recorded successfully"
}
```

## A/B Testing Framework

### Dashboard

The A/B testing dashboard provides a visual interface for comparing model performance:

```
https://zenith-api-development.up.railway.app/api/v1/nlp/ab-testing/dashboard
```

### Metrics API

Get performance metrics for NLP models:

**Request:**

```
GET /api/v1/nlp/ab-testing/metrics?days=7&operationType=task_parsing
```

**Response:**

```json
[
  {
    "modelId": "default",
    "modelVersion": "1.0.0",
    "requestCount": "245",
    "avgConfidence": "0.87",
    "avgProcessingTime": "142.5",
    "helpfulCount": "180",
    "unhelpfulCount": "20",
    "clarificationCount": "15"
  },
  {
    "modelId": "experimental",
    "modelVersion": "1.1.0-beta",
    "requestCount": "62",
    "avgConfidence": "0.84",
    "avgProcessingTime": "158.3",
    "helpfulCount": "45",
    "unhelpfulCount": "8",
    "clarificationCount": "5"
  }
]
```

### Submitting Model Feedback

Rate a model's performance for a specific request:

**Request:**

```json
POST /api/v1/nlp/ab-testing/feedback/550e8400-e29b-41d4-a716-446655440000
{
  "wasHelpful": true
}
```

**Response:**

```json
{
  "success": true
}
```

## Development Configuration

When working with the development environment:

1. **Base URL**: All API requests should be directed to `https://zenith-api-development.up.railway.app/api`
2. **API Version**: All NLP endpoints use the `/v1` API version prefix
3. **Authentication**: Bearer token authentication is required for most endpoints
4. **Content-Type**: All requests should use `application/json` content type

## Technical Implementation Details

### A/B Testing Configuration

The A/B testing framework is configured through a central configuration file that defines the models, their traffic percentages, and parameters:

```typescript
export const NLP_MODELS: ModelConfig[] = [
  {
    modelId: 'default',
    modelVersion: '1.0.0',
    description: 'Default NLP model',
    trafficPercentage: 80,
    isActive: true,
  },
  {
    modelId: 'experimental',
    modelVersion: '1.1.0-beta',
    description: 'Experimental model with improved entity extraction',
    trafficPercentage: 20,
    isActive: true,
    parameters: {
      confidenceThreshold: 0.55, // Lower threshold for the experimental model
    },
  },
];
```

Traffic distribution ensures a consistent experience for users by using the same model for a specific user ID across sessions.

### Performance Tracking

The system tracks detailed performance metrics for each model, including:

- Confidence scores for each prediction
- Processing time
- Token usage
- User feedback ratings
- Clarification requirements

This data is used to drive data-based decisions about which models are most effective and should be rolled out to more users.

## Conclusion

The enhanced MCP server provides robust NLP capabilities with intelligent entity extraction, confidence scoring, and a complete A/B testing framework. As development continues, additional improvements will focus on authentication, security, and integration capabilities.
