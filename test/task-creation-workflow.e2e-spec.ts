import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Task, TaskStatus, TaskPriority } from '../src/tasks/tasks.entity';
import { Project } from '../src/projects/projects.entity';
import { Tag } from '../src/tags/tags.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('Task Creation Workflow (E2E)', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let projectRepository: Repository<Project>;
  let tagRepository: Repository<Tag>;

  // Track created entities for cleanup
  const createdTaskIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdTagIds: string[] = [];

  beforeAll(async () => {
    // Increase timeout for database connection
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

      projectRepository = moduleFixture.get<Repository<Project>>(
        getRepositoryToken(Project),
      );

      tagRepository = moduleFixture.get<Repository<Tag>>(
        getRepositoryToken(Tag),
      );

      await app.init();

      // Clean up any existing test data (defensive cleanup)
      try {
        await taskRepository.delete({ title: 'E2E Workflow Test Task' });
        await projectRepository.delete({ name: 'E2E Test Project' });
        await tagRepository.delete({ name: 'e2e-test' });
      } catch (error) {
        console.error('Error cleaning up existing test data:', error);
      }
    } catch (error) {
      console.error('Error setting up test module:', error);
      throw error;
    }
  }, 120000); // Increase timeout for beforeAll

  afterAll(async () => {
    // Clean up test data
    try {
      if (createdTaskIds.length > 0) {
        await taskRepository.delete(createdTaskIds);
      }

      if (createdTagIds.length > 0) {
        await tagRepository.delete(createdTagIds);
      }

      if (createdProjectIds.length > 0) {
        await projectRepository.delete(createdProjectIds);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }

    await app.close();
  });

  describe('Task Creation with Project and Tags', () => {
    let projectId: string;
    const tagIds: string[] = [];

    it('should create a new project', async () => {
      const project = {
        name: 'E2E Test Project',
        description: 'Project for end-to-end testing',
      };

      const response = await request(app.getHttpServer())
        .post('/projects')
        .send(project)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(project.name);

      projectId = response.body.id;
      createdProjectIds.push(projectId);
    });

    it('should create multiple tags', async () => {
      const tags = [
        { name: 'e2e-test', color: '#FF5733' },
        { name: 'workflow', color: '#33FF57' },
        { name: 'important', color: '#3357FF' },
      ];

      for (const tagData of tags) {
        const response = await request(app.getHttpServer())
          .post('/tags')
          .send(tagData)
          .expect(201);

        expect(response.body).toBeDefined();
        expect(response.body.id).toBeDefined();
        expect(response.body.name).toBe(tagData.name);
        expect(response.body.color).toBe(tagData.color);

        tagIds.push(response.body.id);
        createdTagIds.push(response.body.id);
      }

      // Verify tags were created
      expect(tagIds.length).toBe(3);
    });

    it('should create a task with project and tags', async () => {
      const taskData = {
        title: 'E2E Workflow Test Task',
        description: 'Task for testing the entire creation workflow',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.HIGH,
        projectId: projectId,
        tagIds: tagIds,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe(taskData.title);
      expect(response.body.project).toBeDefined();
      expect(response.body.project.id).toBe(projectId);
      expect(response.body.tags).toBeDefined();
      expect(response.body.tags.length).toBe(tagIds.length);

      // Verify tags match
      const returnedTagIds = response.body.tags.map((tag) => tag.id);
      for (const tagId of tagIds) {
        expect(returnedTagIds).toContain(tagId);
      }

      createdTaskIds.push(response.body.id);
    });

    it('should get the task with project and tags', async () => {
      const taskId = createdTaskIds[0];

      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.project).toBeDefined();
      expect(response.body.project.id).toBe(projectId);
      expect(response.body.tags).toBeDefined();
      expect(response.body.tags.length).toBe(tagIds.length);
    });

    it('should filter tasks by project', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tasks?projectId=${projectId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);

      // All tasks should be from our project
      response.body.forEach((task) => {
        expect(task.project.id).toBe(projectId);
      });
    });

    it('should filter tasks by tag', async () => {
      const tagId = tagIds[0];

      const response = await request(app.getHttpServer())
        .get(`/tasks?tagId=${tagId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);

      // All tasks should have our tag
      response.body.forEach((task) => {
        const taskTagIds = task.tags.map((tag) => tag.id);
        expect(taskTagIds).toContain(tagId);
      });
    });

    it('should remove a tag from a task', async () => {
      const taskId = createdTaskIds[0];
      const tagToRemove = tagIds[0];
      const remainingTags = tagIds.slice(1);

      const updateData = {
        tagIds: remainingTags,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.tags).toBeDefined();
      expect(response.body.tags.length).toBe(remainingTags.length);

      // Verify the tag was removed
      const updatedTagIds = response.body.tags.map((tag) => tag.id);
      expect(updatedTagIds).not.toContain(tagToRemove);

      // Verify remaining tags are present
      for (const tagId of remainingTags) {
        expect(updatedTagIds).toContain(tagId);
      }
    });

    it('should move task to a different project', async () => {
      // Create a new project
      const newProject = {
        name: 'E2E Test Project 2',
        description: 'Second project for end-to-end testing',
      };

      const projectResponse = await request(app.getHttpServer())
        .post('/projects')
        .send(newProject)
        .expect(201);

      const newProjectId = projectResponse.body.id;
      createdProjectIds.push(newProjectId);

      // Move the task to the new project
      const taskId = createdTaskIds[0];

      const updateData = {
        projectId: newProjectId,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.project).toBeDefined();
      expect(response.body.project.id).toBe(newProjectId);

      // Verify in database
      const updatedTask = await taskRepository.findOne({
        where: { id: taskId },
        relations: ['project'],
      });

      expect(updatedTask).toBeDefined();
      expect(updatedTask.project).toBeDefined();
      expect(updatedTask.project.id).toBe(newProjectId);
    });

    it('should create a task with validation errors', async () => {
      // Missing required title
      const invalidTask = {
        description: 'Task with missing title',
        priority: 'invalid_priority',
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .send(invalidTask)
        .expect(400);

      expect(response.body).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(Array.isArray(response.body.message)).toBe(true);

      // Should contain validation errors for missing title
      const titleError = response.body.message.find((msg) =>
        msg.includes('title'),
      );
      expect(titleError).toBeDefined();
    });
  });
});
