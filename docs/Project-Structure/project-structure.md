├── api-metrics
│ ├── api-metrics.controller.spec.ts
│ ├── api-metrics.controller.ts
│ ├── api-metrics.module.spec.ts
│ ├── api-metrics.module.ts
│ ├── api-metrics.service.spec.ts
│ └── api-metrics.service.ts
├── auth
│ ├── auth.controller.spec.ts
│ ├── auth.controller.ts
│ ├── auth.module.ts
│ ├── auth.service.spec.ts
│ ├── auth.service.ts
│ └── jwt.strategy.ts
├── common
│ ├── guards
│ │ └── rate-limit.guard.ts
│ ├── health
│ │ ├── health.controller.spec.ts
│ │ ├── health.controller.ts
│ │ ├── health.module.ts
│ │ ├── health.service.spec.ts
│ │ └── health.service.ts
│ ├── middleware
│ │ ├── api-metrics.middleware.spec.ts
│ │ ├── api-metrics.middleware.ts
│ │ ├── request-sanitizer.middleware.ts
│ │ └── security-headers.middleware.ts
│ ├── pipes
│ │ └── sanitize.pipe.ts
│ ├── services
│ │ ├── tests
│ │ │ └── scheduler.service.spec.ts
│ │ ├── notification.module.ts
│ │ ├── notification.service.ts
│ │ ├── scheduler.module.ts
│ │ ├── scheduler.service.ts
│ │ └── security-logger.service.ts
│ └── security.module.ts
├── config
│ ├── configuration.ts
│ ├── constants.ts
│ └── typeorm.config.ts
├── database
│ ├── migrations
│ │ └── 1741912345000-CreateNlpFeedbackTable.ts
│ ├── database-test.service.ts
│ ├── database.module.ts
│ └── database.providers.ts
├── entities
│ ├── api-metrics.entity.ts
│ ├── block-rule.entity.ts
│ └── system-health.entity.ts
├── focus-sessions
│ ├── tests
│ │ └── focus-sessions.controller.spec.ts
│ ├── focus-sessions.controller.ts
│ ├── focus-sessions.dto.ts
│ ├── focus-sessions.entity.ts
│ ├── focus-sessions.module.ts
│ ├── focus-sessions.repository.ts
│ └── focus-sessions.service.ts
├── migrations
│ ├── base
│ │ └── BaseMigration.ts
│ ├── 1686501234567-UpdateTaskEntityWithMetadata.ts
│ ├── 1686501245678-SimplifyTaskEntity.ts
│ ├── 1686501256789-CleanupUnusedTaskTypes.ts
│ ├── 1705759726000-InitialSchema.ts
│ ├── 1710000000000-AddNonePriorityEnum.ts
│ ├── 1738178127099-AddNonePriorityEnum.ts
│ ├── 1738360717263-AddSystemProjectAndInbox.ts
│ ├── 1738362321118-FixProjectColors.ts
│ ├── 1738362321119-EnsureInboxProject.ts
│ ├── 1738934197033-AddHasTimeToTasks.ts
│ ├── 1739279174960-UpdateTaskStatusEnum.ts
│ ├── 1739279174961-EnsureValidTaskStatuses.ts
│ ├── 1739279174962-AddProjectTypeEnum.ts
│ ├── 1739279174963-AddFocusSessionEnergyLevelEnum.ts
│ ├── 1739279174963-AddTaskTagsTable.ts
│ ├── 1739279174964-AddBlockRuleTypeEnum.ts
│ ├── 1740494148045-CreateFocusSessionTables.ts
│ ├── 1740589432291-AddProjectIdToFocusSession.ts
│ ├── 1740916550124-AddRecurringTaskFields.ts
│ ├── 1741011691203-RemoveTaskTypeColumn.ts
│ ├── 1741013788916-AddRecurrenceRuleColumn.ts
│ ├── 1741014300000-AddNextDueDateColumn.ts
│ ├── 1741607800000-AddIsGoalToTagTable.ts
│ ├── 1741800000000-CreateSystemHealthTable.ts
│ ├── 1741900000000-CreateApiMetricsTable.ts
│ ├── 1741912345000-CreateNlpFeedbackTable.ts
│ └── 1742000000000-CreateNlpModelPerformanceTable.ts
├── projects
│ ├── projects.controller.ts
│ ├── projects.dto.ts
│ ├── projects.entity.ts
│ ├── projects.module.ts
│ ├── projects.repository.ts
│ └── projects.service.ts
├── scripts
│ ├── fix-recurrence-rules.ts
│ └── verify-migrations.ts
├── stats
│ ├── stats.controller.ts
│ ├── stats.dto.ts
│ ├── stats.module.ts
│ └── stats.service.ts
├── tags
│ ├── tags.controller.ts
│ ├── tags.dto.ts
│ ├── tags.entity.ts
│ ├── tags.module.ts
│ ├── tags.repository.ts
│ └── tags.service.ts
├── tasks
│ ├── aggregates
│ │ └── task.aggregate.ts
│ ├── dto
│ │ ├── complete-overdue-tasks.dto.ts
│ │ └── create-task.dto.ts
│ ├── factories
│ │ └── task.factory.ts
│ ├── interfaces
│ ├── pipes
│ │ └── parse-uuid-array.pipe.ts
│ ├── tests
│ │ ├── e2e
│ │ ├── integration
│ │ │ ├── recurring-task-workflow.integration.spec.ts
│ │ │ ├── task-security.integration.spec.ts
│ │ │ └── task-service.integration.spec.ts
│ │ └── unit
│ │ ├── complete-overdue-tasks.spec.ts
│ │ ├── recurring-task.service.spec.ts
│ │ ├── task-controller.unit.spec.ts
│ │ ├── task-controller.unit.spec.ts.bak
│ │ ├── task-dto.unit.spec.ts
│ │ ├── task-repository.unit.spec.ts
│ │ └── task-service.unit.spec.ts
│ ├── value-objects
│ │ └── recurrence-rule.value-object.ts
│ ├── .DS_Store
│ ├── batch-complete-overdue-tasks.md
│ ├── notification.domain.service.ts
│ ├── recurring-task.service.ts
│ ├── tasks.controller.ts
│ ├── tasks.domain.service.ts
│ ├── tasks.dto.ts
│ ├── tasks.entity.ts
│ ├── tasks.module.ts
│ ├── tasks.repository.ts
│ └── tasks.service.ts
├── .DS_Store
├── app.controller.spec.ts
├── app.controller.ts
├── app.module.ts
├── app.service.ts
├── main.ts
├── reminder-validation.ts
├── test-reminder-filter.ts
└── test-reminder.ts
