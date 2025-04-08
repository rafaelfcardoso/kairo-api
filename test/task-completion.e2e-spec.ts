import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Task, TaskStatus, TaskPriority } from '../src/tasks/tasks.entity';
import { User } from '../src/entities/user.entity';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

describe('Task Completion and Status Changes (E2E)', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;

  // Test user credentials and token
  const testUserEmail = `test-completion-${Date.now()}@e2e.com`;
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
          name: 'E2E Completion User',
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
    // Clean up test data created by this suite
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

  describe('Task Lifecycle and Status Transitions', () => {
    it('should create tasks in different states for testing', async () => {
      // Create a batch of tasks with different statuses
      const tasks = [
        {
          title: 'E2E Completion Test Task - Not Started',
          description: 'Task for testing status changes',
          status: TaskStatus.NOT_STARTED,
          priority: TaskPriority.MEDIUM,
        },
        {
          title: 'E2E Completion Test Task - In Progress',
          description: 'Task for testing status changes',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
        },
        {
          title: 'E2E Completion Test Task - Blocked',
          description: 'Task for testing status changes',
          status: TaskStatus.BLOCKED,
          priority: TaskPriority.MEDIUM,
        },
      ];

      for (const taskData of tasks) {
        const response = await request(app.getHttpServer())
          .post('/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send(taskData)
          .expect(201);

        expect(response.body).toBeDefined();
        expect(response.body.title).toBe(taskData.title);
        expect(response.body.status).toBe(taskData.status);

        createdTaskIds.push(response.body.id);
      }

      // Verify all tasks were created
      expect(createdTaskIds.length).toBe(tasks.length);
    });

    it('should change a task from Not Started to In Progress', async () => {
      // Get the first task (NOT_STARTED)
      expect(createdTaskIds.length).toBeGreaterThanOrEqual(1);
      const taskId = createdTaskIds[0];

      const updateTaskDto = {
        status: TaskStatus.IN_PROGRESS,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.status).toBe(TaskStatus.IN_PROGRESS);

      // Verify the task status was updated in the database
      const updatedTask = await taskRepository.findOne({
        where: { id: taskId },
      });
      expect(updatedTask).toBeDefined();
      expect(updatedTask.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should change a task from In Progress to Blocked', async () => {
      // Get the second task (originally IN_PROGRESS)
      expect(createdTaskIds.length).toBeGreaterThanOrEqual(2);
      const taskId = createdTaskIds[1];

      const updateTaskDto = {
        status: TaskStatus.BLOCKED,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.status).toBe(TaskStatus.BLOCKED);

      // Verify the task status was updated in the database
      const updatedTask = await taskRepository.findOne({
        where: { id: taskId },
      });
      expect(updatedTask).toBeDefined();
      expect(updatedTask.status).toBe(TaskStatus.BLOCKED);
    });

    it('should complete a task and set its completedAt timestamp', async () => {
      // Get the third task (originally BLOCKED)
      expect(createdTaskIds.length).toBeGreaterThanOrEqual(3);
      const taskId = createdTaskIds[2];

      const updateTaskDto = {
        status: TaskStatus.COMPLETED,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.status).toBe(TaskStatus.COMPLETED);
      expect(response.body.completedAt).toBeDefined();
      expect(response.body.completedAt).not.toBeNull();

      // Verify the task status and completedAt were updated in the database
      const updatedTask = await taskRepository.findOne({
        where: { id: taskId },
      });
      expect(updatedTask).toBeDefined();
      expect(updatedTask.status).toBe(TaskStatus.COMPLETED);
      expect(updatedTask.completedAt).toBeDefined();
      expect(updatedTask.completedAt).not.toBeNull();
    });

    it('should filter tasks by completion status', async () => {
      // Get all completed tasks
      const completedResponse = await request(app.getHttpServer())
        .get('/tasks?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(completedResponse.body).toBeDefined();
      expect(completedResponse.body.length).toBeGreaterThan(0);

      // All tasks in the response should be completed
      completedResponse.body.forEach((task) => {
        expect(task.status).toBe(TaskStatus.COMPLETED);
        expect(task.completedAt).toBeDefined();
      });

      // Get all in-progress tasks
      const inProgressResponse = await request(app.getHttpServer())
        .get('/tasks?status=in_progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(inProgressResponse.body).toBeDefined();

      // All tasks in the response should be in progress
      inProgressResponse.body.forEach((task) => {
        expect(task.status).toBe(TaskStatus.IN_PROGRESS);
      });

      // Get task counts by status
      const statsResponse = await request(app.getHttpServer())
        .get('/tasks/stats/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      console.log(
        'Stats Response Body:',
        JSON.stringify(statsResponse.body, null, 2),
      );

      expect(statsResponse.body).toBeDefined();
      // expect(statsResponse.body.counts).toBeDefined(); // The structure is flat

      // Verify that the count of completed tasks is at least 1
      expect(statsResponse.body[TaskStatus.COMPLETED]).toBeGreaterThanOrEqual(
        1,
      );
    });

    it('should reopen a completed task', async () => {
      // Find a completed task (use the one we completed earlier)
      const taskId = createdTaskIds[2]; // Assuming the third task is the one we completed

      const updateTaskDto = {
        status: TaskStatus.NOT_STARTED,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.status).toBe(TaskStatus.NOT_STARTED);
      expect(response.body.completedAt).toBeNull();

      // Verify the task status and completedAt were updated in the database
      const updatedTask = await taskRepository.findOne({
        where: { id: taskId },
      });
      expect(updatedTask).toBeDefined();
      expect(updatedTask.status).toBe(TaskStatus.NOT_STARTED);
      expect(updatedTask.completedAt).toBeNull();
    });

    it('should batch update task statuses', async () => {
      // Get the first two task IDs (T1: In Progress, T2: Blocked at this point)
      expect(createdTaskIds.length).toBeGreaterThanOrEqual(2);
      const taskIdsToComplete = createdTaskIds.slice(0, 2); // [T1.id, T2.id]

      // Batch update tasks with NOT_STARTED or IN_PROGRESS status
      const batchPayload = {
        statuses: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS],
        additionalFilters: {
          taskIds: taskIdsToComplete,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/tasks/batch-complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(batchPayload)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      // Only T1 matches the criteria (ID is in list AND status is IN_PROGRESS)
      expect(response.body.tasksCompleted).toBe(1); // Expect 1 task completed

      // Verify the correct task (T1) was updated
      const task1 = await taskRepository.findOne({
        where: { id: taskIdsToComplete[0] },
      });
      expect(task1).toBeDefined();
      expect(task1.status).toBe(TaskStatus.COMPLETED);
      expect(task1.completedAt).toBeDefined();

      // Verify the other task (T2) was NOT updated
      const task2 = await taskRepository.findOne({
        where: { id: taskIdsToComplete[1] },
      });
      expect(task2).toBeDefined();
      expect(task2.status).toBe(TaskStatus.BLOCKED); // Should still be Blocked
      expect(task2.completedAt).toBeNull();
    });
  });
});
