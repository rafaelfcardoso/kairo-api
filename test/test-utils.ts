import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AiService } from '../src/common/services/ai.service';
import { MockAiService } from './mocks/mock-ai.service';

let app: INestApplication;
let testingModule: TestingModule;
let isInitialized = false;

/**
 * Creates or returns an existing test application instance
 * This ensures we only have one database connection across all tests
 * @param useMocks When true, includes mock providers for services like AiService
 */
export async function getTestApp(useMocks = false): Promise<INestApplication> {
  if (!isInitialized) {
    console.log('Initializing shared test app and database connection...');
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    // Add mock providers if requested
    if (useMocks) {
      // Override AiService with MockAiService
      moduleBuilder.overrideProvider(AiService).useClass(MockAiService);
    }

    testingModule = await moduleBuilder.compile();

    app = testingModule.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    isInitialized = true;
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

    app = null;
    testingModule = null;
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
