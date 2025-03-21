# MCP Error Handling Improvements

## Issues Fixed

### 1. Proper MCP Error Handling for Validation Errors

The MCP controller was returning 500 Internal Server Error responses for validation errors like past due dates, instead of proper 400 Bad Request responses. This has been fixed by enhancing the exception handling in the `createResource` method of the `McpController` class.

Changes made:

- Added specific handling for `BadRequestException` and validation errors
- Added checks for error messages related to date validation
- Ensured validation errors propagate correctly with appropriate status codes

### 2. API Metrics Race Condition

The API metrics service was experiencing race conditions when concurrent requests tried to update the same metrics record, resulting in duplicate key constraint violations. This was fixed by implementing a transaction with a pessimistic lock in the `updateMetrics` method.

Changes made:

- Wrapped metrics updates in a transaction
- Applied a pessimistic write lock to prevent concurrent updates
- Used a transactional entity manager for all database operations
- Added proper error handling to prevent API failures when metrics updates fail

### 3. AI Service Unavailability Error Handling

The MCP actions endpoint was returning 500 Internal Server Error responses when the AI service was unavailable. This has been fixed by enhancing the exception handling in the `executeAction` method of the `McpController` class and the action handlers in the `McpService` class.

Changes made:

- Added specific error handling for AI service connection issues
- Improved error messaging to indicate when the AI service is unavailable
- Converted 500 Internal Server Error responses to more appropriate 400 Bad Request responses with clear error messages
- Added optional chaining for error message checks to prevent null reference errors

## Best Practices for Error Handling in MCP

1. **Proper Exception Types**:

   - Use specific exception types (`BadRequestException`, `NotFoundException`, etc.) instead of generic errors
   - Include descriptive error messages that help clients understand what went wrong

2. **Custom Exception Handling**:

   - Use the `HttpExceptionFilter` to standardize error responses
   - Map internal errors to appropriate HTTP status codes

3. **Race Condition Prevention**:

   - Use database transactions for related operations
   - Apply pessimistic locks for concurrent update scenarios
   - Implement retry logic for operations that may fail due to concurrency

4. **Validation Errors**:

   - Always return 400 Bad Request for validation failures
   - Include details about which field failed validation and why
   - Validate inputs early to prevent deeper errors

5. **Non-Blocking Metrics and Logging**:
   - Ensure that failures in metrics or logging don't affect core application functionality
   - Catch and handle errors in non-critical services appropriately

## How to Test

To test proper error handling:

1. **Validation Errors**:

   ```bash
   curl --location 'http://localhost:3001/api/v1/mcp/resources/task' \
   --header 'Authorization: Bearer YOUR_TOKEN' \
   --header 'Content-Type: application/json' \
   --data '{
     "properties": {
       "title": "Test Task",
       "description": "Test Description",
       "priority": "high",
       "dueDate": "2023-05-10T17:00:00Z",  # Past date
       "status": "not_started"
     },
     "relationships": {
       "project": {
         "id": "PROJECT_ID"
       }
     }
   }'
   ```

   Should return a 400 Bad Request error with a clear message about the due date being in the past.

2. **Successful Task Creation**:

   ```bash
   curl --location 'http://localhost:3001/api/v1/mcp/resources/task' \
   --header 'Authorization: Bearer YOUR_TOKEN' \
   --header 'Content-Type: application/json' \
   --data '{
     "properties": {
       "title": "Test Task",
       "description": "Test Description",
       "priority": "high",
       "dueDate": "2026-05-10T17:00:00Z",  # Future date
       "status": "not_started"
     },
     "relationships": {
       "project": {
         "id": "PROJECT_ID"
       }
     }
   }'
   ```

   Should successfully create the task and return a 201 Created response.

3. **Concurrent Requests**:
   Run multiple task creation requests simultaneously to test that the API metrics race condition has been fixed.

4. **AI Service Actions**:

   ```bash
   curl --location 'http://localhost:3001/api/v1/mcp/actions' \
   --header 'Authorization: Bearer YOUR_TOKEN' \
   --header 'Content-Type: application/json' \
   --data '{
     "name": "createTaskFromNLP",
     "parameters": {
       "input": "Remind me to send the project report tomorrow at 9am",
       "projectId": "PROJECT_ID"
     }
   }'
   ```

   If the AI service is unavailable, you should receive a 400 Bad Request response with a clear message:

   ```json
   {
     "errors": [
       {
         "status": "400",
         "code": "invalid_request",
         "title": "Bad Request",
         "detail": "AI service is currently unavailable. Please try again later."
       }
     ],
     "meta": {
       "apiVersion": "1.0",
       "timestamp": "2025-03-21T15:30:04.624Z"
     }
   }
   ```
