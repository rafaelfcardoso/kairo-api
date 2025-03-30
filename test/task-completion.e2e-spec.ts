import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Task, TaskStatus, TaskPriority } from '../src/tasks/tasks.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('Task Completion and Status Changes (E2E)', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;

  // Track created entities for cleanup
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    // Increase timeout for database connection
    jest.setTimeout(60000);

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

      // Clean up any existing test data (defensive cleanup)
      try {
        await taskRepository.delete({ title: 'E2E Completion Test Task' });
      } catch (error) {
        console.error('Error cleaning up existing test data:', error);
      }
    } catch (error) {
      console.error('Error setting up test module:', error);
      throw error;
    }
  }, 60000); // Increase timeout for beforeAll

  afterAll(async () => {
    // Clean up test data
    try {
      if (createdTaskIds.length > 0) {
        await taskRepository.delete(createdTaskIds);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
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
      const taskId = createdTaskIds[0];

      const updateTaskDto = {
        status: TaskStatus.IN_PROGRESS,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
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
      const taskId = createdTaskIds[1];

      const updateTaskDto = {
        status: TaskStatus.BLOCKED,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
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

    it('should complete a task and set its isCompleted flag', async () => {
      // Get the third task (originally BLOCKED)
      const taskId = createdTaskIds[2];

      const updateTaskDto = {
        status: TaskStatus.COMPLETED,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.status).toBe(TaskStatus.COMPLETED);
      expect(response.body.isCompleted).toBe(true);

      // Verify the task status and isCompleted flag were updated in the database
      const updatedTask = await taskRepository.findOne({
        where: { id: taskId },
      });

      expect(updatedTask).toBeDefined();
      expect(updatedTask.status).toBe(TaskStatus.COMPLETED);
      expect(updatedTask.isCompleted).toBe(true);
    });

    it('should filter tasks by completion status', async () => {
      // Get all completed tasks
      const completedResponse = await request(app.getHttpServer())
        .get('/tasks?status=completed')
        .expect(200);

      expect(completedResponse.body).toBeDefined();
      expect(completedResponse.body.length).toBeGreaterThan(0);

      // All tasks in the response should be completed
      completedResponse.body.forEach((task) => {
        expect(task.status).toBe(TaskStatus.COMPLETED);
        expect(task.isCompleted).toBe(true);
      });

      // Get all in-progress tasks
      const inProgressResponse = await request(app.getHttpServer())
        .get('/tasks?status=in_progress')
        .expect(200);

      expect(inProgressResponse.body).toBeDefined();

      // All tasks in the response should be in progress
      inProgressResponse.body.forEach((task) => {
        expect(task.status).toBe(TaskStatus.IN_PROGRESS);
      });

      // Get task counts by status
      const statsResponse = await request(app.getHttpServer())
        .get('/tasks/stats')
        .expect(200);

      expect(statsResponse.body).toBeDefined();
      expect(statsResponse.body.counts).toBeDefined();

      // Verify that the count of completed tasks is at least 1
      expect(
        statsResponse.body.counts[TaskStatus.COMPLETED],
      ).toBeGreaterThanOrEqual(1);
    });

    it('should reopen a completed task', async () => {
      // Find a completed task
      const completedTask = await taskRepository.findOne({
        where: { status: TaskStatus.COMPLETED },
      });

      expect(completedTask).toBeDefined();

      const taskId = completedTask.id;

      const updateTaskDto = {
        status: TaskStatus.NOT_STARTED,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.status).toBe(TaskStatus.NOT_STARTED);
      expect(response.body.isCompleted).toBe(false);

      // Verify the task status and isCompleted flag were updated in the database
      const updatedTask = await taskRepository.findOne({
        where: { id: taskId },
      });

      expect(updatedTask).toBeDefined();
      expect(updatedTask.status).toBe(TaskStatus.NOT_STARTED);
      expect(updatedTask.isCompleted).toBe(false);
    });

    it('should batch update task statuses', async () => {
      // Get the first two task IDs
      const taskIds = createdTaskIds.slice(0, 2);

      // Batch update both tasks to COMPLETED
      const batchUpdateDto = {
        taskIds: taskIds,
        status: TaskStatus.COMPLETED,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks/batch-update')
        .send(batchUpdateDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(taskIds.length);

      // Verify all tasks were updated in the database
      for (const taskId of taskIds) {
        const task = await taskRepository.findOne({
          where: { id: taskId },
        });

        expect(task).toBeDefined();
        expect(task.status).toBe(TaskStatus.COMPLETED);
        expect(task.isCompleted).toBe(true);
      }
    });
  });
});
