# Test Coverage Plan

This document outlines our plan for improving test coverage across the Zenith API.

### Current Structure

- `/test/unit/domain/`: Domain layer tests
- `/test/unit/application/`: Application layer tests
- `/test/unit/infrastructure/`: Infrastructure layer tests
- `/test/unit/interface/`: Interface layer tests
- `/test/integration/`: Integration tests

### Test Coverage Goals

- Domain Layer: 90%+ coverage
- Application Layer: 80%+ coverage
- Infrastructure Layer: 70%+ coverage
- Interface Layer: 70%+ coverage
- Integration Tests: Key workflows

### Next Steps

#### Domain Layer Tests

- ✅ Create test environment setup
- ✅ Create tests for Task entity
- ✅ Create tests for Project entity
- ⬜ Create tests for Tag entity
- ⬜ Create tests for User entity
- ⬜ Create tests for domain services

#### Application Layer Tests

- ✅ Create test plan for application services
- ✅ Initial tests for TaskService (constructor, initialization, input validation, retrieval methods)
- ✅ Initial tests for RecurringTaskService (constructor, calculateNextOccurrence, helper methods)
- ✅ Implement tests for completeOverdueTasks functionality
- ⬜ Tests for createTask, updateTask methods
- ⬜ Tests for task completion workflows
- ⬜ Tests for task scheduling

#### Infrastructure Layer Tests

- ✅ Set up test structure for repositories
- ✅ Initial tests for TaskRepository
- ⬜ Complete repository test coverage
- ⬜ Tests for database interactions

#### Interface Layer Tests

- ✅ Set up test structure for controllers
- ✅ Initial tests for TaskController
- ⬜ Complete controller test coverage
- ⬜ Tests for API endpoints and validation

#### Integration Tests

- ✅ Set up integration test structure
- ✅ Tests for recurring task workflow
- ✅ Tests for task security
- ✅ Tests for task service integrations
- ✅ End-to-end workflow tests for task creation
- ✅ End-to-end workflow tests for task completion
- ✅ End-to-end workflow tests for recurring task scheduling
- ✅ End-to-end workflow tests for notification generation

### Test Reorganization Progress

We've completed reorganizing tests from the legacy structure in `/src/tasks/tests/` to our new organized structure:

- ✅ Moved `task-dto.unit.spec.ts` → `/test/unit/domain/task-management/task.dto.spec.ts`
- ✅ Moved `task-repository.unit.spec.ts` → `/test/unit/infrastructure/task-management/task.repository.spec.ts`
- ✅ Moved `task-controller.unit.spec.ts` → `/test/unit/interface/task-management/tasks.controller.spec.ts`
- ✅ Moved `complete-overdue-tasks.spec.ts` → `/test/unit/application/task-management/complete-overdue-tasks.spec.ts`
- ✅ Moved integration tests to `/test/integration/task-management/`:
  - `recurring-task-workflow.integration.spec.ts`
  - `task-security.integration.spec.ts`
  - `task-service.integration.spec.ts`

### Additional Tests Needed

- Tests for error handling across all layers
- Tests for edge cases in recurring task generation
- Performance tests for bulk operations
- Security-focused tests for all public endpoints

## Test Structure

Our tests are organized according to the Domain-Driven Design (DDD) architecture of the application:

1. **Unit Tests**: Testing individual components in isolation

   - Domain Layer: Value objects, Entities, Domain Services
   - Application Layer: Application Services, Use Cases
   - Infrastructure Layer: Repositories, External Services

2. **Integration Tests**: Testing components working together

   - Repository with Database
   - Services with Repositories
   - Controllers with Services

3. **End-to-End Tests**: Testing complete flows through the API

   - API Endpoints with all underlying components

4. **Acceptance Tests**: Testing business requirements

   - Task Management Workflows
   - Project Management Workflows

5. **Test Utilities**: Supporting code for tests
   - Factories
   - Fixtures
   - Mocks

## Coverage Goals by Layer

| Layer          | Target | Current | Status         |
| -------------- | ------ | ------- | -------------- |
| Domain         | 100%   | 100%    | ✅ Completed   |
| Application    | 100%   | ~35%    | 🟢 In progress |
| Infrastructure | 100%   | 0%      | ⚪ Not started |
| Interface      | 100%   | 0%      | ⚪ Not started |
| **Overall**    | 100%   | ~10%    | 🟢 In progress |

## Domain Layer Test Coverage

### Task Management Domain

| Component                   | Files                                                     | Tests                                                                   | Coverage | Status |
| --------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- | -------- | ------ |
| Task Entity                 | `src/tasks/tasks.entity.ts`                               | `test/unit/domain/task-management/task.entity.spec.ts`                  | 100%     | ✅     |
| Task Domain Service         | `src/tasks/tasks.domain.service.ts`                       | `test/unit/domain/task-management/task-domain.service.spec.ts`          | 95.74%   | ✅     |
| Notification Domain Service | `src/tasks/notification.domain.service.ts`                | `test/unit/domain/task-management/notification-domain.service.spec.ts`  | 100%     | ✅     |
| RecurrenceRule Value Object | `src/tasks/value-objects/recurrence-rule.value-object.ts` | `test/unit/domain/task-management/recurrence-rule.value-object.spec.ts` | 100%     | ✅     |

### Project Management Domain

