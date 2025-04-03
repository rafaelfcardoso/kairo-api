import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';

// Mock JWT auth guard to bypass authentication
class MockAuthGuard {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = {
      id: 'test-user-id',
      username: 'test-user',
      email: 'test@example.com',
    };
    return true;
  }
}

/**
 * This E2E test specifically checks API endpoints for 500 errors
 * It ensures critical endpoints don't have server errors
 */
describe('API 500 Error Check (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testTaskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(MockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = moduleFixture.get(getDataSourceToken());

    // Create a test task
    const response = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', 'Bearer test-token')
      .set('user-id', 'test-user-id')
      .send({
        title: 'Test Task for 500 Error Check',
        description: 'This task tests for 500 errors',
      });

    testTaskId = response.body.id;
  });

  afterAll(async () => {
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
    it('should return 200 for GET /tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', 'Bearer test-token')
        .set('user-id', 'test-user-id')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 200 for GET /tasks/:id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tasks/${testTaskId}`)
        .set('Authorization', 'Bearer test-token')
        .set('user-id', 'test-user-id')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testTaskId);
    });

    it('should return 200 when completing a task (PUT /tasks/:id)', async () => {
      const response = await request(app.getHttpServer())
        .put(`/tasks/${testTaskId}`)
        .set('Authorization', 'Bearer test-token')
        .set('user-id', 'test-user-id')
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('completed');
    });

    it('should verify completedAt is properly set in the database', async () => {
      // Check that the completedAt field was set
      const result = await dataSource.query(
        `
              SELECT "completedAt" 
              FROM "task" 
              WHERE "id" = $1
             `,
        [testTaskId],
      );

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].completedAt).not.toBeNull();
    });
  });

  describe('Projects API', () => {
    it('should return 200 for GET /projects', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Tags API', () => {
    it('should return 200 for GET /tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/tags')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
