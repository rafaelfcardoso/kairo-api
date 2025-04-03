# Application Layer Test Plan

This document outlines the testing strategy for the application layer services in Zenith API.

### Services Under Test

- `TaskService`: Manages CRUD operations and business logic for tasks
- `RecurringTaskService`: Handles recurring task creation and scheduling

### Test Implementation Status

#### TaskService

- **Basic Tests**:

  - ✅ Constructor and initialization
  - ✅ Input validation (validateInput method)
  - ✅ Date validation (validateDate method)
  - ✅ Task retrieval (getTasks method)
  - ✅ Individual task retrieval (getTaskById method)
  - ✅ Complete overdue tasks functionality

- **In Progress/Planned**:
  - ⬜ Task creation with project assignment
  - ⬜ Task update validations
  - ⬜ Task completion workflow
  - ⬜ Task deletion and archiving
  - ⬜ Task filtering and queries

#### RecurringTaskService

- **Basic Tests**:

  - ✅ Constructor and initialization
  - ✅ Next occurrence calculation for various recurrence patterns:
    - ✅ Daily recurrence
    - ✅ Weekly recurrence
    - ✅ Monthly recurrence
    - ✅ Yearly recurrence
  - ✅ Helper methods:
    - ✅ extractRecurrencePattern
    - ✅ fixRecurrenceRule

- **In Progress/Planned**:
  - ⬜ Task generation from templates
  - ⬜ Handling recurring task completion
  - ⬜ Scheduling of next occurrences
  - ⬜ Edge cases in recurrence patterns
  - ⬜ Error handling for invalid inputs

### Test Organization

All application layer tests are now located in `/test/unit/application/task-management/` with the following files:

- `task.service.spec.ts` - Tests for TaskService
- `recurring-task.service.spec.ts` - Tests for RecurringTaskService
- `complete-overdue-tasks.spec.ts` - Specific tests for overdue task completion functionality

### Test Execution

Application layer tests can be run using:

```bash
npm run test:application
```

For coverage information:

```bash
npm run test:application:cov
```

### Next Steps

1. Complete implementation of remaining test cases for TaskService
2. Implement more comprehensive tests for RecurringTaskService
3. Add tests for edge cases and error conditions
4. Increase overall test coverage for the application layer
5. Add integration tests for interactions between services