| Component      | Files                             | Tests                                                        | Coverage | Status |
| -------------- | --------------------------------- | ------------------------------------------------------------ | -------- | ------ |
| Project Entity | `src/projects/projects.entity.ts` | `test/unit/domain/project-management/project.entity.spec.ts` | 91.66%   | ✅     |
| Project DTOs   | `src/projects/projects.dto.ts`    | `test/unit/domain/project-management/project.dto.spec.ts`    | 100%     | ✅     |

## Application Layer Test Coverage

### Task Management Application

| Component              | Files                                 | Tests                                                                  | Coverage            | Status         |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------------------- | ------------------- | -------------- |
| Task Service           | `src/tasks/tasks.service.ts`          | `test/unit/application/task-management/task.service.spec.ts`           | 41.8% (statements)  | 🟢 In progress |
| Recurring Task Service | `src/tasks/recurring-task.service.ts` | `test/unit/application/task-management/recurring-task.service.spec.ts` | 53.74% (statements) | 🟢 In progress |

### Project Management Application

| Component        | Files                              | Tests                                                               | Coverage                                                                 | Status         |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------- |
| Projects Service | `src/projects/projects.service.ts` | `test/unit/application/project-management/projects.service.spec.ts` | 95.45% (statements), 82.35% (branches), 100% (functions), 95.79% (lines) | 🟢 In progress |

#### Projects Service

- [x] Project CRUD operations
- [x] Project tree operations
- [x] Project analytics (getProjectStats, getProjectTimeline)
- [x] Project health calculation
- [x] Project search and navigation (searchProjects, getProjectBreadcrumb)
- [x] Task-Project interaction methods (duplicateTaskToProject, createTaskWithProject)
- [ ] Remaining methods that require additional coverage

## Test Progress Tracking

| Date       | Layer       | Component            | Progress                                                                                                                                                                                                        |
| ---------- | ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-03-29 | Domain      | Initial setup        | Task Entity (100%), Task Domain Service (100%), Notification Domain Service (100%), RecurrenceRule Value Object (100%)                                                                                          |
| 2025-04-02 | Application | Application Services | TaskService (32.76%), RecurringTaskService (53.74%) - Initial tests for constructor, validation, and core methods                                                                                               |
| 2025-04-03 | Application | TaskService          | Added tests for createTask method, improving coverage to 41.8%                                                                                                                                                  |
| 2025-04-30 | Domain      | Project Entity       | Added comprehensive tests for Project Entity (91.66%) and DTOs (100%)                                                                                                                                           |
| 2025-05-01 | Application | ProjectsService      | Implemented tests for 20 methods, including CRUD operations, tree navigation, and project duplication. Statement coverage: 47.27%                                                                               |
| 2025-05-02 | Application | ProjectsService      | Added tests for the mergeProjects method, improving statement coverage to 53.63%, branch coverage to 29.41%, and function coverage to 67.74%                                                                    |
| 2025-05-03 | Application | ProjectsService      | Added tests for Timeline and Analytics features (getProjectTimeline and calculateProjectHealth), improving statement coverage to 77.27%, branch coverage to 58.82%, and function coverage to 83.87%             |
| 2025-05-04 | Application | ProjectsService      | Added tests for Search and Navigation features (searchProjects and getProjectBreadcrumb), improving statement coverage to 80.90%, branch coverage remained at 58.82%, and function coverage increased to 90.32% |
| 2025-05-05 | Application | ProjectsService      | Added tests for Task-Project interaction methods (duplicateTaskToProject and createTaskWithProject), improving statement coverage to 92.72%, branch coverage to 76.47%, and function coverage to 96.77%         |
| 2025-05-06 | Application | ProjectsService      | Added edge case tests for Project Hierarchy (circular references, deep nesting, system projects), improving statement coverage to 95.45%, branch coverage to 82.35%, and function coverage to 100%              |

## Next Steps

1. ✅ Complete Domain Layer test coverage:

   - ✅ Complete Task Entity coverage (now 100%)
   - ✅ Complete TaskDomainService coverage (now 100%)
   - ✅ Complete Project Entity coverage (now 91.66%)
   - ✅ Complete Project DTOs coverage (now 100%)
   - 🟡 Next: Implement tests for Tag Entity

2. Continue Application Layer test coverage:

   - ✅ Create test plan for application services (see [Application Layer Test Plan](./application-layer-test-plan.md))
   - 🟢 Implement initial tests for TaskService
     - ✅ Constructor and Initialization
     - ✅ Input Validation Methods
     - ✅ Basic Task Retrieval Methods
     - ✅ Task Creation (createTask method)
     - 🟡 Next: Implement tests for updateTask method
   - 🟢 Implement initial tests for RecurringTaskService
     - ✅ Constructor and Initialization
     - ✅ Recurrence Calculation Methods
     - ✅ Helper Methods
     - 🟡 Next: Implement tests for Task Generation Methods
   - Create tests for task scheduling

3. Start Infrastructure Layer test coverage:

   - Create tests for repositories
   - Create tests for database interactions
   - Create tests for external services

4. Start Interface Layer test coverage:
   - Create tests for controllers
   - Create tests for DTOs and validation
   - Create tests for API endpoints

## Running Tests

To run Domain Layer tests:

```
npm run test:domain
```

To check Domain Layer test coverage:

```
npm run test:domain:cov
```

To run Application Layer tests:

```
npm run test:application
```
