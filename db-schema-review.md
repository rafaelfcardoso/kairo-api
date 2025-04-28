Database Schema Review and Action Plan

Background and Motivation

During the development of our Task Management Application (similar to Todoist), the database schema has evolved organically. As features like tagging, project nesting, and focus sessions were added, migrations and schema changes were frequent. Now that the system has matured, the schema requires a structured review to ensure long-term scalability, clarity, and maintainability.

Motivations for this effort:
• Eliminate legacy artifacts that cause confusion (e.g., NLP tables).
• Reduce technical debt by merging duplicate user tables.
• Optimize schema for performance and ease of extension.
• Establish a strong foundation for future features (e.g., task sharing, collaboration).

Current Database Overview

Core Tables
• user: User accounts.
• project: Projects belonging to users.
• project_closure: Hierarchical relationships between projects.
• task: Tasks belonging to projects and users.
• tag: Tags created by users.
• task_tag: Many-to-many join between tasks and tags.

Supporting Tables
• focus_session, task_focus_sessions_focus_session: Focus tracking.
• block_setting, block_rule: Session blocking preferences.
• schedule: Possibly task scheduling (needs clarification).

Analytics and Infrastructure
• api_metrics, api_request_log, system_health, migrations

Legacy
• nlp_feedback, nlp_model_performance

Plan of Action

Phase 1: Cleanup
• Drop nlp_feedback and nlp_model_performance tables.
• Consolidate user and users tables into a single source of truth.
• Rename task_tags_tag to task_tag for clarity.

Phase 2: Strengthen Data Integrity
• Add foreign key constraints with ON DELETE CASCADE:
• task.user_id
• task.project_id
• tag.user_id
• task_tag.task_id, task_tag.tag_id
• Add unique constraints:
• Unique (user_id, name) on tag

Phase 3: Optimize for Performance
• Add indexes on foreign key columns:
• task.user_id, task.project_id
• task_tag.task_id, task_tag.tag_id
• project.user_id
• project_closure.ancestor_id, descendant_id

Phase 4: Documentation
• Document final database schema with ER diagrams.
• Establish naming conventions and migration best practices.

Tasks

Task Owner Priority Notes
Drop legacy NLP tables DBA High Confirm no code references exist
Merge user and users Backend High Plan data migration if needed
Rename task_tags_tag DBA Medium Adjust backend references
Add foreign keys and constraints DBA High
Add indexes DBA High
Update documentation Tech Writer / Engineer Medium Post-schema stabilization

Goal

Deliver a scalable, clean, and maintainable database foundation for the Task Management Application by the end of Q2. This will enable efficient feature development and easier onboarding of new engineers.

# Zenith API Database Schema Review (2025-04-28)

## 1. Core Tables and Relationships

| Table                | Key Columns / FKs           | Relationships / Constraints                        |
|----------------------|-----------------------------|----------------------------------------------------|
| users                | id (PK)                     | One-to-many: project, task, tag, focus_session     |
| project              | id (PK), userId (FK)        | Many-to-one: users                                 |
| task                 | id (PK), userId (FK)        | Many-to-one: users                                 |
| tag                  | id (PK), userId (FK), name  | Many-to-one: users; UNIQUE(userId, name)           |
| focus_session        | id (PK), userId (FK), projectId (FK) | Many-to-one: users, project                |
| task_tag             | taskId (FK), tagId (FK)     | Join: task <-> tag                                 |
| task_focus_sessions  | taskId (FK), focusSessionId (FK) | Join: task <-> focus_session                 |
| project_closure      | id_ancestor (FK), id_descendant (FK) | Tree closure for projects                |

## 2. Constraints and Indexes

- **Foreign Keys:**
  - All FK columns have explicit constraints and ON DELETE CASCADE as appropriate.
- **Unique Constraints:**
  - `tag`: UNIQUE(userId, name)
- **Indexes:**
  - All FK columns in core and join tables are indexed for performance.
  - Example indexes:
    - `IDX_f316d3fe53497d4d8a2957db8b` on `task(userId)`
    - `IDX_7c4b0d3b77eaf26f8b4da879e6` on `project(userId)`
    - `IDX_e12875dfb3b1d92d7d7c5377e2` on `tag(userId)`
    - `IDX_task_tag_taskId` on `task_tag(taskId)`
    - `IDX_task_tag_tagId` on `task_tag(tagId)`
    - `IDX_project_closure_id_ancestor` on `project_closure(id_ancestor)`
    - `IDX_project_closure_id_descendant` on `project_closure(id_descendant)`

## 3. Naming Conventions

- **Tables:**
  - Use singular, lowercase, snake_case (e.g., `focus_session`, `task_tag`)
- **Columns:**
  - Use snake_case; foreign keys end with `Id` (e.g., `userId`, `projectId`)
- **Constraints:**
  - Unique: `UQ_<table>_<cols>` (e.g., `UQ_tag_userId_name`)
  - Foreign key: `FK_<table>_<ref_table>`
- **Indexes:**
  - `IDX_<table>_<column>` or auto-generated by TypeORM

## 4. Migration Best Practices

- **Order of Operations:**
  - Clean up duplicate or invalid data before adding unique constraints.
  - Add foreign keys and indexes after core table creation.
  - Always register new migrations in `typeorm.config.ts` before running them.
- **Testing:**
  - Run migrations in a development environment first.
  - Use `npx typeorm migration:run` and verify DB state.
- **Rollback:**
  - Ensure all migrations have a working `down` method for reversibility.
- **Documentation:**
  - Update this document and the project scratchpad after major schema changes.

## 5. Lessons Learned

- Always audit for duplicate data before enforcing uniqueness.
- Indexing all FK columns in join tables significantly improves query performance.
- Consistent naming conventions reduce confusion and onboarding time.

---

_Last updated: 2025-04-28_

⸻

Generated by Software Architect GPT
