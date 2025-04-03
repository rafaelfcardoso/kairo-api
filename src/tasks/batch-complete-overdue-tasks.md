# Batch Complete Overdue Tasks - Implementation Guide

## Problem Statement

Users need the ability to quickly complete all overdue tasks with "not_started" status through a single command to the AI assistant. Currently, when a user asks the assistant to "complete all tasks with status 'not_started' that are overdue," there is no dedicated endpoint or functionality to handle this batch operation efficiently.

The AI assistant should be able to:

1. Understand the user's intent to complete multiple overdue tasks
2. Execute this operation through a proper API endpoint
3. Return appropriate feedback on the completed operation

## Current Implementation

Currently, the system has:

- An endpoint to view overdue tasks (`/api/v1/tasks/views/overdue`)
- Individual task update endpoints
- Batch update capabilities (`/api/v1/tasks/batch`)

However, there is no dedicated endpoint specifically for the common use case of completing all overdue tasks at once.

## Proposed Solution

### 1. Create a New API Endpoint

Add a new endpoint to the NestJS API server that specifically handles completing all overdue tasks in a single operation.

```typescript
// tasks.controller.ts
@Post('batch/complete-overdue')
async completeOverdueTasks(
  @Body() options: CompleteOverdueTasksDto,
  @User() user: UserEntity
): Promise<CompleteOverdueTasksResponseDto> {
  return this.tasksService.completeOverdueTasks(user.id, options);
}
```

### 2. Implement the Service Method

```typescript
// tasks.service.ts
async completeOverdueTasks(
  userId: string,
  options: CompleteOverdueTasksDto
): Promise<CompleteOverdueTasksResponseDto> {
  // Get all overdue tasks with not_started status
  const overdueTasks = await this.taskRepository.find({
    where: {
      userId,
      status: 'not_started',
      dueDate: LessThan(new Date()),
      ...options.additionalFilters
    },
  });

  if (overdueTasks.length === 0) {
    return {
      success: true,
      tasksCompleted: 0,
      message: 'No overdue tasks found to complete.'
    };
  }

  // Update all tasks to completed status
  const taskUpdates = overdueTasks.map(task => ({
    id: task.id,
    status: 'completed',
    completedAt: new Date()
  }));

  await this.taskRepository.save(taskUpdates);

  return {
    success: true,
    tasksCompleted: overdueTasks.length,
    message: `Successfully completed ${overdueTasks.length} overdue tasks.`
  };
}
```

### 3. Define DTOs

```typescript
// complete-overdue-tasks.dto.ts
export class CompleteOverdueTasksDto {
  @IsOptional()
  @IsObject()
  additionalFilters?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  includeBlockedTasks?: boolean = false;
}

export class CompleteOverdueTasksResponseDto {
  @IsBoolean()
  success: boolean;

  @IsNumber()
  tasksCompleted: number;

  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  completedTaskIds?: string[];
}
```

## Integration with AI Client

The AI client's task service needs to be updated to include a method for calling this new endpoint:

```typescript
// In the NestJSApiClient class
async completeOverdueTasks(options: any = {}): Promise<any> {
  const url = `${this.api_url}/tasks/batch/complete-overdue`;

  try {
    async with httpx.AsyncClient() as client:
      response = await client.post(
        url,
        headers=this._get_headers(),
        json=options
      )
      response.raise_for_status()
      return response.json()
  } catch (error) {
    this.logger.error(`Error completing overdue tasks: ${error}`);
    throw error;
  }
}
```

Then, update the TaskService to handle this specific intent:

```python
# In the TaskService class
async def complete_overdue_tasks(self, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Complete all overdue tasks with 'not_started' status.

    Args:
        options: Optional parameters for filtering which overdue tasks to complete

    Returns:
        Response with the number of tasks completed and success status
    """
    try:
        # Call the NestJS API to complete overdue tasks
        result = await self.nestjs_client.complete_overdue_tasks(options or {})

        return {
            "success": True,
            "tasks_completed": result.get("tasksCompleted", 0),
            "message": result.get("message", "Completed overdue tasks")
        }
    except Exception as e:
        logger.error(f"Error completing overdue tasks: {e}")
        raise Exception(f"Failed to complete overdue tasks: {str(e)}")
```

## Testing

1. Unit tests for the new endpoint
2. Integration tests for the batch complete operation
3. End-to-end tests with the AI assistant integration

Example test:

```typescript
describe('CompleteOverdueTasks', () => {
  it('should complete all overdue not_started tasks', async () => {
    // Create test tasks that are overdue
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tasksRepository.save([
      {
        title: 'Overdue Task 1',
        status: 'not_started',
        dueDate: yesterday,
        userId: testUser.id,
      },
      {
        title: 'Overdue Task 2',
        status: 'not_started',
        dueDate: yesterday,
        userId: testUser.id,
      },
    ]);

    // Call the endpoint
    const response = await request(app.getHttpServer())
      .post('/api/v1/tasks/batch/complete-overdue')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});

    // Assert response
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tasksCompleted).toBe(2);

    // Verify tasks were updated in the database
    const tasks = await tasksRepository.find({ userId: testUser.id });
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    expect(completedTasks.length).toBe(2);
  });
});
```

## Security Considerations

1. Ensure proper authorization checks to prevent unauthorized access
2. Validate user ID to prevent cross-user task manipulation
3. Consider rate limiting to prevent abuse of the batch operation
4. Add transaction support to ensure atomic operations

## Performance Considerations

For users with a large number of tasks:

1. Consider implementing pagination or chunking for very large task sets
2. Add timeout handling for long-running operations
3. Implement background processing for extremely large batches
4. Add progress tracking for lengthy operations

## Conclusion

This implementation provides a clean, efficient way for users to complete all their overdue tasks with a single request. The dedicated endpoint simplifies the client implementation and improves performance by handling the batch operation server-side.
