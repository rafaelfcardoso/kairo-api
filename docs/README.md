# Zenith API Documentation

Welcome to the Zenith API documentation. This directory contains all the documentation for the Zenith API project.

## Documentation Structure

The documentation is organized into the following directories:

- **active/**: Current, actively maintained documentation
- **deprecated/**: Documentation that is no longer current but may be useful for reference
- **archive/**: Historical documentation that is no longer relevant

## Available Documentation

### Authentication

- [Apple Authentication Setup](active/apple-authentication.md): Guide for setting up Sign in with Apple

### Test Documentation

- [Test Coverage Plan](active/test-coverage-plan.md): Overview of test coverage goals and current progress
- [Test Database Setup](active/test-database-setup.md): Configuration and management of the test database
- [Application Layer Test Plan](active/application-layer-test-plan.md): Details on application service testing
- [Domain Layer Test Plan](active/domain-layer-test-plan.md): Details on domain entity and value object testing
- [Project Management Tests Summary](active/project-management-tests-summary.md): Summary of Project domain tests
- [Task Management Tests Summary](active/task-management-tests.md): Summary of the test implementation for the Task Management domain
- [Timeline and Analytics Tests](active/timeline-analytics-tests.md): Coverage of project timeline and health analytics
- [Search and Navigation Tests](active/search-navigation-tests.md): Coverage of project search and breadcrumb navigation features
- [Task-Project Interaction Tests](active/task-project-interaction-tests.md): Tests for task creation and duplication with project association
- [Project Hierarchy Edge Case Tests](active/project-hierarchy-edge-case-tests.md): Tests for circular references, deep nesting, and system project restrictions

### Architecture Documentation

- [Domain-Driven Design Overview](active/domain-driven-design.md): Explanation of our DDD approach
- [API Structure](active/api-structure.md): Overview of API endpoints and organization
- [Database Schema](active/database-schema.md): Description of database models and relationships

### Development Guides

- [Development Setup](active/development-setup.md): How to set up the development environment
- [Contribution Guidelines](active/contribution-guidelines.md): How to contribute to the project
- [Coding Standards](active/coding-standards.md): Code style and best practices

### Feature Documentation

- [Project Management](active/project-management.md): Documentation for the project management domain
- [Task Management](active/task-management.md): Documentation for the task management domain
- [Tag Management](active/tag-management.md): Documentation for the tag management domain
- [AI Integration](active/ai-integration.md): Documentation for the AI integration features
- [Timeline and Analytics Implementation](active/timeline-analytics-implementation.md): Details on project analytics features implementation
- [Search and Navigation Implementation](active/search-navigation-implementation.md): Details on project search and navigation features implementation

### Implementation Documentation

- [Search and Navigation Implementation](active/search-navigation-implementation.md): Details on project search and navigation features implementation
- [Task-Project Interaction Implementation Summary](active/implementation-summary.md): Summary of task-project interaction test implementation
- [Project Repository Implementation](active/project-repository-implementation.md): Details on testing the projects repository infrastructure

## Keeping Documentation Updated

When you make significant changes to the codebase, please update the relevant documentation. Follow these guidelines:

1. **Update Existing Documents**: If documentation exists for a feature you modified, update it.
2. **Create New Documents**: If you add a new feature, create new documentation in the appropriate section.
3. **Mark Deprecated Documents**: If a document is no longer current, move it to the `deprecated` directory.
4. **Update This Index**: Keep this index updated with new documentation files.

## Documentation Best Practices

1. Use clear, concise language
2. Include code examples where appropriate
3. Include diagrams for complex concepts
4. Keep documentation focused on a single topic
5. Use a consistent format across documents
