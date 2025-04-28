import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Import the actual entities
import { Task } from '../tasks/tasks.entity';
import { Project } from '../projects/projects.entity';
import { Tag } from '../tags/tags.entity';
import { FocusSession } from '../focus-sessions/focus-sessions.entity';
import { BlockRule } from '../entities/block-rule.entity';
import { SystemHealth } from '../entities/system-health.entity';
import { ApiRequestLog, ApiMetrics } from '../entities/api-metrics.entity';

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
        ],
        migrations: [],
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') !== 'production',
      });

      await dataSource.initialize();
      return dataSource;
    },
  },
];
