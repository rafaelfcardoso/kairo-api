// src/config/typeorm.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, LoggerOptions } from 'typeorm';
import { Task } from '../tasks/tasks.entity';
import { Project } from '../projects/projects.entity';
import { Tag } from '../tags/tags.entity';
import { FocusSession } from '../focus-sessions/focus-sessions.entity';
import { BlockRule } from '../entities/block-rule.entity';
import { SystemHealth } from '../entities/system-health.entity';
import { ApiRequestLog, ApiMetrics } from '../entities/api-metrics.entity';
import { User } from '../entities/user.entity';
import { InitialSchema1705759726000 } from '../migrations/1705759726000-InitialSchema';
import { UpdateTaskEntityWithMetadata1705759726001 } from '../migrations/1705759726001-UpdateTaskEntityWithMetadata';
import { SimplifyTaskEntity1705759726002 } from '../migrations/1705759726002-SimplifyTaskEntity';
import { CleanupUnusedTaskTypes1705759726003 } from '../migrations/1705759726003-CleanupUnusedTaskTypes';
import { FixProjectColors1738362321118 } from '../migrations/1738362321118-FixProjectColors';
import { EnsureInboxProject1738362321119 } from '../migrations/1738362321119-EnsureInboxProject';
import { AddHasTimeToTasks1738934197033 } from '../migrations/1738934197033-AddHasTimeToTasks';
import { UpdateTaskStatusEnum1739279174960 } from '../migrations/1739279174960-UpdateTaskStatusEnum';
import { EnsureValidTaskStatuses1739279174961 } from '../migrations/1739279174961-EnsureValidTaskStatuses';
import { AddProjectTypeEnum1739279174962 } from '../migrations/1739279174962-AddProjectTypeEnum';
import { AddNonePriorityEnum1710000000000 } from '../migrations/1710000000000-AddNonePriorityEnum';
import { AddNonePriorityEnum1738178127099 } from '../migrations/1738178127099-AddNonePriorityEnum';
import { CreateFocusSessionTables1740494148045 } from '../migrations/1740494148045-CreateFocusSessionTables';
import { AddProjectIdToFocusSession1740589432291 } from '../migrations/1740589432291-AddProjectIdToFocusSession';
import { AddRecurringTaskFields1740916550124 } from '../migrations/1740916550124-AddRecurringTaskFields';
import { AddSystemProjectAndInbox1738360717263 } from '../migrations/1738360717263-AddSystemProjectAndInbox';
import { AddFocusSessionEnergyLevelEnum1739279174963 } from '../migrations/1739279174963-AddFocusSessionEnergyLevelEnum';
import { AddTaskTagsTable1739279174963 } from '../migrations/1739279174963-AddTaskTagsTable';
import { AddBlockRuleTypeEnum1739279174964 } from '../migrations/1739279174964-AddBlockRuleTypeEnum';
import { RemoveTaskTypeColumn1741011691203 } from '../migrations/1741011691203-RemoveTaskTypeColumn';
import { AddRecurrenceRuleColumn1741013788916 } from '../migrations/1741013788916-AddRecurrenceRuleColumn';
import { AddNextDueDateColumn1741014300000 } from '../migrations/1741014300000-AddNextDueDateColumn';
import { AddIsGoalToTagTable1741607800000 } from '../migrations/1741607800000-AddIsGoalToTagTable';
import { CreateSystemHealthTable1741800000000 } from '../migrations/1741800000000-CreateSystemHealthTable';
import { CreateApiMetricsTable1741900000000 } from '../migrations/1741900000000-CreateApiMetricsTable';
import { CreateNlpFeedbackTable1741912345000 } from '../migrations/1741912345000-CreateNlpFeedbackTable';
import { CreateNlpModelPerformanceTable1742000000000 } from '../migrations/1742000000000-CreateNlpModelPerformanceTable';
import { RemoveIsGoalFromTagTable1743380485000 } from '../migrations/1743380485000-RemoveIsGoalFromTagTable';
import { AddCompletedAtToTasks1743458631759 } from '../migrations/1743458631759-AddCompletedAtToTasks';
import { AddUserEntityAndRelations1744054661856 } from '../migrations/1744054661856-AddUserEntityAndRelations';
import { AssignExistingDataToDefaultUser1744054769246 } from '../migrations/1744054769246-AssignExistingDataToDefaultUser';
import { MakeUserIdNonNullable1744054883888 } from '../migrations/1744054883888-MakeUserIdNonNullable';
import { RemoveIsSystemFromTag1744198367443 } from '../migrations/1744198367443-RemoveIsSystemFromTag';
import { AddIsArchivedToTag1744198558505 } from '../migrations/1744198558505-AddIsArchivedToTag';
import { FixMigrationIssues1744204141138 } from '../migrations/1744204141138-FixMigrationIssues';
import { DATABASE_CONFIG } from './constants';

