# Database Scalability Review and Action Plan

## Background and Motivation

- The database schema has grown organically and now requires a structured review to ensure long-term scalability, clarity, and maintainability.
- Key motivations: eliminate legacy artifacts, reduce technical debt (especially around user and tag tables), optimize for performance, and establish a strong foundation for future features.
- This review validates the assumptions and recommendations made in `db-schema-review.md` against the current codebase and migrations.

## Project Status Board

- [x] Drop legacy NLP tables (`nlp_feedback`, `nlp_model_performance`) if no code references remain.
- [x] Clarify if a duplicate `user` table exists; otherwise, mark the consolidation step as outdated.
- [x] Rename `task_tags_tag` join table to `task_tag` for clarity and consistency.
- [x] Audit and add missing foreign key constraints (with `ON DELETE CASCADE`) for all core relationships (`task`, `project`, `tag`, join tables).
- [x] Audit and add uniqueness constraints (e.g., `(user_id, name)` on `tag`).
- [x] Audit and add indexes on all foreign key columns and join tables for performance.
  - [x] List all foreign key columns in core and join tables.
  - [x] Check current migrations for existing indexes on those columns.
  - [x] Identify missing indexes needing migration.
  - [x] Create migration to add the missing indexes.
  - [x] Import and register the new migration.
  - [x] Run migration and verify index creation.
- [ ] Document the final schema and establish naming conventions and migration best practices.

## Executor's Feedback or Assistance Requests

- Confirmed: legacy NLP tables exist and can be dropped if unused.
- Only `users` table is present; no evidence of a separate `user` table. Consolidation step is outdated and not needed.
- `task_tags_tag` exists as the join table; renaming is reasonable for clarity.
- Many foreign keys and indexes are present, but a full audit is recommended to ensure completeness.
- Uniqueness constraints exist on user identity fields, but not all tag uniqueness is enforced; audit needed.
- Documentation and conventions are not programmatically enforced but are recommended for maintainability.
- NLP legacy tables (`nlp_feedback`, `nlp_model_performance`) have no remaining code references except in migrations and planning docs. It is safe to proceed with dropping them from the schema. Prepare a migration to drop these tables.
- No duplicate `user` table exists; only `users` is present. The consolidation/merge step is unnecessary and can be marked as resolved.
- Ran migration to rename `task_tags_tag` to `task_tag` and update constraints. Migration executed successfully and DB is up to date.
- Duplicate tags for (userId, name) were cleaned up by keeping the oldest per user. Unique constraint migration then succeeded.
- Indexes for all missing foreign key columns in join tables were added and verified via migration.
- All migrations executed successfully and the schema is now up to date for constraints and indexing.

## Lessons

- Use tenant-scoped defaults rather than shared global entities for better security and flexibility.
- Always ensure DTOs match the service method signature to avoid runtime/type errors.
- Import enums and services from their canonical project paths to prevent module resolution issues.
- Always validate legacy cleanup and consolidation steps against the actual schema to avoid redundant work.
- Consistent naming and indexing are critical for scalability and onboarding.
- Always confirm absence of code references before dropping legacy tables or columns.
- Always verify if a migration or consolidation step is still needed before implementation.
- Always verify all migrations are imported and registered before running them.
- Always clean up duplicate data before adding unique constraints to avoid migration failures.