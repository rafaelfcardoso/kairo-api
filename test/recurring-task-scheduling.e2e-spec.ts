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
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('Recurring Task Scheduling (E2E)', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let userRepository: Repository<User>;

  // Test user credentials and token
  const testUserEmail = `test-recurring-${Date.now()}@e2e.com`;
  const testUserPassword = 'TestPassword123!';
  let testUserId: string;
  let authToken: string;

  // Track created entities for cleanup
  const createdTaskIds: string[] = [];
  // const mockDate = new Date('2025-03-15T10:00:00Z'); // Mock date commented out

  // Save original Date implementation
  // const RealDate = global.Date; // Mock date commented out

  beforeAll(async () => {
    // Increase timeout for database connection
    jest.setTimeout(120000);

    // Mock Date for consistent testing - COMMENTED OUT
    // global.Date = class extends RealDate {
    //   constructor() {
    //     super();
    //     return mockDate;
    //   }
    //   static now() {
    //     return mockDate.getTime();
    //   }
    // };

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

      await app.init();

      // Register test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          name: 'E2E Recurring User',
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

      // Force cleanup using TRUNCATE before tests for tables created in InitialSchema
      console.log('Truncating initial schema tables before test suite...');
      try {
        // await taskRepository.query(`TRUNCATE TABLE "task_tags_tag" CASCADE`); // Created later
        // await taskRepository.query(
        //   `TRUNCATE TABLE "task_focus_sessions_focus_session" CASCADE`,
        // ); // Created later
        // await taskRepository.query(`TRUNCATE TABLE "focus_session" CASCADE`); // Created later
        await taskRepository.query(`TRUNCATE TABLE "tag" CASCADE`);
        await taskRepository.query(`TRUNCATE TABLE "task" CASCADE`);
        // No project/project_closure here
        console.log('Tables truncated.');
      } catch (error) {
        console.error('Error truncating tables:', error);
      }
    } catch (error) {
      console.error('Error setting up test module:', error);
      throw error;
    }
  }, 120000);

  afterAll(async () => {
    // Clean up test data
    try {
      if (createdTaskIds.length > 0) {
        await taskRepository.delete(createdTaskIds);
      }
      // Delete the test user
      if (testUserId) {
        await userRepository.delete(testUserId);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }

    // Restore original Date - COMMENTED OUT
    // global.Date = RealDate;

    await app.close();
  });

  describe('Recurring Task Scheduling', () => {
    it('should create a daily recurring task', async () => {
      const dailyTask = {
        title: 'Recurring Task E2E Test - Daily',
        description: 'A daily recurring task for testing',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.MEDIUM,
        isRecurring: true,
        recurrencePattern: RecurrencePattern.DAILY,
        dueDate: new Date('2025-03-16T09:00:00Z'),
        hasTime: true,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dailyTask)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe(dailyTask.title);
      expect(response.body.isRecurring).toBe(true);
      expect(response.body.recurrencePattern).toBe(RecurrencePattern.DAILY);

      // Save ID for cleanup
      createdTaskIds.push(response.body.id);

      // Check database representation
      const savedTask = await taskRepository.findOne({
        where: { id: response.body.id },
      });

      expect(savedTask).toBeDefined();
      expect(savedTask.isRecurring).toBe(true);
      expect(savedTask.recurrencePattern).toBe(RecurrencePattern.DAILY);
      expect(savedTask.nextDueDate).toBeDefined();
    });

    it('should create a weekly recurring task', async () => {
      const weeklyTask = {
        title: 'Recurring Task E2E Test - Weekly',
        description: 'A weekly recurring task for testing',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.MEDIUM,
        isRecurring: true,
        recurrencePattern: RecurrencePattern.WEEKLY,
        recurrenceDays: 'monday,wednesday,friday',
        dueDate: new Date('2025-03-17T14:00:00Z'),
        hasTime: true,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(weeklyTask)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe(weeklyTask.title);
      expect(response.body.isRecurring).toBe(true);
      expect(response.body.recurrencePattern).toBe(RecurrencePattern.WEEKLY);
      expect(response.body.recurrenceDays).toBe(weeklyTask.recurrenceDays);

      // Save ID for cleanup
      createdTaskIds.push(response.body.id);
    });

    it('should complete a recurring task and generate the next occurrence', async () => {
      // Get the daily task
      expect(createdTaskIds.length).toBeGreaterThanOrEqual(1);
      const taskId = createdTaskIds[0];

      // Get the current task before completion
      const taskBeforeCompletion = await taskRepository.findOne({
        where: { id: taskId },
      });
      expect(taskBeforeCompletion).toBeDefined();

      // Complete the task
      const updateTaskDto = {
        status: TaskStatus.COMPLETED,
      };

      await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTaskDto)
        .expect(200);

      // Check for a new task that should have been created
      // Get all tasks with the same title
      const response = await request(app.getHttpServer())
        .get('/tasks?title=Recurring Task E2E Test - Daily')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(1); // Should have at least 2 tasks now

      // Find the new task (not the completed one)
      const newTask = response.body.find(
        (task) =>
          task.id !== taskId &&
          task.status === TaskStatus.NOT_STARTED &&
          task.recurringParentId === taskId,
      );

      expect(newTask).toBeDefined();
      expect(newTask.recurringParentId).toBe(taskId);
      expect(newTask.dueDate).toBeDefined();

      // Add the new task ID to our cleanup list
      createdTaskIds.push(newTask.id);

      // Check if the next due date is correct (should be one day after the original due date)
      const originalDueDate = new Date(taskBeforeCompletion.dueDate);
      const nextDueDate = new Date(newTask.dueDate);

      const diffTime = Math.abs(
        nextDueDate.getTime() - originalDueDate.getTime(),
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(1); // For daily tasks, next occurrence should be 1 day later
    });

    it('should reschedule a recurring task', async () => {
      // Get the weekly task
      expect(createdTaskIds.length).toBeGreaterThanOrEqual(2);
      const taskId = createdTaskIds[1];

      // Reschedule the task
      const newDueDate = new Date('2025-03-24T14:00:00Z'); // One week later

      const updateTaskDto = {
        dueDate: newDueDate.toISOString(),
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(new Date(response.body.dueDate).toISOString()).toEqual(
        newDueDate.toISOString(),
      );

      // Verify next due date was also updated correctly
      const updatedTask = await taskRepository.findOne({
        where: { id: taskId },
      });

      expect(updatedTask).toBeDefined();
      expect(updatedTask.dueDate.toISOString()).toEqual(
        newDueDate.toISOString(),
      );
      expect(updatedTask.nextDueDate).toBeDefined();
    });

    it('should fail to create a recurring task with invalid recurrence pattern', async () => {
      const invalidTask = {
        title: 'Invalid Recurring Task',
        description: 'A task with invalid recurrence pattern',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.MEDIUM,
        isRecurring: true,
        recurrencePattern: 'invalid_pattern',
        dueDate: new Date('2025-03-16T09:00:00Z'),
      };

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTask)
        .expect(400); // Should return Bad Request
    });

    it('should get all recurring tasks', async () => {
      // Get all recurring tasks
      const response = await request(app.getHttpServer())
        .get('/tasks?isRecurring=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThanOrEqual(2); // Should have at least our 2 recurring tasks

      // All returned tasks should have isRecurring flag set to true
      response.body.forEach((task) => {
        expect(task.isRecurring).toBe(true);
      });
    });

    it('should allow cancelling a recurring task', async () => {
      // Get the daily task
      expect(createdTaskIds.length).toBeGreaterThanOrEqual(1);
      const taskId = createdTaskIds[0];

      // Cancel recurring behavior by setting isRecurring to false
      const updateTaskDto = {
        isRecurring: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.isRecurring).toBe(false);

      // Verify the database record was updated
      const updatedTask = await taskRepository.findOne({
        where: { id: taskId },
      });

      expect(updatedTask).toBeDefined();
      expect(updatedTask.isRecurring).toBe(false);
    });
  });
});
