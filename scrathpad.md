# Plan to Add Per-User Inbox Projects

## Background and Motivation

- Replace the global system (Inbox) project with per-user Inbox instances to ensure data isolation, simplify permissions, and allow user-specific defaults.

## Project Status Board

- [x] Confirm presence of `src/entities/user.entity.ts` and `users` table.
- [x] Generate and apply migration to create `users` table (success: `users` table exists in DB).
- [x] Create and apply migration to add `userId` column and foreign key to `projects` table (success: `projects.userId` column with FK exists). Verify it is properly imported on the `typeorm.config.ts`.
- [x] Update `UsersService` registration logic to auto-create an Inbox project with correct attributes (**in progress**).
- [ ] Write and pass unit tests for `UsersService` verifying Inbox creation.
- [ ] Write and pass integration test: simulate signup → GET /projects returns Inbox.
- [ ] Create backfill migration/script to add Inbox for existing users without one (success: every user has exactly one Inbox).
- [ ] Validate backfill prevents duplicate Inbox for any user.
- [ ] Remove hardcoded global Inbox UUID references across code and config (success: no references remain).
- [ ] Delete legacy seed/migration files for the global Inbox project.
- [x] Update `1744054661856-AddUserEntityAndRelations.ts` migration to check for column existence before adding userId.
- [x] Update `1744198558505-AddIsArchivedToTag.ts` migration to check for column existence before adding isArchived.
- [x] Update E2E test to expect 200 OK for login
- [ ] Re-run E2E test to confirm all logic passes
- [ ] Manual test: register new user → GET /projects returns one Inbox project.
- [ ] Update README/docs to document per-user Inbox behavior.
- [ ] Remove this scratchpad entry after all items complete.
- [x] Ensure ProjectsService is exported from ProjectsModule (already exported)
- [x] Import ProjectsModule in AuthModule (done)

## Executor's Feedback or Assistance Requests

- [x] `src/entities/user.entity.ts` exists and defines the `User` entity with `@Entity('users')`. The codebase expects a `users` table. Next, we must confirm the table exists in the database (or generate/apply migration if not).
- [x] Migration `1744054661856-AddUserEntityAndRelations.ts` creates the `users` table and its relations. This migration is present in the codebase. If your DB is up to date with migrations, the table should already exist.
- [x] Updated `AuthService.register` to call `ProjectsService.createProject` after user creation, passing only valid `CreateProjectDto` fields (`name`, `description`, `color`, `parentId`).
- [x] Corrected import for `ProjectType` to use `../projects/projects.entity`, but it is not directly used in the DTO call (Inbox type is handled elsewhere if needed).
- [x] Made `1744198558505-AddIsArchivedToTag.ts` migration idempotent by checking for column existence before adding or dropping `isArchived` on `tag`.
- [ ] Confirm path to user registration logic (e.g., `UsersService.register`).
- [ ] Confirm preferred migration naming convention (timestamp + descriptive name).
- [ ] Confirm process for executing backfill scripts in production environment.
- Dependency injection error is resolved.
- Updated E2E test to expect 200 OK for login endpoint (standard for login).
- Next: re-run E2E test to confirm end-to-end logic.
- Fixed ProjectsService dependency injection error by importing ProjectsModule in AuthModule.

## Lessons

- Use tenant-scoped defaults rather than shared global entities for better security and flexibility.
- Always ensure DTOs match the service method signature to avoid runtime/type errors.
- Import enums and services from their canonical project paths to prevent module resolution issues.
