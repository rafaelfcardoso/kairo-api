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

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'zenith_db',
  entities: [Task, Project, Tag, FocusSession, BlockRule],
  migrations: [
    InitialSchema1705759726000,
    FixProjectColors1738362321118,
    EnsureInboxProject1738362321119,
    AddHasTimeToTasks1738934197033,
    UpdateTaskStatusEnum1739279174960,
    EnsureValidTaskStatuses1739279174961,
    AddProjectTypeEnum1739279174962,
  ],
  // Explicitly disable synchronize to prevent automatic schema updates
  // This ensures that all schema changes are handled through migrations
  synchronize: false,
  logging: true,
  // Add migrationsRun to ensure migrations are executed on application start
  migrationsRun: true,
};

export default new DataSource({
  ...typeOrmConfig,
  type: 'postgres',
} as any);
