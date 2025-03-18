import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Import the actual migration files from the project
import { InitialSchema1705759726000 } from '../migrations/1705759726000-InitialSchema';
import { AddNonePriorityEnum1710000000000 } from '../migrations/1710000000000-AddNonePriorityEnum';
import { AddNonePriorityEnum1738178127099 } from '../migrations/1738178127099-AddNonePriorityEnum';
import { AddSystemProjectAndInbox1738360717263 } from '../migrations/1738360717263-AddSystemProjectAndInbox';
import { FixProjectColors1738362321118 } from '../migrations/1738362321118-FixProjectColors';
import { EnsureInboxProject1738362321119 } from '../migrations/1738362321119-EnsureInboxProject';
import { AddHasTimeToTasks1738934197033 } from '../migrations/1738934197033-AddHasTimeToTasks';
import { UpdateTaskStatusEnum1739279174960 } from '../migrations/1739279174960-UpdateTaskStatusEnum';
import { EnsureValidTaskStatuses1739279174961 } from '../migrations/1739279174961-EnsureValidTaskStatuses';
import { AddProjectTypeEnum1739279174962 } from '../migrations/1739279174962-AddProjectTypeEnum';
import { AddFocusSessionEnergyLevelEnum1739279174963 } from '../migrations/1739279174963-AddFocusSessionEnergyLevelEnum';
import { AddTaskTagsTable1739279174963 } from '../migrations/1739279174963-AddTaskTagsTable';
import { AddBlockRuleTypeEnum1739279174964 } from '../migrations/1739279174964-AddBlockRuleTypeEnum';
import { CreateFocusSessionTables1740494148045 } from '../migrations/1740494148045-CreateFocusSessionTables';
import { AddProjectIdToFocusSession1740589432291 } from '../migrations/1740589432291-AddProjectIdToFocusSession';
import { AddRecurringTaskFields1740916550124 } from '../migrations/1740916550124-AddRecurringTaskFields';
import { UpdateTaskEntityWithMetadata1686501234567 } from '../migrations/1686501234567-UpdateTaskEntityWithMetadata';
import { SimplifyTaskEntity1686501245678 } from '../migrations/1686501245678-SimplifyTaskEntity';
import { CleanupUnusedTaskTypes1686501256789 } from '../migrations/1686501256789-CleanupUnusedTaskTypes';
import { RemoveTaskTypeColumn1741011691203 } from '../migrations/1741011691203-RemoveTaskTypeColumn';
import { AddRecurrenceRuleColumn1741013788916 } from '../migrations/1741013788916-AddRecurrenceRuleColumn';
import { AddNextDueDateColumn1741014300000 } from '../migrations/1741014300000-AddNextDueDateColumn';
import { AddIsGoalToTagTable1741607800000 } from '../migrations/1741607800000-AddIsGoalToTagTable';
import { CreateSystemHealthTable1741800000000 } from '../migrations/1741800000000-CreateSystemHealthTable';
import { CreateApiMetricsTable1741900000000 } from '../migrations/1741900000000-CreateApiMetricsTable';
import { CreateNlpFeedbackTable1741912345000 } from '../migrations/1741912345000-CreateNlpFeedbackTable';
import { CreateNlpModelPerformanceTable1742000000000 } from '../migrations/1742000000000-CreateNlpModelPerformanceTable';

// Import the actual entities
import { Task } from '../tasks/tasks.entity';
import { Project } from '../projects/projects.entity';
import { Tag } from '../tags/tags.entity';
import { FocusSession } from '../focus-sessions/focus-sessions.entity';
import { BlockRule } from '../entities/block-rule.entity';
import { SystemHealth } from '../entities/system-health.entity';
import { ApiRequestLog, ApiMetrics } from '../entities/api-metrics.entity';
import { NlpFeedback } from '../nlp/entities/nlp-feedback.entity';
import { NlpModelPerformance } from '../nlp/entities/model-performance.entity';

config();

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
      const dataSource = new DataSource({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [
          Task,
          Project,
          Tag,
          FocusSession,
          BlockRule,
          SystemHealth,
          ApiRequestLog,
          ApiMetrics,
          NlpFeedback,
          NlpModelPerformance,
        ],
        migrations: [
          InitialSchema1705759726000,
          UpdateTaskEntityWithMetadata1686501234567,
          SimplifyTaskEntity1686501245678,
          CleanupUnusedTaskTypes1686501256789,
          AddNonePriorityEnum1710000000000,
          AddNonePriorityEnum1738178127099,
          FixProjectColors1738362321118,
          AddSystemProjectAndInbox1738360717263,
          EnsureInboxProject1738362321119,
          AddHasTimeToTasks1738934197033,
          UpdateTaskStatusEnum1739279174960,
          EnsureValidTaskStatuses1739279174961,
          AddProjectTypeEnum1739279174962,
          AddFocusSessionEnergyLevelEnum1739279174963,
          AddTaskTagsTable1739279174963,
          AddBlockRuleTypeEnum1739279174964,
          CreateFocusSessionTables1740494148045,
          AddProjectIdToFocusSession1740589432291,
          AddRecurringTaskFields1740916550124,
          RemoveTaskTypeColumn1741011691203,
          AddRecurrenceRuleColumn1741013788916,
          AddNextDueDateColumn1741014300000,
          AddIsGoalToTagTable1741607800000,
          CreateSystemHealthTable1741800000000,
          CreateApiMetricsTable1741900000000,
          CreateNlpFeedbackTable1741912345000,
          CreateNlpModelPerformanceTable1742000000000,
        ],
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') !== 'production',
      });

      await dataSource.initialize();
      return dataSource;
    },
  },
];
