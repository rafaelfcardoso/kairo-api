// src/config/typeorm.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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

// Define all migrations in one place for better maintenance
const migrations = [
  InitialSchema1705759726000,
  FixProjectColors1738362321118,
  EnsureInboxProject1738362321119,
  AddHasTimeToTasks1738934197033,
  UpdateTaskStatusEnum1739279174960,
  EnsureValidTaskStatuses1739279174961,
  AddProjectTypeEnum1739279174962,
];

// Define all entities in one place for better maintenance
const entities = [Task, Project, Tag, FocusSession, BlockRule];

// Log database configuration (safely)
const logDatabaseConfig = (config: any) => {
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
const baseConfig = {
  type: 'postgres' as const,
  entities,
  migrations,
  migrationsRun: true,
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
  ssl: process.env.NODE_ENV !== 'local' ? { rejectUnauthorized: false } : false,
  retryAttempts: 10,
  retryDelay: 3000,
  keepConnectionAlive: true,
  connectTimeoutMS: 10000,
};

// Create the configuration based on whether we have a DATABASE_URL
export const typeOrmConfig: TypeOrmModuleOptions = process.env.DATABASE_URL
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
} as any);

// Add error handler
dataSource.initialize().catch((error) => {
  console.error('Database initialization error:', {
    message: error.message,
    code: error.code,
    detail: error.detail,
    where: error.where,
  });
});

export default dataSource;