// Define interface for database configuration
interface DatabaseConfig extends Omit<TypeOrmModuleOptions, 'type'> {
  type: 'postgres';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  url?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  connectTimeoutMS?: number;
}

// Define all migrations in one place for better maintenance
const migrations = [
  InitialSchema1705759726000,
  UpdateTaskEntityWithMetadata1705759726001,
  SimplifyTaskEntity1705759726002,
  CleanupUnusedTaskTypes1705759726003,
  AddNonePriorityEnum1710000000000,
  AddNonePriorityEnum1738178127099,
  AddSystemProjectAndInbox1738360717263,
  FixProjectColors1738362321118,
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
  RemoveIsGoalFromTagTable1743380485000,
  AddCompletedAtToTasks1743458631759,
  AddUserEntityAndRelations1744054661856,
  AssignExistingDataToDefaultUser1744054769246,
  MakeUserIdNonNullable1744054883888,
  RemoveIsSystemFromTag1744198367443,
  AddIsArchivedToTag1744198558505,
  FixMigrationIssues1744204141138,
];

// Define all entities in one place for better maintenance
const entities = [
  Task,
  Project,
  Tag,
  FocusSession,
  BlockRule,
  SystemHealth,
  ApiRequestLog,
  ApiMetrics,
  User,
];

interface DatabaseLogConfig {
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  environment?: string;
}

// Log database configuration (safely)
const logDatabaseConfig = (config: DatabaseLogConfig): void => {
  console.log('Database Configuration:', {
    url: config.url ? 'URL provided' : 'Using individual params',
    host: config.url ? 'From URL' : config.host,
    port: config.url ? 'From URL' : config.port,
    database: config.url ? 'From URL' : config.database,
    ssl: config.ssl,
    environment: process.env.NODE_ENV,
  });
};

// Base configuration
const baseConfig: DatabaseConfig = {
  type: 'postgres' as const,
  entities,
  migrations,
  migrationsRun: false,
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === ('development' as LoggerOptions),
  ssl: false,
  retryAttempts: DATABASE_CONFIG.RETRY_ATTEMPTS,
  retryDelay: DATABASE_CONFIG.RETRY_DELAY,
  keepConnectionAlive: true,
  connectTimeoutMS: DATABASE_CONFIG.CONNECTION_TIMEOUT,
};

// Create the configuration based on whether we have a DATABASE_URL
export const typeOrmConfig: DatabaseConfig = process.env.DATABASE_URL
  ? {
      ...baseConfig,
      url: process.env.DATABASE_URL,
    }
  : {
      ...baseConfig,
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT) || 5432,
      username: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASS || 'postgres',
      database:
        process.env.NODE_ENV === 'test'
          ? process.env.PGDATABASE_TEST ||
            process.env.DB_NAME_TEST ||
            'zenith_test'
          : process.env.PGDATABASE || process.env.DB_NAME || 'zenith_db',
    };

// Log the configuration (safely)
logDatabaseConfig(typeOrmConfig);

// Create and export the DataSource instance
const dataSource = new DataSource({
  ...typeOrmConfig,
  type: 'postgres',
});

// Add error handler with structured logging
dataSource
  .initialize()
  .catch(
    (error: Error & { code?: string; detail?: string; where?: string }) => {
      console.error('Database initialization error:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        where: error.where,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    },
  );

export default dataSource;
