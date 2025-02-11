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

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'zenith',
  entities: [Task, Project, Tag, FocusSession, BlockRule],
  migrations: [
    InitialSchema1705759726000,
    FixProjectColors1738362321118,
    EnsureInboxProject1738362321119,
    AddHasTimeToTasks1738934197033,
    UpdateTaskStatusEnum1739279174960,
  ],
  synchronize: false,
  logging: true,
};

export default new DataSource({
  ...typeOrmConfig,
  type: 'postgres',
} as any);
