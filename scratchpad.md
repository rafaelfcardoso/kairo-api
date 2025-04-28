# Database Scalability Review and Action Plan

## Background and Motivation

- The database schema has grown organically and now requires a structured review to ensure long-term scalability, clarity, and maintainability.
- Key motivations: eliminate legacy artifacts, reduce technical debt (especially around user and tag tables), optimize for performance, and establish a strong foundation for future features.
- This review validates the assumptions and recommendations made in `db-schema-review.md` against the current codebase and migrations.

## Project Status Board

- [ ] Drop legacy NLP tables (`nlp_feedback`, `nlp_model_performance`) if no code references remain.
- [ ] Clarify if a duplicate `user` table exists; otherwise, mark the consolidation step as outdated.
- [ ] Rename `task_tags_tag` join table to `task_tag` for clarity and consistency.
- [ ] Audit and add missing foreign key constraints (with `ON DELETE CASCADE`) for all core relationships (`task`, `project`, `tag`, join tables).
- [ ] Audit and add uniqueness constraints (e.g., `(user_id, name)` on `tag`).
- [ ] Audit and add indexes on all foreign key columns and join tables for performance.
- [ ] Document the final schema and establish naming conventions and migration best practices.

## Executor's Feedback or Assistance Requests

- Confirmed: legacy NLP tables exist and can be dropped if unused.
- Only `users` table is present; no evidence of a separate `user` table. Clarification needed before proceeding with consolidation.
- `task_tags_tag` exists as the join table; renaming is reasonable for clarity.
- Many foreign keys and indexes are present, but a full audit is recommended to ensure completeness.
- Uniqueness constraints exist on user identity fields, but not all tag uniqueness is enforced; audit needed.
- Documentation and conventions are not programmatically enforced but are recommended for maintainability.

## Lessons

- Use tenant-scoped defaults rather than shared global entities for better security and flexibility.
- Always ensure DTOs match the service method signature to avoid runtime/type errors.
- Import enums and services from their canonical project paths to prevent module resolution issues.
- Always validate legacy cleanup and consolidation steps against the actual schema to avoid redundant work.
- Consistent naming and indexing are critical for scalability and onboarding.
- Schema documentation and migration best practices reduce confusion and technical debt.