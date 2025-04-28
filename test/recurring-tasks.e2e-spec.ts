import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  Task,
  TaskStatus,
  TaskPriority,
  RecurrencePattern,
} from '../src/tasks/tasks.entity';
import { User } from '../src/entities/user.entity';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

describe('Recurring Tasks E2E', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;

  // Test user credentials and token
  const testUserEmail = `test-recurr-${Date.now()}@e2e.com`;
  const testUserPassword = 'TestPassword123!';
  let testUserId: string;
  let authToken: string;

  // Mock the current date for consistent testing
  let originalDate: DateConstructor;
  let fixedDate: Date;

  beforeAll(async () => {
    jest.setTimeout(120000);

    originalDate = global.Date;
    fixedDate = new Date('2025-03-15T10:00:00Z');

    // Mock Date constructor and Date.now()
    global.Date = class extends originalDate {
      constructor(value?: number | string | Date) {
        if (value) {
          super(value);
        } else {
          super(fixedDate);
        }
      }

      static now() {
        return fixedDate.getTime();
      }
    } as DateConstructor;

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

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
          name: 'E2E Recurr User',
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
    global.Date = originalDate;
    try {
      // Clean up only the test user
      if (testUserId) {
        await userRepository.delete(testUserId);
      }
    } catch (error) {
      console.error('Error cleaning up test user:', error);
    }
    // Explicitly destroy DataSource before closing app
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('[afterAll] DataSource destroyed.');
    }
    await app.close();
  });

  describe('Recurring Task Lifecycle', () => {
    let taskIdForLifecycleTest: string;

    beforeEach(async () => {
      const futureDueDate = new Date(); // Use current date + offset
      futureDueDate.setDate(futureDueDate.getDate() + 2); // 2 days from now
      futureDueDate.setHours(10, 0, 0, 0); // Set specific time

      const createTaskDto = {
        title: 'E2E Test Recurring Task - Lifecycle',
        description: 'Task for lifecycle tests',
        dueDate: futureDueDate.toISOString(),
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        needsReminder: true,
      };
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTaskDto)
        .expect(201);
      taskIdForLifecycleTest = response.body.id;
      expect(taskIdForLifecycleTest).toBeDefined();
    });

    afterEach(async () => {
      // Clean up task and any generated instances
      if (taskIdForLifecycleTest) {
        const tasksToDelete = await taskRepository.find({
          where: [
            { id: taskIdForLifecycleTest },
            { recurringParentId: taskIdForLifecycleTest },
          ],
          withDeleted: true,
        });
        if (tasksToDelete.length > 0) {
          await taskRepository.remove(tasksToDelete);
        }
        taskIdForLifecycleTest = null;
      }
    });

    it('should retrieve the created recurring task', async () => {
      expect(taskIdForLifecycleTest).toBeDefined();
      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskIdForLifecycleTest}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskIdForLifecycleTest);
      expect(response.body.isRecurring).toBe(true);
    });

    it('should complete a recurring task and create the next occurrence', async () => {
      expect(taskIdForLifecycleTest).toBeDefined();
      const taskToComplete = await taskRepository.findOne({
        where: { id: taskIdForLifecycleTest },
      });
      if (!taskToComplete.recurrenceRule) {
        taskToComplete.recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
        await taskRepository.save(taskToComplete);
      }
      expect(taskToComplete.recurrenceRule).toBeDefined();

      // Complete the task
      await request(app.getHttpServer())
        .put(`/tasks/${taskIdForLifecycleTest}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: TaskStatus.COMPLETED })
        .expect(200);

      // Give time for async operations if needed (e.g., background job)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const tasksResponse = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ title: 'E2E Test Recurring Task - Lifecycle' })
        .expect(200);
      const nextOccurrence = tasksResponse.body.find(
        (task) =>
          task.recurringParentId === taskIdForLifecycleTest &&
          task.status === TaskStatus.NOT_STARTED,
      );

      expect(nextOccurrence).toBeDefined();
      expect(nextOccurrence.isRecurring).toBe(true);
      expect(nextOccurrence.status).toBe(TaskStatus.NOT_STARTED);
      expect(nextOccurrence.recurringParentId).toBe(taskIdForLifecycleTest);
    });
  });

  describe('Recurring Task API Features', () => {
    it('should create a weekly recurring task with specific days', async () => {
      const futureDueDate = new Date();
      futureDueDate.setDate(futureDueDate.getDate() + 3); // 3 days from now
      futureDueDate.setHours(10, 0, 0, 0);

      const validRule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';
      const createTaskDto = {
        title: 'E2E Test Weekly Recurring Task',
        description: 'This task recurs on specific days of the week',
        dueDate: futureDueDate.toISOString(),
        isRecurring: true,
        recurrenceRule: validRule,
        needsReminder: true,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTaskDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.title).toBe(createTaskDto.title);
      expect(response.body.isRecurring).toBe(true);
      expect(response.body.recurrenceRule).toBe(validRule);

      await taskRepository.delete(response.body.id);
    });

    it('should reject invalid recurrence patterns', async () => {
      const futureDueDate = new Date();
      futureDueDate.setDate(futureDueDate.getDate() + 4); // 4 days from now

      const invalidTaskDto = {
        title: 'Invalid Recurring Task',
        description: 'This task has an invalid recurrence pattern',
        dueDate: futureDueDate.toISOString(),
        isRecurring: true,
        recurrenceRule: 'FREQ=INVALID',
      };

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTaskDto)
        .expect(400);
    });
  });
});
