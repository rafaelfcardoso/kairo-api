# Background and Motivation

The reminder migration (`AddReminderColumnsToTask20250428180000`) is running before the `task` table exists, causing a `relation "task" does not exist"` error in tests. We need to verify migration ordering and test DB setup to ensure the initial schema is applied first.

## Project Status Board

- [ ] Confirm `InitialSchema1705759726000` is first in the migrations import and array.
- [ ] Ensure `testDataSource.runMigrations()` executes all migrations in order.
- [ ] Add logging or assertion to verify each migration runs during global setup.
- [ ] Fix any misconfigurations in `src/config/typeorm.config.ts` or `test/setup-test-db.ts`.
- [ ] Rerun the reminder E2E test and confirm it passes.

## Lessons

- The order of migrations in `typeorm.config.ts` directly affects test database setup.
- Test setup global scripts must drop and recreate the test DB before migrations.
