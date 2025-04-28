import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Task, TaskStatus, RecurrencePattern } from '../src/tasks/tasks.entity';
import { Repository, DataSource } from 'typeorm';
import { SchedulerService } from '../src/common/services/scheduler.service';
import { User } from '../src/entities/user.entity';
import request from 'supertest';

describe('Scheduler E2E', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let userRepository: Repository<User>;
  let schedulerService: SchedulerService;
  let dataSource: DataSource;
  let testTaskId: string;

  // Test user credentials and token
  const testUserEmail = `test-scheduler-${Date.now()}@e2e.com`;
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
      schedulerService = moduleFixture.get<SchedulerService>(SchedulerService);
      dataSource = moduleFixture.get<DataSource>(getDataSourceToken());

      await app.init();

      // Register test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          name: 'E2E Scheduler User',
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
      if (testUserId) {
        await userRepository.delete(testUserId);
      }
    } catch (error) {
      console.error('Error cleaning up test user:', error);
    }
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('[afterAll] DataSource destroyed.');
    }
    await app.close();
  });

  beforeEach(async () => {
    const pastDate = new Date(fixedDate);
    pastDate.setMinutes(pastDate.getMinutes() - 5);
    const task = await taskRepository.save({
      title: 'E2E Scheduler Test Task',
      description: 'Base task for scheduler tests',
      dueDate: pastDate,
      needsReminder: true,
      status: TaskStatus.NOT_STARTED,
      isArchived: false,
      userId: testUserId,
    });
    testTaskId = task.id;
  });

  afterEach(async () => {
    if (testTaskId) {
      await taskRepository.delete(testTaskId);
      testTaskId = null;
    }
  });

  describe('Scheduler Processing', () => {
    it('should process a due task (check notification logic if mocked)', async () => {
      expect(testTaskId).toBeDefined();

      await schedulerService.checkDueTasks();

      const processedTask = await taskRepository.findOne({
        where: { id: testTaskId },
      });
      expect(processedTask).toBeDefined();
    });

    it('should process a recurring task and set the next due date', async () => {
      expect(testTaskId).toBeDefined();
      const task = await taskRepository.findOne({
        where: { id: testTaskId },
      });

      expect(task).not.toBeNull();
      if (!task) return;

      task.isRecurring = true;
      task.recurrencePattern = RecurrencePattern.DAILY;
      task.recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
      await taskRepository.save(task);

      await schedulerService.checkDueTasks();

      const processedTask = await taskRepository.findOne({
        where: { id: testTaskId },
      });

      expect(processedTask).not.toBeNull();
      if (!processedTask) return;

      expect(processedTask.nextDueDate).toBeDefined();
      expect(processedTask.nextDueDate).toBeInstanceOf(Date);
    });

    it('should update recurring tasks without nextDueDate', async () => {
      const taskToMaintain = await taskRepository.save({
        title: 'E2E Scheduler Maintenance Test',
        description: 'This task should be updated by the maintenance job',
        dueDate: fixedDate,
        isRecurring: true,
        recurrencePattern: RecurrencePattern.DAILY,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        status: TaskStatus.NOT_STARTED,
        isArchived: false,
        userId: testUserId,
        nextDueDate: null,
      });

      await schedulerService.updateRecurringTasksDueDates();

      const updatedTask = await taskRepository.findOne({
        where: { id: taskToMaintain.id },
      });

      expect(updatedTask).not.toBeNull();
      if (!updatedTask) return;

      expect(updatedTask.nextDueDate).toBeDefined();

      await taskRepository.delete(taskToMaintain.id);
    });
  });
});
