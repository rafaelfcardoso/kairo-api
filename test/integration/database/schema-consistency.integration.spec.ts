import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../../../src/app.module';
import { DataSource } from 'typeorm';
import { Task } from '../../../src/tasks/tasks.entity';
import request from 'supertest';
import { User } from '../../../src/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('Database Schema Consistency', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let authToken: string;
  let testUserId: string;

  // Test user credentials
  const testUserEmail = `test-schema-${Date.now()}@e2e.com`;
  const testUserPassword = 'TestPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = moduleFixture.get(getDataSourceToken());
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );

    // Register test user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        name: 'Schema Test User',
      })
      .expect(201);

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUserEmail, password: testUserPassword })
      .expect(200);

    authToken = loginResponse.body.access_token;
    testUserId = loginResponse.body.user.id;
    expect(authToken).toBeDefined();
  });

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        console.error('Error deleting test user:', error);
      }
    }
    await app.close();
  });

  describe('Entity and Database Schema Consistency', () => {
    it('should have consistent Task entity columns in database', async () => {
      // Get the entity metadata from TypeORM
      const taskEntityMetadata = dataSource.getMetadata(Task);
      const entityColumns = taskEntityMetadata.columns
        .filter((col) => !col.relationMetadata) // Skip relation columns
        .map((col) => col.databaseName); // Use databaseName instead of propertyName

      // Query the database to get the actual columns in the task table
      const query = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'task' AND table_schema = 'public'
      `;
      const tableColumns = await dataSource.query(query);
      const dbColumns = tableColumns.map((col) => col.column_name);

      // Check that all entity database column names exist in the database
      for (const column of entityColumns) {
        // Skip certain virtual or special columns that won't be in the database directly
        if (['isCompleted'].includes(column)) {
          continue;
        }

        expect(dbColumns).toContain(column);
      }
    });

    // This test directly verifies that completedAt exists in the database
    it('should have completedAt column in the task table', async () => {
      // Query the database to check if completedAt column exists
      const query = `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'task' 
          AND column_name = 'completedAt'
        ) as column_exists
      `;
      const result = await dataSource.query(query);

      expect(result[0].column_exists).toBe(true);
    });

    // This test verifies that completedAt is set when a task is completed via API
    it('should set completedAt when completing a task via API', async () => {
      // Create a task
      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test completedAt column',
          description: 'Task to verify completedAt column',
          status: 'not_started',
        })
        .expect(201);

      const taskId = createResponse.body.id;

      // Complete the task
      const completeResponse = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'completed',
        })
        .expect(200);

      // Verify the completedAt field is set in the response
      expect(completeResponse.body.completedAt).toBeDefined();
      expect(completeResponse.body.status).toBe('completed');

      // Verify the completedAt field is set in the database
      const query = `
        SELECT "completedAt" 
        FROM task 
        WHERE id = $1
      `;
      const result = await dataSource.query(query, [taskId]);

      expect(result[0].completedAt).not.toBeNull();
    });

    // This test verifies that the GET /tasks endpoint works without 500 error
    it('should successfully retrieve tasks without 500 error', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
