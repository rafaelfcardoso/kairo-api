import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InitialSchema1705759726000 } from '../migrations/1705759726000-InitialSchema';
import { FixProjectColors1738362321118 } from '../migrations/1738362321118-FixProjectColors';
import { EnsureInboxProject1738362321119 } from '../migrations/1738362321119-EnsureInboxProject';
import { AddHasTimeToTasks1738934197033 } from '../migrations/1738934197033-AddHasTimeToTasks';
import { UpdateTaskStatusEnum1739279174960 } from '../migrations/1739279174960-UpdateTaskStatusEnum';
import { EnsureValidTaskStatuses1739279174961 } from '../migrations/1739279174961-EnsureValidTaskStatuses';
import { AddProjectTypeEnum1739279174962 } from '../migrations/1739279174962-AddProjectTypeEnum';
import { AddNonePriorityEnum1710000000000 } from '../migrations/1710000000000-AddNonePriorityEnum';
import { CreateFocusSessionTables1740494148045 } from '../migrations/1740494148045-CreateFocusSessionTables';
import { AddProjectIdToFocusSession1740589432291 } from '../migrations/1740589432291-AddProjectIdToFocusSession';
import { AddRecurringTaskFields1740916550124 } from '../migrations/1740916550124-AddRecurringTaskFields';
import { CreateSystemHealthTable1741800000000 } from '../migrations/1741800000000-CreateSystemHealthTable';
import { CreateApiMetricsTable1741900000000 } from '../migrations/1741900000000-CreateApiMetricsTable';

export const databaseProviders = [
  {
    provide: DataSource,
    useFactory: async (configService: ConfigService) => {
      const dataSource = new DataSource({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: parseInt(configService.get('DB_PORT')),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASS'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false,
        migrations: [
          InitialSchema1705759726000,
          AddNonePriorityEnum1710000000000,
          FixProjectColors1738362321118,
          EnsureInboxProject1738362321119,
          AddHasTimeToTasks1738934197033,
          UpdateTaskStatusEnum1739279174960,
          EnsureValidTaskStatuses1739279174961,
          AddProjectTypeEnum1739279174962,
          CreateFocusSessionTables1740494148045,
          AddProjectIdToFocusSession1740589432291,
          AddRecurringTaskFields1740916550124,
          CreateSystemHealthTable1741800000000,
          CreateApiMetricsTable1741900000000,
        ],
        migrationsRun: true,
        logging: true,
      });

      return dataSource.initialize();
    },
    inject: [ConfigService],
  },
];
