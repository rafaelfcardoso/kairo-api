import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../src/tasks/tasks.entity';
import { Project } from '../src/projects/projects.entity';
import { Tag } from '../src/tags/tags.entity';
import { TasksRepository } from '../src/tasks/tasks.repository';
import { ProjectsRepository } from '../src/projects/projects.repository';
import { TagsRepository } from '../src/tags/tags.repository';
import { SecurityLoggerService } from '../src/common/services/security-logger.service';
import { TaskDomainService } from '../src/tasks/tasks.domain.service';
import { NotificationDomainService } from '../src/tasks/notification.domain.service';
import { RecurringTaskService } from '../src/tasks/recurring-task.service';

let app: INestApplication | undefined;
let testingModule: TestingModule | undefined;
let isInitialized = false;

/**
 * Creates or returns an existing test application instance
 * This ensures we only have one database connection across all tests
 */
export async function getTestApp(): Promise<INestApplication> {
  if (!isInitialized) {
    console.log('Initializing shared test app and database connection...');
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule, TypeOrmModule.forFeature([Task, Project, Tag])],
      providers: [
        {
          provide: TasksRepository,
          useFactory: (dataSource: DataSource) => {
            return new TasksRepository(dataSource);
          },
          inject: [DataSource],
        },
        {
          provide: ProjectsRepository,
          useFactory: (dataSource: DataSource) => {
            return new ProjectsRepository(dataSource);
          },
          inject: [DataSource],
        },
        {
          provide: TagsRepository,
          useClass: TagsRepository,
        },
        {
          provide: SecurityLoggerService,
          useValue: {
            logSecurityEvent: async () => {},
            logValidationFailure: async () => {},
            logSuspiciousActivity: async () => {},
          },
        },
        {
          provide: TaskDomainService,
          useValue: {
            calculateNextOccurrence: async () => null,
            isTaskDue: () => false,
            getTasksNeedingReminders: async () => [],
          },
        },
        {
          provide: NotificationDomainService,
          useValue: {
            generateNotificationContent: async () => ({}),
            scheduleTaskReminder: async () => {},
          },
        },
        {
          provide: RecurringTaskService,
          useValue: {
            processCompletedTask: async () => {},
            scheduleNextRecurrence: async () => {},
            calculateNextOccurrence: async () => null,
          },
        },
      ],
    });

    testingModule = await moduleBuilder.compile();

    app = testingModule.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    isInitialized = true;
  }

  if (!app) {
    throw new Error('App failed to initialize');
  }

  return app;
}

/**
 * Closes the test application and database connections
 */
export async function closeTestApp(): Promise<void> {
  if (app) {
    console.log('Closing shared test app and database connections...');

    // Get all data sources from TypeORM and close them explicitly
    try {
      const dataSource = app.get(DataSource);
      if (dataSource && dataSource.isInitialized) {
        // Close all PostgreSQL connections directly
        if (dataSource.driver && dataSource.driver['master']) {
          const pool = dataSource.driver['master'].pool;
          if (pool) {
            console.log('Draining PostgreSQL connection pool...');
            await new Promise<void>((resolve) => {
              pool.end(() => {
                console.log('Pool drained successfully');
                resolve();
              });
            });
          }
        }

        // Destroy the data source
        await dataSource.destroy();
        console.log('Successfully closed TypeORM connections');
      }
    } catch (error) {
      console.error('Error closing TypeORM connections:', error);
    }

    // Then close the app
    await app.close();

    // Give some time for all connections to be closed
    await new Promise((resolve) => setTimeout(resolve, 500));

    app = undefined;
    testingModule = undefined;
    isInitialized = false;
  }
}

/**
 * Creates a JWT token for test authentication
 */
export function createTestAuthToken(app: INestApplication): string {
  const jwtService = app.get('JwtService');
  return jwtService.sign({
    sub: 'test-user',
    name: 'Test User',
    type: 'user',
  });
}

/**
 * Creates a transaction for test isolation
 */
export async function createTestTransaction(app: INestApplication) {
  const dataSource = app.get(DataSource);
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  return {
    queryRunner,
    async commit() {
      await queryRunner.commitTransaction();
      await queryRunner.release();
    },
    async rollback() {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    },
  };
}
