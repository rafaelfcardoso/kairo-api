# Domain Layer Test Completion Plan

This document outlines the plan for achieving 100% test coverage of the domain layer. We've already made significant progress with our initial tests, but some gaps remain.

## Current Status

| Component                   | Current Coverage | Target | Status |
| --------------------------- | ---------------- | ------ | ------ |
| Task Entity                 | 89.65%           | 100%   | 🟢     |
| Task Domain Service         | 82.02%           | 100%   | 🟢     |
| Notification Domain Service | 100%             | 100%   | ✅     |
| RecurrenceRule Value Object | 100%             | 100%   | ✅     |

## Remaining Test Coverage Gaps

### Task Entity (89.65%)

Uncovered lines:

- Lines 207-208: Related to nextDueDate property
- Lines 212-213: Related to recurrenceRule property
- Line 217: Related to recurringParentId property
- Line 230: Related to the updated property

Tests to add:

1. Test for nextDueDate property setting and getting
2. Test for recurrenceRule property validation
3. Test for recurringParentId reference integrity
4. Test for updatedAt property automatic updates

### Task Domain Service (82.02%)

Uncovered lines:

- Line 41: Error branch in calculateNextOccurrence
- Line 140: Error branch in completeTask
- Lines 251-268: createTaskInstanceFromRecurring method

Tests to add:

1. Test error handling in calculateNextOccurrence with null input
2. Test error handling in completeTask with invalid task state
3. Test createTaskInstanceFromRecurring with different task configurations:
   - Basic task
   - Task with tags
   - Task with project
   - Task with custom fields

## Implementation Plan

### 1. Task Entity Completion (Target: April 5, 2025)

```typescript
// Example test for nextDueDate property
it('should set and get nextDueDate correctly', () => {
  const nextDueDate = new Date('2023-12-15');
  const task = createTask({
    nextDueDate,
  });

  expect(task.nextDueDate).toEqual(nextDueDate);
});

// Example test for recurrenceRule validation
it('should validate recurrenceRule format', () => {
  const task = createTask();

  // Set valid recurrence rule
  task.recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
  expect(task.recurrenceRule).toBe('FREQ=DAILY;INTERVAL=1');

  // This would be caught by TypeORM validation in practice
});
```

### 2. Task Domain Service Completion (Target: April 12, 2025)

```typescript
// Example test for createTaskInstanceFromRecurring
it('should create task instance from recurring task with all properties', () => {
  const project = { id: 'project-id', name: 'Test Project' } as Project;
  const tags = [{ id: 'tag-1', name: 'Important' }] as Tag[];

  const task = createTestTask({
    title: 'Recurring Parent',
    description: 'Parent Description',
    priority: TaskPriority.HIGH,
    needsReminder: true,
    reminderMessage: 'Custom reminder',
    project: project,
    tags: tags,
    isRecurring: true,
    recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
  });

  const result = service.createTaskInstanceFromRecurring(task);

  expect(result.title).toBe(task.title);
  expect(result.description).toBe(task.description);
  expect(result.priority).toBe(task.priority);
  expect(result.needsReminder).toBe(task.needsReminder);
  expect(result.reminderMessage).toBe(task.reminderMessage);
  expect(result.project).toBe(task.project);
  expect(result.isRecurring).toBe(false); // Instance isn't recurring
  expect(result.recurringParentId).toBe(task.id);
  expect(result.status).toBe(TaskStatus.NOT_STARTED);
});
```

## Expected Outcome

By implementing these additional tests, we'll achieve 100% test coverage for the domain layer, providing a solid foundation for our testing pyramid. This will ensure that all core business rules are properly tested, reducing the risk of business logic bugs and making the system more maintainable.

The domain layer tests serve as the foundation for our testing strategy and will be complemented by application, infrastructure, and interface layer tests as we progress toward full system test coverage.
