import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TaskStatus, RecurrencePattern } from '../src/tasks/tasks.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../src/tasks/tasks.entity';
import { Repository } from 'typeorm';

describe('Recurring Tasks E2E', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let createdTaskId: string;

  // Mock the current date for consistent testing
  let originalDate: DateConstructor;
  let fixedDate: Date;

  beforeAll(async () => {
    // Increase timeout for database connection
    jest.setTimeout(60000);

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

    // Log environment variables for debugging
    console.log('Running E2E tests with:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Database:', process.env.PGDATABASE);

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe());

      taskRepository = moduleFixture.get<Repository<Task>>(
        getRepositoryToken(Task),
      );

      await app.init();

      // Clean up any existing test data
      try {
        await taskRepository.delete({ title: 'E2E Test Recurring Task' });
      } catch (error) {
        console.error('Error cleaning up test data:', error);
      }
    } catch (error) {
      console.error('Error setting up test module:', error);
      throw error;
    }
  }, 60000); // Increase timeout for beforeAll

  afterAll(async () => {
    global.Date = originalDate;

    // Clean up test data
    if (createdTaskId) {
      await taskRepository.delete(createdTaskId);
    }

    await app.close();
  });

  describe('Recurring Task Lifecycle', () => {
    it('should create a recurring task', async () => {
      const createTaskDto = {
        title: 'E2E Test Recurring Task',
        description: 'This is a test recurring task created by E2E tests',
        dueDate: '2025-03-16T10:00:00Z',
        isRecurring: true,
        recurrencePattern: RecurrencePattern.DAILY,
        needsReminder: true,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .send(createTaskDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.title).toBe(createTaskDto.title);
      expect(response.body.isRecurring).toBe(true);
      expect(response.body.recurrencePattern).toBe(RecurrencePattern.DAILY);

      // Save the created task ID for later tests
      createdTaskId = response.body.id;
      console.log('Created task ID:', createdTaskId);
    });

    it('should retrieve the created recurring task', async () => {
      // Ensure we have a valid task ID
      expect(createdTaskId).toBeDefined();

      const response = await request(app.getHttpServer())
        .get(`/tasks/${createdTaskId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(createdTaskId);
      expect(response.body.isRecurring).toBe(true);
    });

    it('should complete a recurring task and create the next occurrence', async () => {
      // Ensure we have a valid task ID
      expect(createdTaskId).toBeDefined();
      console.log('Completing task with ID:', createdTaskId);

      // First, complete the task
      const updateResponse = await request(app.getHttpServer())
        .put(`/tasks/${createdTaskId}`)
        .send({ status: TaskStatus.COMPLETED })
        .expect(200);

      expect(updateResponse.body).toBeDefined();
      expect(updateResponse.body.status).toBe(TaskStatus.COMPLETED);

      // Wait a moment for the next occurrence to be created
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Then, get all tasks to find the next occurrence
      const tasksResponse = await request(app.getHttpServer())
        .get('/tasks')
        .expect(200);

      // Find the next occurrence (should have the same title but different ID)
      const nextOccurrence = tasksResponse.body.find(
        (task) =>
          task.title === 'E2E Test Recurring Task' && task.id !== createdTaskId,
      );

      expect(nextOccurrence).toBeDefined();
      expect(nextOccurrence.isRecurring).toBe(true);
      expect(nextOccurrence.status).toBe(TaskStatus.NOT_STARTED);

      // Clean up the next occurrence as well
      if (nextOccurrence) {
        await taskRepository.delete(nextOccurrence.id);
      }
    });
  });

  describe('Recurring Task API Features', () => {
    it('should create a weekly recurring task with specific days', async () => {
      const createTaskDto = {
        title: 'E2E Test Weekly Recurring Task',
        description: 'This task recurs on specific days of the week',
        dueDate: '2025-03-16T10:00:00Z',
        isRecurring: true,
        recurrencePattern: RecurrencePattern.WEEKLY,
        recurrenceDays: 'monday,wednesday,friday',
        needsReminder: true,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .send(createTaskDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.title).toBe(createTaskDto.title);
      expect(response.body.isRecurring).toBe(true);
      expect(response.body.recurrencePattern).toBe(RecurrencePattern.WEEKLY);
      expect(response.body.recurrenceDays).toBe('monday,wednesday,friday');

      // Clean up
      await taskRepository.delete(response.body.id);
    });

    it('should reject invalid recurrence patterns', async () => {
      const invalidTaskDto = {
        title: 'Invalid Recurring Task',
        description: 'This task has an invalid recurrence pattern',
        dueDate: '2025-03-16T10:00:00Z',
        isRecurring: true,
        recurrencePattern: 'invalid-pattern', // Invalid pattern
      };

      await request(app.getHttpServer())
        .post('/tasks')
        .send(invalidTaskDto)
        .expect(400); // Should return 400 Bad Request
    });
  });
});
