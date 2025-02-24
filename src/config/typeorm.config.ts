// src/config/typeorm.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, LoggerOptions } from 'typeorm';
import { Task } from '../tasks/tasks.entity';
import { Project } from '../projects/projects.entity';
import { Tag } from '../tags/tags.entity';
import { FocusSession } from '../entities/focus-session.entity';
import { BlockRule } from '../entities/block-rule.entity';
import { InitialSchema1705759726000 } from '../migrations/1705759726000-InitialSchema';
import { FixProjectColors1738362321118 } from '../migrations/1738362321118-FixProjectColors';
import { EnsureInboxProject1738362321119 } from '../migrations/1738362321119-EnsureInboxProject';
import { AddHasTimeToTasks1738934197033 } from '../migrations/1738934197033-AddHasTimeToTasks';
import { UpdateTaskStatusEnum1739279174960 } from '../migrations/1739279174960-UpdateTaskStatusEnum';
import { EnsureValidTaskStatuses1739279174961 } from '../migrations/1739279174961-EnsureValidTaskStatuses';
import { AddProjectTypeEnum1739279174962 } from '../migrations/1739279174962-AddProjectTypeEnum';
import { AddNonePriorityEnum1710000000000 } from '../migrations/1710000000000-AddNonePriorityEnum';
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
  AddNonePriorityEnum1710000000000,
  FixProjectColors1738362321118,
  EnsureInboxProject1738362321119,
  AddHasTimeToTasks1738934197033,
  UpdateTaskStatusEnum1739279174960,
  EnsureValidTaskStatuses1739279174961,
  AddProjectTypeEnum1739279174962,
];

// Define all entities in one place for better maintenance
const entities = [Task, Project, Tag, FocusSession, BlockRule];

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
  migrationsRun: true,
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === ('development' as LoggerOptions),
  ssl: process.env.NODE_ENV === 'local' ? false : { rejectUnauthorized: false },
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
      database: process.env.PGDATABASE || process.env.DB_NAME || 'zenith_db',
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
