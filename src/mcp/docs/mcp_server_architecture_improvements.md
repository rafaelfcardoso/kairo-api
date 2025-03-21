# MCP Server Architecture Improvements

This document outlines the improvements needed specifically for the Model Context Protocol (MCP) server, highlighting the architectural differences between traditional REST APIs and the MCP action-based approach.

## Understanding MCP vs Traditional REST APIs

### Current Architecture

The MCP server uses an action-based architecture rather than a traditional REST approach:

- **MCP Action Pattern**: All operations go through a single endpoint (`/api/v1/mcp/actions`) with the specific operation determined by the `name` field in the request body.
- **NestJS REST Pattern**: Uses distinct endpoints for different operations (e.g., `/nlp/parse-task`, `/nlp/extract-entities`).

Currently, our client is trying to use REST-style endpoints when it should be using the MCP action pattern, causing compatibility issues.

## Required MCP Server Improvements

### 1. Action Standardization

- **Action Registry**

  - Create a formal registry of all supported actions
  - Document all parameters for each action with validation requirements
  - Implement consistent response schemas for similar action types

- **Mapping Common Operations**
  | Operation | MCP Action |
  |-----------|------------|
  | Parse Task | `{"name": "parseTask", "parameters": {...}}` |
  | Create Task from NL | `{"name": "createTaskFromNLP", "parameters": {...}}` |
  | Extract Entities | `{"name": "extractEntities", "parameters": {...}}` |
  | Understand Query | `{"name": "understandQuery", "parameters": {...}}` |

### 2. Client Implementation Improvements

- **MCP Client Updates**

  - Ensure all client methods use the correct action-based format
  - Replace REST-style endpoint calls with action-based calls
  - Update `create_task_from_nlp` to use `/api/v1/mcp/actions` endpoint with proper format
  - Update `parse_task` to use `/api/v1/mcp/actions` endpoint with proper format

- **Fallback Chain**
  - Implement proper fallback mechanism that respects the architectural differences
  - When MCP server is unavailable, fall back to other methods that use the correct endpoints

### 3. Correct Parameter Formats

- **Action Parameters**

  ```json
  {
    "name": "parseTask",
    "parameters": {
      "text": "Call John tomorrow at 3pm",
      "confidenceThreshold": 0.6,
      "context": {
        "timezone": "America/New_York"
      }
    }
  }
  ```

- **Task Creation Parameters**
  ```json
  {
    "name": "createTaskFromNLP",
    "parameters": {
      "input": "Call John tomorrow at 3pm",
      "projectId": "123e4567-e89b-12d3-a456-426614174000",
      "tagIds": ["tag1", "tag2"]
    }
  }
  ```

### 4. Response Handling

- **Standardized Response Format**

  ```json
  {
    "success": true,
    "result": {
      // Action-specific result data
    },
    "meta": {
      "processing_time_ms": 128,
      "model_version": "task-parser-v2.3",
      "tokens_used": 42
    }
  }
  ```

- **Error Response Format**
  ```json
  {
    "success": false,
    "error": {
      "code": "invalid_parameters",
      "message": "The provided parameters are invalid",
      "details": {
        "field": "input",
        "issue": "Required parameter is missing"
      }
    }
  }
  ```

### 5. Documentation Updates

- **API Documentation**

  - Create dedicated documentation for MCP action-based architecture
  - Document each supported action with parameter requirements and response schema
  - Provide example requests and responses for common scenarios
  - Clarify the distinction between traditional REST APIs and MCP action pattern

- **Client Documentation**
  - Update client documentation to reflect the action-based approach
  - Include examples of how to properly construct action requests
  - Document the fallback mechanisms and their behavior

### 6. Testing and Validation

- **Test Suite Expansion**

  - Create tests specifically for MCP actions
  - Validate correct parameter passing and response handling
  - Test failure scenarios and error handling
  - Implement integration tests that verify end-to-end functionality

- **Validation Tools**
  - Create validation tools to confirm correct action formats
  - Implement request/response validators for each action type
  - Add logging to help diagnose incorrect formats during development

## Implementation Plan

1. **Immediate Fixes (1 week)**

   - Update `MCPClient.create_task_from_nlp` method to use the correct endpoint and format
   - Update `MCPClient.parse_task` method to use the correct endpoint and format
   - Add detailed logging to help diagnose issues

2. **Short-term Improvements (2-3 weeks)**

   - Create comprehensive documentation of all supported MCP actions
   - Update client implementations to consistently use action-based pattern
   - Improve error handling and reporting for incorrect formats

3. **Long-term Strategy (1-2 months)**
   - Standardize all client-server interactions to use the MCP pattern
   - Implement advanced features like bulk operations and batch processing
   - Add performance optimizations for common action types

## Conclusion

The MCP server requires a different approach than traditional REST APIs. By standardizing on the action-based pattern and updating our client implementations, we can ensure reliable communication between our applications and the MCP server. These improvements will reduce errors, improve performance, and make the system more maintainable.
