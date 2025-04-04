Project Structure:

```
zenith-api
├─ .dockerignore
├─ .eslintrc.js
├─ .prettierrc
├─ API-DOCUMENTATION.md
├─ Dockerfile
├─ README-IMPROVEMENTS.md
├─ README-MCP.md
├─ README.md
├─ coverage
│  ├─ clover.xml
│  ├─ coverage-final.json
│  ├─ lcov-report
│  │  ├─ base.css
│  │  ├─ block-navigation.js
│  │  ├─ favicon.png
│  │  ├─ index.html
│  │  ├─ prettify.css
│  │  ├─ prettify.js
│  │  ├─ sort-arrow-sprite.png
│  │  ├─ sorter.js
│  │  └─ src
│  │     ├─ api-metrics
│  │     │  ├─ api-metrics.controller.spec.ts.html
│  │     │  ├─ api-metrics.controller.ts.html
│  │     │  ├─ api-metrics.module.spec.ts.html
│  │     │  ├─ api-metrics.module.ts.html
│  │     │  ├─ api-metrics.service.spec.ts.html
│  │     │  ├─ api-metrics.service.ts.html
│  │     │  └─ index.html
│  │     ├─ app.controller.spec.ts.html
│  │     ├─ app.controller.ts.html
│  │     ├─ app.module.ts.html
│  │     ├─ app.service.ts.html
│  │     ├─ auth
│  │     │  ├─ auth.controller.spec.ts.html
│  │     │  ├─ auth.controller.ts.html
│  │     │  ├─ auth.module.ts.html
│  │     │  ├─ auth.service.spec.ts.html
│  │     │  ├─ auth.service.ts.html
│  │     │  ├─ index.html
│  │     │  └─ jwt.strategy.ts.html
│  │     ├─ common
│  │     │  ├─ decorators
│  │     │  │  ├─ index.html
│  │     │  │  └─ user-id.decorator.ts.html
│  │     │  ├─ guards
│  │     │  │  ├─ index.html
│  │     │  │  └─ rate-limit.guard.ts.html
│  │     │  ├─ health
│  │     │  │  ├─ health.controller.spec.ts.html
│  │     │  │  ├─ health.controller.ts.html
│  │     │  │  ├─ health.module.ts.html
│  │     │  │  ├─ health.service.spec.ts.html
│  │     │  │  ├─ health.service.ts.html
│  │     │  │  └─ index.html
│  │     │  ├─ index.html
│  │     │  ├─ middleware
│  │     │  │  ├─ api-metrics.middleware.spec.ts.html
│  │     │  │  ├─ api-metrics.middleware.ts.html
│  │     │  │  ├─ index.html
│  │     │  │  ├─ request-sanitizer.middleware.ts.html
│  │     │  │  └─ security-headers.middleware.ts.html
│  │     │  ├─ pipes
│  │     │  │  ├─ index.html
│  │     │  │  └─ sanitize.pipe.ts.html
│  │     │  ├─ security.module.ts.html
│  │     │  └─ services
│  │     │     ├─ ai.module.ts.html
│  │     │     ├─ ai.service.ts.html
│  │     │     ├─ index.html
│  │     │     ├─ notification.module.ts.html
│  │     │     ├─ notification.service.ts.html
│  │     │     ├─ scheduler.module.ts.html
│  │     │     ├─ scheduler.service.ts.html
│  │     │     ├─ security-logger.service.ts.html
│  │     │     └─ tests
│  │     │        ├─ index.html
│  │     │        └─ scheduler.service.spec.ts.html
│  │     ├─ config
│  │     │  ├─ configuration.ts.html
│  │     │  ├─ constants.ts.html
│  │     │  ├─ index.html
│  │     │  └─ typeorm.config.ts.html
│  │     ├─ database
│  │     │  ├─ database-test.service.ts.html
│  │     │  ├─ database.module.ts.html
│  │     │  ├─ database.providers.ts.html
│  │     │  ├─ index.html
│  │     │  └─ migrations
│  │     │     ├─ 1741912345000-CreateNlpFeedbackTable.ts.html
│  │     │     └─ index.html
│  │     ├─ entities
│  │     │  ├─ api-metrics.entity.ts.html
│  │     │  ├─ block-rule.entity.ts.html
│  │     │  ├─ index.html
│  │     │  └─ system-health.entity.ts.html
│  │     ├─ focus-sessions
│  │     │  ├─ focus-sessions.controller.ts.html
│  │     │  ├─ focus-sessions.dto.ts.html
│  │     │  ├─ focus-sessions.entity.ts.html
│  │     │  ├─ focus-sessions.module.ts.html
│  │     │  ├─ focus-sessions.repository.ts.html
│  │     │  ├─ focus-sessions.service.ts.html
│  │     │  ├─ index.html
│  │     │  └─ tests
│  │     │     ├─ focus-sessions.controller.spec.ts.html
│  │     │     └─ index.html
│  │     ├─ index.html
│  │     ├─ main.ts.html
│  │     ├─ mcp
│  │     │  ├─ docs
│  │     │  │  ├─ index.html
│  │     │  │  ├─ response-examples.ts.html
│  │     │  │  └─ swagger.config.ts.html
│  │     │  ├─ filters
│  │     │  │  ├─ http-exception.filter.ts.html
│  │     │  │  └─ index.html
│  │     │  ├─ index.html
│  │     │  ├─ interceptors
│  │     │  │  ├─ api-version.interceptor.ts.html
│  │     │  │  └─ index.html
│  │     │  ├─ mcp.controller.ts.html
│  │     │  ├─ mcp.module.ts.html
│  │     │  ├─ mcp.service.ts.html
│  │     │  ├─ mcp.types.ts.html
│  │     │  └─ utils
│  │     │     ├─ index.html
│  │     │     └─ response.util.ts.html
│  │     ├─ migrations
│  │     │  ├─ 1686501234567-UpdateTaskEntityWithMetadata.ts.html
│  │     │  ├─ 1686501245678-SimplifyTaskEntity.ts.html
│  │     │  ├─ 1686501256789-CleanupUnusedTaskTypes.ts.html
│  │     │  ├─ 1705759726000-InitialSchema.ts.html
│  │     │  ├─ 1710000000000-AddNonePriorityEnum.ts.html
│  │     │  ├─ 1738178127099-AddNonePriorityEnum.ts.html
│  │     │  ├─ 1738360717263-AddSystemProjectAndInbox.ts.html
│  │     │  ├─ 1738362321118-FixProjectColors.ts.html
│  │     │  ├─ 1738362321119-EnsureInboxProject.ts.html
│  │     │  ├─ 1738934197033-AddHasTimeToTasks.ts.html
│  │     │  ├─ 1739279174960-UpdateTaskStatusEnum.ts.html
│  │     │  ├─ 1739279174961-EnsureValidTaskStatuses.ts.html
│  │     │  ├─ 1739279174962-AddProjectTypeEnum.ts.html
│  │     │  ├─ 1739279174963-AddFocusSessionEnergyLevelEnum.ts.html
│  │     │  ├─ 1739279174963-AddTaskTagsTable.ts.html
│  │     │  ├─ 1739279174964-AddBlockRuleTypeEnum.ts.html
│  │     │  ├─ 1740494148045-CreateFocusSessionTables.ts.html
│  │     │  ├─ 1740589432291-AddProjectIdToFocusSession.ts.html
│  │     │  ├─ 1740916550124-AddRecurringTaskFields.ts.html
│  │     │  ├─ 1741011691203-RemoveTaskTypeColumn.ts.html
│  │     │  ├─ 1741013788916-AddRecurrenceRuleColumn.ts.html
│  │     │  ├─ 1741014300000-AddNextDueDateColumn.ts.html
│  │     │  ├─ 1741607800000-AddIsGoalToTagTable.ts.html
│  │     │  ├─ 1741800000000-CreateSystemHealthTable.ts.html
│  │     │  ├─ 1741900000000-CreateApiMetricsTable.ts.html
│  │     │  ├─ 1741912345000-CreateNlpFeedbackTable.ts.html
│  │     │  ├─ 1742000000000-CreateNlpModelPerformanceTable.ts.html
│  │     │  ├─ 1743380485000-RemoveIsGoalFromTagTable.ts.html
│  │     │  ├─ base
│  │     │  │  ├─ BaseMigration.ts.html
│  │     │  │  └─ index.html
│  │     │  └─ index.html
│  │     ├─ nlp
│  │     │  ├─ config
│  │     │  │  ├─ ab-testing.config.ts.html
│  │     │  │  └─ index.html
│  │     │  ├─ controllers
│  │     │  │  ├─ ab-testing.controller.ts.html
│  │     │  │  └─ index.html
│  │     │  ├─ dto
│  │     │  │  ├─ index.html
│  │     │  │  └─ nlp.dto.ts.html
│  │     │  ├─ entities
│  │     │  │  ├─ index.html
│  │     │  │  ├─ model-performance.entity.ts.html
│  │     │  │  └─ nlp-feedback.entity.ts.html
│  │     │  ├─ index.html
│  │     │  ├─ nlp.controller.ts.html
│  │     │  ├─ nlp.module.ts.html
│  │     │  ├─ nlp.service.ts.html
│  │     │  └─ services
│  │     │     ├─ ab-testing.service.ts.html
│  │     │     └─ index.html
│  │     ├─ projects
│  │     │  ├─ index.html
│  │     │  ├─ projects.controller.ts.html
│  │     │  ├─ projects.dto.ts.html
│  │     │  ├─ projects.entity.ts.html
│  │     │  ├─ projects.module.ts.html
│  │     │  ├─ projects.repository.ts.html
│  │     │  └─ projects.service.ts.html
│  │     ├─ reminder-validation.ts.html
│  │     ├─ scripts
│  │     │  ├─ fix-recurrence-rules.ts.html
│  │     │  ├─ index.html
│  │     │  └─ verify-migrations.ts.html
│  │     ├─ stats
│  │     │  ├─ index.html
│  │     │  ├─ stats.controller.ts.html
│  │     │  ├─ stats.dto.ts.html
│  │     │  ├─ stats.module.ts.html
│  │     │  └─ stats.service.ts.html
│  │     ├─ tags
│  │     │  ├─ index.html
│  │     │  ├─ tags.controller.ts.html
│  │     │  ├─ tags.dto.ts.html
│  │     │  ├─ tags.entity.ts.html
│  │     │  ├─ tags.module.ts.html
│  │     │  ├─ tags.repository.ts.html
│  │     │  └─ tags.service.ts.html
│  │     ├─ tasks
│  │     │  ├─ aggregates
│  │     │  │  ├─ index.html
│  │     │  │  └─ task.aggregate.ts.html
│  │     │  ├─ dto
│  │     │  │  ├─ batch-complete-tasks.dto.ts.html
│  │     │  │  ├─ complete-overdue-tasks.dto.ts.html
│  │     │  │  ├─ create-task.dto.ts.html
│  │     │  │  └─ index.html
│  │     │  ├─ factories
│  │     │  │  ├─ index.html
│  │     │  │  └─ task.factory.ts.html
│  │     │  ├─ index.html
│  │     │  ├─ notification.domain.service.ts.html
│  │     │  ├─ pipes
│  │     │  │  ├─ index.html
│  │     │  │  └─ parse-uuid-array.pipe.ts.html
│  │     │  ├─ recurring-task.service.ts.html
│  │     │  ├─ tasks.controller.ts.html
│  │     │  ├─ tasks.domain.service.ts.html
│  │     │  ├─ tasks.dto.ts.html
│  │     │  ├─ tasks.entity.ts.html
│  │     │  ├─ tasks.module.ts.html
│  │     │  ├─ tasks.repository.ts.html
│  │     │  ├─ tasks.service.ts.html
│  │     │  └─ value-objects
│  │     │     ├─ index.html
│  │     │     └─ recurrence-rule.value-object.ts.html
│  │     ├─ test-reminder-filter.ts.html
│  │     └─ test-reminder.ts.html
│  └─ lcov.info
├─ ddd-architecture.md
├─ ddd-dependencies.md
├─ dist
│  ├─ api-metrics
│  │  ├─ api-metrics.controller.d.ts
│  │  ├─ api-metrics.controller.js
│  │  ├─ api-metrics.controller.js.map
│  │  ├─ api-metrics.module.d.ts
│  │  ├─ api-metrics.module.js
│  │  ├─ api-metrics.module.js.map
│  │  ├─ api-metrics.service.d.ts
│  │  ├─ api-metrics.service.js
│  │  └─ api-metrics.service.js.map
│  ├─ app.controller.d.ts
│  ├─ app.controller.js
│  ├─ app.controller.js.map
│  ├─ app.module.d.ts
│  ├─ app.module.js
│  ├─ app.module.js.map
│  ├─ app.service.d.ts
│  ├─ app.service.js
│  ├─ app.service.js.map
│  ├─ auth
│  │  ├─ auth.controller.d.ts
│  │  ├─ auth.controller.js
│  │  ├─ auth.controller.js.map
│  │  ├─ auth.module.d.ts
│  │  ├─ auth.module.js
│  │  ├─ auth.module.js.map
│  │  ├─ auth.service.d.ts
│  │  ├─ auth.service.js
│  │  ├─ auth.service.js.map
│  │  ├─ jwt.strategy.d.ts
│  │  ├─ jwt.strategy.js
│  │  └─ jwt.strategy.js.map
│  ├─ common
│  │  ├─ decorators
│  │  │  ├─ user-id.decorator.d.ts
│  │  │  ├─ user-id.decorator.js
│  │  │  └─ user-id.decorator.js.map
│  │  ├─ guards
│  │  │  ├─ rate-limit.guard.d.ts
│  │  │  ├─ rate-limit.guard.js
│  │  │  └─ rate-limit.guard.js.map
│  │  ├─ health
│  │  │  ├─ health.controller.d.ts
│  │  │  ├─ health.controller.js
│  │  │  ├─ health.controller.js.map
│  │  │  ├─ health.module.d.ts
│  │  │  ├─ health.module.js
│  │  │  ├─ health.module.js.map
│  │  │  ├─ health.service.d.ts
│  │  │  ├─ health.service.js
│  │  │  └─ health.service.js.map
│  │  ├─ middleware
│  │  │  ├─ api-metrics.middleware.d.ts
│  │  │  ├─ api-metrics.middleware.js
│  │  │  ├─ api-metrics.middleware.js.map
│  │  │  ├─ request-sanitizer.middleware.d.ts
│  │  │  ├─ request-sanitizer.middleware.js
│  │  │  ├─ request-sanitizer.middleware.js.map
│  │  │  ├─ security-headers.middleware.d.ts
│  │  │  ├─ security-headers.middleware.js
│  │  │  └─ security-headers.middleware.js.map
│  │  ├─ pipes
│  │  │  ├─ sanitize.pipe.d.ts
│  │  │  ├─ sanitize.pipe.js
│  │  │  └─ sanitize.pipe.js.map
│  │  ├─ security.module.d.ts
│  │  ├─ security.module.js
│  │  ├─ security.module.js.map
│  │  └─ services
│  │     ├─ notification.module.d.ts
│  │     ├─ notification.module.js
│  │     ├─ notification.module.js.map
│  │     ├─ notification.service.d.ts
│  │     ├─ notification.service.js
│  │     ├─ notification.service.js.map
│  │     ├─ scheduler.module.d.ts
│  │     ├─ scheduler.module.js
│  │     ├─ scheduler.module.js.map
│  │     ├─ scheduler.service.d.ts
│  │     ├─ scheduler.service.js
│  │     ├─ scheduler.service.js.map
│  │     ├─ security-logger.service.d.ts
│  │     ├─ security-logger.service.js
│  │     └─ security-logger.service.js.map
│  ├─ config
│  │  ├─ configuration.d.ts
│  │  ├─ configuration.js
│  │  ├─ configuration.js.map
│  │  ├─ constants.d.ts
│  │  ├─ constants.js
│  │  ├─ constants.js.map
│  │  ├─ typeorm.config.d.ts
│  │  ├─ typeorm.config.js
│  │  └─ typeorm.config.js.map
│  ├─ database
│  │  ├─ database-test.service.d.ts
│  │  ├─ database-test.service.js
│  │  ├─ database-test.service.js.map
│  │  ├─ database.module.d.ts
│  │  ├─ database.module.js
│  │  ├─ database.module.js.map
│  │  ├─ database.providers.d.ts
│  │  ├─ database.providers.js
│  │  ├─ database.providers.js.map
│  │  └─ migrations
│  │     ├─ 1741912345000-CreateNlpFeedbackTable.d.ts
│  │     ├─ 1741912345000-CreateNlpFeedbackTable.js
│  │     └─ 1741912345000-CreateNlpFeedbackTable.js.map
│  ├─ entities
│  │  ├─ api-metrics.entity.d.ts
│  │  ├─ api-metrics.entity.js
│  │  ├─ api-metrics.entity.js.map
│  │  ├─ block-rule.entity.d.ts
│  │  ├─ block-rule.entity.js
│  │  ├─ block-rule.entity.js.map
│  │  ├─ system-health.entity.d.ts
│  │  ├─ system-health.entity.js
│  │  └─ system-health.entity.js.map
│  ├─ focus-sessions
│  │  ├─ focus-sessions.controller.d.ts
│  │  ├─ focus-sessions.controller.js
│  │  ├─ focus-sessions.controller.js.map
│  │  ├─ focus-sessions.dto.d.ts
│  │  ├─ focus-sessions.dto.js
│  │  ├─ focus-sessions.dto.js.map
│  │  ├─ focus-sessions.entity.d.ts
│  │  ├─ focus-sessions.entity.js
│  │  ├─ focus-sessions.entity.js.map
│  │  ├─ focus-sessions.module.d.ts
│  │  ├─ focus-sessions.module.js
│  │  ├─ focus-sessions.module.js.map
│  │  ├─ focus-sessions.repository.d.ts
│  │  ├─ focus-sessions.repository.js
│  │  ├─ focus-sessions.repository.js.map
│  │  ├─ focus-sessions.service.d.ts
│  │  ├─ focus-sessions.service.js
│  │  └─ focus-sessions.service.js.map
│  ├─ main.d.ts
│  ├─ main.js
│  ├─ main.js.map
│  ├─ migrations
│  │  ├─ 1686501234567-UpdateTaskEntityWithMetadata.d.ts
│  │  ├─ 1686501234567-UpdateTaskEntityWithMetadata.js
│  │  ├─ 1686501234567-UpdateTaskEntityWithMetadata.js.map
│  │  ├─ 1686501245678-SimplifyTaskEntity.d.ts
│  │  ├─ 1686501245678-SimplifyTaskEntity.js
│  │  ├─ 1686501245678-SimplifyTaskEntity.js.map
│  │  ├─ 1686501256789-CleanupUnusedTaskTypes.d.ts
│  │  ├─ 1686501256789-CleanupUnusedTaskTypes.js
│  │  ├─ 1686501256789-CleanupUnusedTaskTypes.js.map
│  │  ├─ 1705759726000-InitialSchema.d.ts
│  │  ├─ 1705759726000-InitialSchema.js
│  │  ├─ 1705759726000-InitialSchema.js.map
│  │  ├─ 1710000000000-AddNonePriorityEnum.d.ts
│  │  ├─ 1710000000000-AddNonePriorityEnum.js
│  │  ├─ 1710000000000-AddNonePriorityEnum.js.map
│  │  ├─ 1738178127099-AddNonePriorityEnum.d.ts
│  │  ├─ 1738178127099-AddNonePriorityEnum.js
│  │  ├─ 1738178127099-AddNonePriorityEnum.js.map
│  │  ├─ 1738360717263-AddSystemProjectAndInbox.d.ts
│  │  ├─ 1738360717263-AddSystemProjectAndInbox.js
│  │  ├─ 1738360717263-AddSystemProjectAndInbox.js.map
│  │  ├─ 1738362321118-FixProjectColors.d.ts
│  │  ├─ 1738362321118-FixProjectColors.js
│  │  ├─ 1738362321118-FixProjectColors.js.map
│  │  ├─ 1738362321119-EnsureInboxProject.d.ts
│  │  ├─ 1738362321119-EnsureInboxProject.js
│  │  ├─ 1738362321119-EnsureInboxProject.js.map
│  │  ├─ 1738934197033-AddHasTimeToTasks.d.ts
│  │  ├─ 1738934197033-AddHasTimeToTasks.js
│  │  ├─ 1738934197033-AddHasTimeToTasks.js.map
│  │  ├─ 1739279174960-UpdateTaskStatusEnum.d.ts
│  │  ├─ 1739279174960-UpdateTaskStatusEnum.js
│  │  ├─ 1739279174960-UpdateTaskStatusEnum.js.map
│  │  ├─ 1739279174961-EnsureValidTaskStatuses.d.ts
│  │  ├─ 1739279174961-EnsureValidTaskStatuses.js
│  │  ├─ 1739279174961-EnsureValidTaskStatuses.js.map
│  │  ├─ 1739279174962-AddProjectTypeEnum.d.ts
│  │  ├─ 1739279174962-AddProjectTypeEnum.js
│  │  ├─ 1739279174962-AddProjectTypeEnum.js.map
│  │  ├─ 1739279174963-AddFocusSessionEnergyLevelEnum.d.ts
│  │  ├─ 1739279174963-AddFocusSessionEnergyLevelEnum.js
│  │  ├─ 1739279174963-AddFocusSessionEnergyLevelEnum.js.map
│  │  ├─ 1739279174963-AddTaskTagsTable.d.ts
│  │  ├─ 1739279174963-AddTaskTagsTable.js
│  │  ├─ 1739279174963-AddTaskTagsTable.js.map
│  │  ├─ 1739279174964-AddBlockRuleTypeEnum.d.ts
│  │  ├─ 1739279174964-AddBlockRuleTypeEnum.js
│  │  ├─ 1739279174964-AddBlockRuleTypeEnum.js.map
│  │  ├─ 1740494148045-CreateFocusSessionTables.d.ts
│  │  ├─ 1740494148045-CreateFocusSessionTables.js
│  │  ├─ 1740494148045-CreateFocusSessionTables.js.map
│  │  ├─ 1740589432291-AddProjectIdToFocusSession.d.ts
│  │  ├─ 1740589432291-AddProjectIdToFocusSession.js
│  │  ├─ 1740589432291-AddProjectIdToFocusSession.js.map
│  │  ├─ 1740916550124-AddRecurringTaskFields.d.ts
│  │  ├─ 1740916550124-AddRecurringTaskFields.js
│  │  ├─ 1740916550124-AddRecurringTaskFields.js.map
│  │  ├─ 1741011691203-RemoveTaskTypeColumn.d.ts
│  │  ├─ 1741011691203-RemoveTaskTypeColumn.js
│  │  ├─ 1741011691203-RemoveTaskTypeColumn.js.map
│  │  ├─ 1741013788916-AddRecurrenceRuleColumn.d.ts
│  │  ├─ 1741013788916-AddRecurrenceRuleColumn.js
│  │  ├─ 1741013788916-AddRecurrenceRuleColumn.js.map
│  │  ├─ 1741014300000-AddNextDueDateColumn.d.ts
│  │  ├─ 1741014300000-AddNextDueDateColumn.js
│  │  ├─ 1741014300000-AddNextDueDateColumn.js.map
│  │  ├─ 1741607800000-AddIsGoalToTagTable.d.ts
│  │  ├─ 1741607800000-AddIsGoalToTagTable.js
│  │  ├─ 1741607800000-AddIsGoalToTagTable.js.map
│  │  ├─ 1741800000000-CreateSystemHealthTable.d.ts
│  │  ├─ 1741800000000-CreateSystemHealthTable.js
│  │  ├─ 1741800000000-CreateSystemHealthTable.js.map
│  │  ├─ 1741900000000-CreateApiMetricsTable.d.ts
│  │  ├─ 1741900000000-CreateApiMetricsTable.js
│  │  ├─ 1741900000000-CreateApiMetricsTable.js.map
│  │  ├─ 1741912345000-CreateNlpFeedbackTable.d.ts
│  │  ├─ 1741912345000-CreateNlpFeedbackTable.js
│  │  ├─ 1741912345000-CreateNlpFeedbackTable.js.map
│  │  ├─ 1742000000000-CreateNlpModelPerformanceTable.d.ts
│  │  ├─ 1742000000000-CreateNlpModelPerformanceTable.js
│  │  ├─ 1742000000000-CreateNlpModelPerformanceTable.js.map
│  │  ├─ 1743380485000-RemoveIsGoalFromTagTable.d.ts
│  │  ├─ 1743380485000-RemoveIsGoalFromTagTable.js
│  │  ├─ 1743380485000-RemoveIsGoalFromTagTable.js.map
│  │  ├─ 1743458631759-AddCompletedAtToTasks.d.ts
│  │  ├─ 1743458631759-AddCompletedAtToTasks.js
│  │  ├─ 1743458631759-AddCompletedAtToTasks.js.map
│  │  └─ base
│  │     ├─ BaseMigration.d.ts
│  │     ├─ BaseMigration.js
│  │     └─ BaseMigration.js.map
│  ├─ projects
│  │  ├─ projects.controller.d.ts
│  │  ├─ projects.controller.js
│  │  ├─ projects.controller.js.map
│  │  ├─ projects.dto.d.ts
│  │  ├─ projects.dto.js
│  │  ├─ projects.dto.js.map
│  │  ├─ projects.entity.d.ts
│  │  ├─ projects.entity.js
│  │  ├─ projects.entity.js.map
│  │  ├─ projects.module.d.ts
│  │  ├─ projects.module.js
│  │  ├─ projects.module.js.map
│  │  ├─ projects.repository.d.ts
│  │  ├─ projects.repository.js
│  │  ├─ projects.repository.js.map
│  │  ├─ projects.service.d.ts
│  │  ├─ projects.service.js
│  │  └─ projects.service.js.map
│  ├─ reminder-validation.d.ts
│  ├─ reminder-validation.js
│  ├─ reminder-validation.js.map
│  ├─ scripts
│  │  ├─ fix-recurrence-rules.d.ts
│  │  ├─ fix-recurrence-rules.js
│  │  ├─ fix-recurrence-rules.js.map
│  │  ├─ migrate-test-db.d.ts
│  │  ├─ migrate-test-db.js
│  │  ├─ migrate-test-db.js.map
│  │  ├─ verify-database-schema.d.ts
│  │  ├─ verify-database-schema.js
│  │  ├─ verify-database-schema.js.map
│  │  ├─ verify-migrations.d.ts
│  │  ├─ verify-migrations.js
│  │  └─ verify-migrations.js.map
│  ├─ stats
│  │  ├─ stats.controller.d.ts
│  │  ├─ stats.controller.js
│  │  ├─ stats.controller.js.map
│  │  ├─ stats.dto.d.ts
│  │  ├─ stats.dto.js
│  │  ├─ stats.dto.js.map
│  │  ├─ stats.module.d.ts
│  │  ├─ stats.module.js
│  │  ├─ stats.module.js.map
│  │  ├─ stats.service.d.ts
│  │  ├─ stats.service.js
│  │  └─ stats.service.js.map
│  ├─ tags
│  │  ├─ tags.controller.d.ts
│  │  ├─ tags.controller.js
│  │  ├─ tags.controller.js.map
│  │  ├─ tags.dto.d.ts
│  │  ├─ tags.dto.js
│  │  ├─ tags.dto.js.map
│  │  ├─ tags.entity.d.ts
│  │  ├─ tags.entity.js
│  │  ├─ tags.entity.js.map
│  │  ├─ tags.module.d.ts
│  │  ├─ tags.module.js
│  │  ├─ tags.module.js.map
│  │  ├─ tags.repository.d.ts
│  │  ├─ tags.repository.js
│  │  ├─ tags.repository.js.map
│  │  ├─ tags.service.d.ts
│  │  ├─ tags.service.js
│  │  └─ tags.service.js.map
│  ├─ tasks
│  │  ├─ aggregates
│  │  │  ├─ task.aggregate.d.ts
│  │  │  ├─ task.aggregate.js
│  │  │  └─ task.aggregate.js.map
│  │  ├─ dto
│  │  │  ├─ batch-complete-tasks.dto.d.ts
│  │  │  ├─ batch-complete-tasks.dto.js
│  │  │  ├─ batch-complete-tasks.dto.js.map
│  │  │  ├─ complete-overdue-tasks.dto.d.ts
│  │  │  ├─ complete-overdue-tasks.dto.js
│  │  │  ├─ complete-overdue-tasks.dto.js.map
│  │  │  ├─ create-task.dto.d.ts
│  │  │  ├─ create-task.dto.js
│  │  │  └─ create-task.dto.js.map
│  │  ├─ factories
│  │  │  ├─ task.factory.d.ts
│  │  │  ├─ task.factory.js
│  │  │  └─ task.factory.js.map
│  │  ├─ notification.domain.service.d.ts
│  │  ├─ notification.domain.service.js
│  │  ├─ notification.domain.service.js.map
│  │  ├─ pipes
│  │  │  ├─ parse-uuid-array.pipe.d.ts
│  │  │  ├─ parse-uuid-array.pipe.js
│  │  │  └─ parse-uuid-array.pipe.js.map
│  │  ├─ recurring-task.service.d.ts
│  │  ├─ recurring-task.service.js
│  │  ├─ recurring-task.service.js.map
│  │  ├─ tasks.controller.d.ts
│  │  ├─ tasks.controller.js
│  │  ├─ tasks.controller.js.map
│  │  ├─ tasks.domain.service.d.ts
│  │  ├─ tasks.domain.service.js
│  │  ├─ tasks.domain.service.js.map
│  │  ├─ tasks.dto.d.ts
│  │  ├─ tasks.dto.js
│  │  ├─ tasks.dto.js.map
│  │  ├─ tasks.entity.d.ts
│  │  ├─ tasks.entity.js
│  │  ├─ tasks.entity.js.map
│  │  ├─ tasks.module.d.ts
│  │  ├─ tasks.module.js
│  │  ├─ tasks.module.js.map
│  │  ├─ tasks.repository.d.ts
│  │  ├─ tasks.repository.js
│  │  ├─ tasks.repository.js.map
│  │  ├─ tasks.service.d.ts
│  │  ├─ tasks.service.js
│  │  ├─ tasks.service.js.map
│  │  └─ value-objects
│  │     ├─ recurrence-rule.value-object.d.ts
│  │     ├─ recurrence-rule.value-object.js
│  │     └─ recurrence-rule.value-object.js.map
│  ├─ test-reminder-filter.d.ts
│  ├─ test-reminder-filter.js
│  ├─ test-reminder-filter.js.map
│  ├─ test-reminder.d.ts
│  ├─ test-reminder.js
│  ├─ test-reminder.js.map
│  └─ tsconfig.build.tsbuildinfo
├─ docker-compose.yml
├─ docs
│  ├─ Project-Structure
│  │  ├─ project-structure.md
│  │  └─ test-project-structure.mg
│  ├─ README.md
│  ├─ TestingBestPractices.md
│  ├─ active
│  │  ├─ application-layer-test-plan.md
│  │  ├─ domain-layer-test-completion-summary.md
│  │  ├─ domain-layer-test-plan.md
│  │  ├─ implementation-summary.md
│  │  ├─ ios-push-notification-implementation.md
│  │  ├─ project-hierarchy-edge-case-tests.md
│  │  ├─ project-management-tests-summary.md
│  │  ├─ project-repository-implementation.md
│  │  ├─ search-navigation-implementation.md
│  │  ├─ search-navigation-tests.md
│  │  ├─ task-management-tests-summary.md
│  │  ├─ task-project-interaction-tests.md
│  │  ├─ test-coverage-plan.md
│  │  ├─ timeline-analytics-implementation.md
│  │  └─ timeline-analytics-tests.md
│  ├─ batch-complete-overdue-tasks.md
│  ├─ mcp-error-handling.md
│  ├─ mcp-sdk
│  │  └─ llms-full.txt
│  └─ test-isolation-with-transactions.md
├─ nest-cli.json
├─ package-lock 2.json
├─ package-lock 3.json
├─ package-lock.json
├─ package.json
├─ railway.toml
├─ refactoring-summary.md
├─ scripts
│  └─ setup-test-db.ts
├─ setup-env.js
├─ simplified-task-implementation.md
├─ simplified-task-model.md
├─ src
│  ├─ api-metrics
│  │  ├─ api-metrics.controller.spec.ts
│  │  ├─ api-metrics.controller.ts
│  │  ├─ api-metrics.module.spec.ts
│  │  ├─ api-metrics.module.ts
│  │  ├─ api-metrics.service.spec.ts
│  │  └─ api-metrics.service.ts
│  ├─ app.controller.spec.ts
│  ├─ app.controller.ts
│  ├─ app.module.ts
│  ├─ app.service.ts
│  ├─ auth
│  │  ├─ auth.controller.spec.ts
│  │  ├─ auth.controller.ts
│  │  ├─ auth.module.ts
│  │  ├─ auth.service.spec.ts
│  │  ├─ auth.service.ts
│  │  └─ jwt.strategy.ts
│  ├─ common
│  │  ├─ decorators
│  │  │  └─ user-id.decorator.ts
│  │  ├─ guards
│  │  │  └─ rate-limit.guard.ts
│  │  ├─ health
│  │  │  ├─ health.controller.spec.ts
│  │  │  ├─ health.controller.ts
│  │  │  ├─ health.module.ts
│  │  │  ├─ health.service.spec.ts
│  │  │  └─ health.service.ts
│  │  ├─ middleware
│  │  │  ├─ api-metrics.middleware.spec.ts
│  │  │  ├─ api-metrics.middleware.ts
│  │  │  ├─ request-sanitizer.middleware.ts
│  │  │  └─ security-headers.middleware.ts
│  │  ├─ pipes
│  │  │  └─ sanitize.pipe.ts
│  │  ├─ security.module.ts
│  │  └─ services
│  │     ├─ notification.module.ts
│  │     ├─ notification.service.ts
│  │     ├─ scheduler.module.ts
│  │     ├─ scheduler.service.ts
│  │     ├─ security-logger.service.ts
│  │     └─ tests
│  │        └─ scheduler.service.spec.ts
│  ├─ config
│  │  ├─ configuration.ts
│  │  ├─ constants.ts
│  │  └─ typeorm.config.ts
│  ├─ database
│  │  ├─ database-test.service.ts
│  │  ├─ database.module.ts
│  │  ├─ database.providers.ts
│  │  └─ migrations
│  │     └─ 1741912345000-CreateNlpFeedbackTable.ts
│  ├─ entities
│  │  ├─ api-metrics.entity.ts
│  │  ├─ block-rule.entity.ts
│  │  └─ system-health.entity.ts
│  ├─ focus-sessions
│  │  ├─ focus-sessions.controller.ts
│  │  ├─ focus-sessions.dto.ts
│  │  ├─ focus-sessions.entity.ts
│  │  ├─ focus-sessions.module.ts
│  │  ├─ focus-sessions.repository.ts
│  │  ├─ focus-sessions.service.ts
│  │  └─ tests
│  │     └─ focus-sessions.controller.spec.ts
│  ├─ main.ts
│  ├─ migrations
│  │  ├─ 1686501234567-UpdateTaskEntityWithMetadata.ts
│  │  ├─ 1686501245678-SimplifyTaskEntity.ts
│  │  ├─ 1686501256789-CleanupUnusedTaskTypes.ts
│  │  ├─ 1705759726000-InitialSchema.ts
│  │  ├─ 1710000000000-AddNonePriorityEnum.ts
│  │  ├─ 1738178127099-AddNonePriorityEnum.ts
│  │  ├─ 1738360717263-AddSystemProjectAndInbox.ts
│  │  ├─ 1738362321118-FixProjectColors.ts
│  │  ├─ 1738362321119-EnsureInboxProject.ts
│  │  ├─ 1738934197033-AddHasTimeToTasks.ts
│  │  ├─ 1739279174960-UpdateTaskStatusEnum.ts
│  │  ├─ 1739279174961-EnsureValidTaskStatuses.ts
│  │  ├─ 1739279174962-AddProjectTypeEnum.ts
│  │  ├─ 1739279174963-AddFocusSessionEnergyLevelEnum.ts
│  │  ├─ 1739279174963-AddTaskTagsTable.ts
│  │  ├─ 1739279174964-AddBlockRuleTypeEnum.ts
│  │  ├─ 1740494148045-CreateFocusSessionTables.ts
│  │  ├─ 1740589432291-AddProjectIdToFocusSession.ts
│  │  ├─ 1740916550124-AddRecurringTaskFields.ts
│  │  ├─ 1741011691203-RemoveTaskTypeColumn.ts
│  │  ├─ 1741013788916-AddRecurrenceRuleColumn.ts
│  │  ├─ 1741014300000-AddNextDueDateColumn.ts
│  │  ├─ 1741607800000-AddIsGoalToTagTable.ts
│  │  ├─ 1741800000000-CreateSystemHealthTable.ts
│  │  ├─ 1741900000000-CreateApiMetricsTable.ts
│  │  ├─ 1741912345000-CreateNlpFeedbackTable.ts
│  │  ├─ 1742000000000-CreateNlpModelPerformanceTable.ts
│  │  ├─ 1743380485000-RemoveIsGoalFromTagTable.ts
│  │  ├─ 1743458631759-AddCompletedAtToTasks.ts
│  │  └─ base
│  │     └─ BaseMigration.ts
│  ├─ projects
│  │  ├─ projects.controller.ts
│  │  ├─ projects.dto.ts
│  │  ├─ projects.entity.ts
│  │  ├─ projects.module.ts
│  │  ├─ projects.repository.ts
│  │  └─ projects.service.ts
│  ├─ reminder-validation.ts
│  ├─ scripts
│  │  ├─ fix-recurrence-rules.ts
│  │  ├─ migrate-test-db.ts
│  │  ├─ verify-database-schema.ts
│  │  └─ verify-migrations.ts
│  ├─ stats
│  │  ├─ stats.controller.ts
│  │  ├─ stats.dto.ts
│  │  ├─ stats.module.ts
│  │  └─ stats.service.ts
│  ├─ tags
│  │  ├─ tags.controller.ts
│  │  ├─ tags.dto.ts
│  │  ├─ tags.entity.ts
│  │  ├─ tags.module.ts
│  │  ├─ tags.repository.ts
│  │  └─ tags.service.ts
│  ├─ tasks
│  │  ├─ aggregates
│  │  │  └─ task.aggregate.ts
│  │  ├─ batch-complete-overdue-tasks.md
│  │  ├─ dto
│  │  │  ├─ batch-complete-tasks.dto.ts
│  │  │  ├─ complete-overdue-tasks.dto.ts
│  │  │  └─ create-task.dto.ts
│  │  ├─ factories
│  │  │  └─ task.factory.ts
│  │  ├─ interfaces
│  │  ├─ notification.domain.service.ts
│  │  ├─ pipes
│  │  │  └─ parse-uuid-array.pipe.ts
│  │  ├─ recurring-task.service.ts
│  │  ├─ tasks.controller.ts
│  │  ├─ tasks.domain.service.ts
│  │  ├─ tasks.dto.ts
│  │  ├─ tasks.entity.ts
│  │  ├─ tasks.module.ts
│  │  ├─ tasks.repository.ts
│  │  ├─ tasks.service.ts
│  │  └─ value-objects
│  │     └─ recurrence-rule.value-object.ts
│  ├─ test-reminder-filter.ts
│  └─ test-reminder.ts
├─ test
│  ├─ app.e2e-spec.ts
│  ├─ database
│  │  ├─ test-database.module.ts
│  │  ├─ test-database.providers.ts
│  │  └─ test-entities
│  │     ├─ focus-session.entity.ts
│  │     ├─ project.entity.ts
│  │     ├─ tag.entity.ts
│  │     └─ task.entity.ts
│  ├─ e2e
│  │  └─ api-500-errors.e2e-spec.ts
│  ├─ health.e2e-spec.ts
│  ├─ integration
│  │  ├─ database
│  │  │  └─ schema-consistency.integration.spec.ts
│  │  ├─ project-management
│  │  │  ├─ projects-controller.integration.spec.ts
│  │  │  └─ projects-repository.integration.spec.ts
│  │  ├─ tag-management
│  │  │  └─ tags.repository.integration.spec.ts
│  │  └─ task-management
│  │     ├─ recurring-task-workflow.integration.spec.ts
│  │     ├─ task-controller.integration.spec.ts
│  │     ├─ task-repository.integration.spec.ts
│  │     ├─ task-security.integration.spec.ts
│  │     ├─ task-service.integration.spec.ts
│  │     └─ task-workflow.integration.spec.ts
│  ├─ jest-application.json
│  ├─ jest-domain.json
│  ├─ jest-e2e.json
│  ├─ jest-functional.json
│  ├─ jest-infrastructure.json
│  ├─ jest-integration.json
│  ├─ jest-interface.json
│  ├─ jest-standard.json
│  ├─ mocks
│  ├─ recurring-task-scheduling.e2e-spec.ts
│  ├─ recurring-tasks.e2e-spec.ts
│  ├─ scheduler.e2e-spec.ts
│  ├─ setup
│  │  ├─ jest-global-setup.ts
│  │  └─ jest-global-teardown.ts
│  ├─ task-completion.e2e-spec.ts
│  ├─ task-creation-workflow.e2e-spec.ts
│  ├─ task-creation.e2e-spec.ts
│  ├─ task-notifications.e2e-spec.ts
│  ├─ temp
│  │  └─ task.service.spec.js
│  ├─ test-utils.ts
│  ├─ tsconfig.e2e.json
│  ├─ tsconfig.test.json
│  └─ unit
│     ├─ application
│     │  ├─ project-management
│     │  │  └─ projects.service.spec.ts
│     │  ├─ tag-management
│     │  │  ├─ tags.controller.spec.ts
│     │  │  ├─ tags.entity.spec.ts
│     │  │  ├─ tags.module.spec.ts
│     │  │  ├─ tags.repository.spec.ts
│     │  │  └─ tags.service.spec.ts
│     │  └─ task-management
│     │     ├─ complete-overdue-tasks.spec.ts
│     │     ├─ recurring-task.service.spec.ts
│     │     └─ task.service.spec.ts
│     ├─ domain
│     │  ├─ project-management
│     │  │  ├─ project.dto.spec.ts
│     │  │  └─ project.entity.spec.ts
│     │  ├─ tag-management
│     │  │  ├─ tag.dto.spec.ts
│     │  │  ├─ tag.entity.spec.ts
│     │  │  └─ tags.service.spec.ts
│     │  └─ task-management
│     │     ├─ notification-domain.service.spec.ts
│     │     ├─ recurrence-rule.value-object.spec.ts
│     │     ├─ task-domain.service.spec.ts
│     │     ├─ task.dto.spec.ts
│     │     └─ task.entity.spec.ts
│     ├─ infrastructure
│     │  ├─ project-management
│     │  │  └─ projects.repository.spec.ts
│     │  ├─ tag-management
│     │  │  └─ tags.repository.spec.ts
│     │  └─ task-management
│     │     └─ tasks.repository.spec.ts
│     └─ interface
│        ├─ focus-sessions
│        │  └─ focus-sessions.controller.spec.ts
│        ├─ projects
│        │  └─ projects.controller.spec.ts
│        ├─ tags
│        │  └─ tags.controller.spec.ts
│        └─ task-management
│           └─ tasks.controller.spec.ts
├─ tsconfig.build.json
├─ tsconfig.json
└─ tsconfig.test.json

```
