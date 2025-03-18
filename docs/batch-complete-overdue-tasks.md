# Batch Complete Overdue Tasks

## Overview

This feature allows users to complete all overdue tasks with "not_started" status through a single API call. This is particularly useful for quickly cleaning up tasks that are past their due date but haven't been addressed yet.

## Implementation Details

The feature has been implemented with:

- A new endpoint at `/api/v1/tasks/batch/complete-overdue`
- Support for additional filtering options
- Option to include blocked tasks in the completion
- Comprehensive response with details about completed tasks
- Unit tests to verify the functionality

## How to Use the API Endpoint

### Endpoint

```
POST /api/v1/tasks/batch/complete-overdue
```

### Request Body

The request body is optional and supports the following parameters:

```json
{
  "additionalFilters": {
    "projectId": "123e4567-e89b-12d3-a456-426614174000"
  },
  "includeBlockedTasks": false
}
```

#### Parameters

- `additionalFilters` (optional): Object containing additional filters to apply when finding overdue tasks.
  - Example: Filter by specific project, tags, etc.
- `includeBlockedTasks` (optional, default: false): Whether to also complete tasks with "blocked" status.

### Authentication

The endpoint requires authentication. JWT token must be provided in the Authorization header. While authentication is required to access the endpoint, the operation will affect all matching overdue tasks regardless of ownership.

**Note:** In development environments, if no user ID is found, a fallback to 'development-user-id' is used to facilitate testing.

### Examples

#### Complete All Overdue Tasks

```bash
curl -X POST https://api.example.com/api/v1/tasks/batch/complete-overdue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Complete Overdue Tasks from a Specific Project

```bash
curl -X POST https://api.example.com/api/v1/tasks/batch/complete-overdue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"additionalFilters": {"projectId": "123e4567-e89b-12d3-a456-426614174000"}}'
```

#### Complete Both Not Started and Blocked Overdue Tasks

```bash
curl -X POST https://api.example.com/api/v1/tasks/batch/complete-overdue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"includeBlockedTasks": true}'
```

### Response

The endpoint returns a JSON object with information about the completion operation:

```json
{
  "success": true,
  "tasksCompleted": 5,
  "message": "Successfully completed 5 overdue tasks.",
  "completedTaskIds": [
    "task-id-1",
    "task-id-2",
    "task-id-3",
    "task-id-4",
    "task-id-5"
  ]
}
```

#### Response Fields

- `success`: Boolean indicating whether the operation was successful
- `tasksCompleted`: Number of tasks that were completed
- `message`: Human-readable message summarizing the operation
- `completedTaskIds`: Array of IDs of tasks that were completed (optional)

If no overdue tasks are found, the response will look like this:

```json
{
  "success": true,
  "tasksCompleted": 0,
  "message": "No overdue tasks found to complete."
}
```

## Technical Considerations

- The operation is atomic - all tasks are updated in a single database operation
- Only tasks with a due date in the past are considered overdue
- All matching tasks regardless of ownership will be affected (no user filtering)
- Archived tasks are automatically excluded from the operation
- Task IDs are included in the response to enable further operations if needed

## Use Cases

1. **Quick cleanup**: Complete all overdue tasks that you no longer need to worry about
2. **Project completion**: Mark all overdue tasks in a specific project as complete
3. **Automated workflows**: Integrate with systems to automatically mark tasks as complete after a certain period

## Error Handling

If there's an issue with the request body, a 400 Bad Request error will be returned with details about the validation errors.

## Testing

The feature has been tested with comprehensive unit tests that verify:

1. Successfully returning an empty result when no overdue tasks are found
2. Correctly completing multiple overdue tasks and returning the appropriate response
3. Properly including blocked tasks when the `includeBlockedTasks` option is enabled

### Test Structure

When writing tests for this feature, remember to properly mock the repository dependencies using the `getRepositoryToken` method from NestJS:

```typescript
{
  provide: getRepositoryToken(TasksRepository),
  useFactory: mockTasksRepository
}
```

This is crucial for NestJS to correctly resolve the repository dependencies that were injected with `@InjectRepository()`.
