import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { TaskStatus } from '../../src/tasks/tasks.entity';
import { Repository } from 'typeorm';
import { Task } from '../../src/tasks/tasks.entity';
import { User } from '../../src/entities/user.entity';

/**
 * This E2E test specifically checks API endpoints for 500 errors
 * It ensures critical endpoints don't have server errors
 */
describe('API 500 Error Check (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let taskRepository: Repository<Task>;
  let userRepository: Repository<User>;
  let authToken: string;
  let testUserId: string;

  // Test user credentials
  const testUserEmail = `test-500-${Date.now()}@e2e.com`;
  const testUserPassword = 'TestPassword123!';

  beforeAll(async () => {
    jest.setTimeout(120000);
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          transform: true,
        }),
      );

      await app.init();
      dataSource = moduleFixture.get(getDataSourceToken());
      taskRepository = moduleFixture.get(getRepositoryToken(Task));
      userRepository = moduleFixture.get(getRepositoryToken(User));

      // Register test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          name: 'E2E 500 User',
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

      // No initial data creation here
    } catch (error) {
      console.error('Error setting up 500 test module:', error);
      throw error;
    }
  }, 120000);

  afterAll(async () => {
    try {
      // Clean up user only
      if (testUserId) await userRepository.delete(testUserId);
    } catch (error) {
      console.error('Error cleaning up 500 test data:', error);
    }
    if (dataSource && dataSource.isInitialized) {
      // Explicit destroy
      await dataSource.destroy();
      console.log('[afterAll] DataSource destroyed.');
    }
    await app.close();
  });

  describe('API health checks', () => {
    it('should return 200 for GET /health', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Tasks API', () => {
    let taskIdForTests: string;

    beforeEach(async () => {
      const task = await taskRepository.save({
        title: 'Test Task for 500 Error Check',
        description: 'This task tests for 500 errors',
        userId: testUserId,
      });
      taskIdForTests = task.id;
    });

    afterEach(async () => {
      if (taskIdForTests) {
        await taskRepository.delete(taskIdForTests);
        taskIdForTests = null;
      }
    });

    it('should return 200 for GET /tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 200 for GET /tasks/:id', async () => {
      expect(taskIdForTests).toBeDefined();
      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskIdForTests}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(taskIdForTests);
    });

    it('should return 200 when completing a task (PUT /tasks/:id)', async () => {
      expect(taskIdForTests).toBeDefined();
      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskIdForTests}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: TaskStatus.COMPLETED })
        .expect(200);

      expect(response.body.status).toBe(TaskStatus.COMPLETED);
    });

    it('should verify completedAt is properly set in the database', async () => {
      expect(taskIdForTests).toBeDefined();
      // Complete task first
      await request(app.getHttpServer())
        .put(`/tasks/${taskIdForTests}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: TaskStatus.COMPLETED })
        .expect(200);

      const result = await taskRepository.findOne({
        where: { id: taskIdForTests },
      });
      expect(result).toBeDefined();
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.completedAt).not.toBeNull();
    });
  });

  describe('Projects API', () => {
    it('should return 200 for GET /projects', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Tags API', () => {
    it('should return 200 for GET /tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
