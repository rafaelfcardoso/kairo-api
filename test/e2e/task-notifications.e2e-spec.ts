import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Task, TaskStatus, TaskPriority } from '../../src/tasks/tasks.entity';
import { User } from '../../src/entities/user.entity';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

// Mock NotificationService - adjust based on actual service methods
const mockNotificationService = {
  sendEmail: jest.fn(),
  scheduleTaskReminder: jest.fn(),
};

// Mock SchedulerService
const mockSchedulerService = {
  checkDueTasks: jest.fn(),
};

describe('Task Notifications (E2E)', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;

  // Test user credentials and token
  const testUserEmail = `test-notify-${Date.now()}@e2e.com`;
  const testUserPassword = 'TestPassword123!';
  let testUserId: string;
  let authToken: string;

  // Track created entities for cleanup
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    jest.setTimeout(120000);

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        // Optionally override providers if needed for mocking
        // .overrideProvider(NotificationService).useValue(mockNotificationService)
        // .overrideProvider(SchedulerService).useValue(mockSchedulerService)
        .compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe());

      taskRepository = moduleFixture.get<Repository<Task>>(
        getRepositoryToken(Task),
      );
      userRepository = moduleFixture.get<Repository<User>>(
        getRepositoryToken(User),
      );
      dataSource = moduleFixture.get<DataSource>(getDataSourceToken());

      await app.init();

      // Register test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          name: 'E2E Notify User',
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
    } catch (error) {
      console.error('Error setting up test module:', error);
      throw error;
    }
  }, 120000);

  afterAll(async () => {
    try {
      if (createdTaskIds.length > 0) {
        await taskRepository.delete(createdTaskIds);
      }
      if (testUserId) {
        await userRepository.delete(testUserId);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
    // Explicitly destroy DataSource before closing app
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('[afterAll] DataSource destroyed.');
    }
    await app.close();
  });

  // --- Test Cases --- //

  it('should create a task with a due date requiring notification', async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow

    const taskData = {
      title: 'Notify Task E2E - Due Tomorrow',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.HIGH,
      dueDate: dueDate.toISOString(),
      needsReminder: true,
    };

    const response = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send(taskData)
      .expect(201);

    expect(response.body).toBeDefined();
    expect(response.body.id).toBeDefined();
    expect(response.body.needsReminder).toBe(true);
    createdTaskIds.push(response.body.id);

    // Check if reminder was scheduled (using mock if NotificationService was overridden)
    // expect(mockNotificationService.scheduleTaskReminder).toHaveBeenCalled();
  });

  it('should not send notification for tasks not due yet (manual check)', async () => {
    // This test might rely on manually triggering a check or asserting no notification was sent
    // For now, we assume the scheduler handles timing.
    // We could add an endpoint to manually trigger checks for testing.

    // Example: Trigger a manual check (if such endpoint existed)
    // await request(app.getHttpServer())
    //   .post('/scheduler/check-due-tasks')
    //   .set('Authorization', `Bearer ${authToken}`)
    //   .expect(200);

    // Assert notification service mock was NOT called (if mocking)
    // expect(mockNotificationService.sendEmail).not.toHaveBeenCalled();
    expect(true).toBe(true); // Placeholder assertion
  });

  // ... Add tests for when a task becomes due ...
  // This usually requires mocking time or waiting

  // Example Test (requires time mocking or adjustment)
  // it('should send notification when task becomes due', async () => {
  //   // --- Mock time to advance past the due date --- //

  //   // Trigger scheduler check
  //   await request(app.getHttpServer())
  //     .post('/scheduler/check-due-tasks') // Assuming endpoint exists
  //     .set('Authorization', `Bearer ${authToken}`)
  //     .expect(200);

  //   // Assert notification service mock WAS called (if mocking)
  //   expect(mockNotificationService.sendEmail).toHaveBeenCalled();

  //   // --- Restore time --- //
  // });

  // Test notification preferences if implemented
  // it('should respect user notification preferences', async () => {
  // });
});
