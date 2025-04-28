import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Task, TaskStatus, TaskPriority } from '../src/tasks/tasks.entity';
import { Project } from '../src/projects/projects.entity';
import { Tag } from '../src/tags/tags.entity';
import { User } from '../src/entities/user.entity';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

describe('Task Creation Workflow (E2E)', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let projectRepository: Repository<Project>;
  let tagRepository: Repository<Tag>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;

  // Test user credentials and token
  const testUserEmail = `test-user-${Date.now()}@e2e.com`;
  const testUserPassword = 'TestPassword123!';
  let testUserId: string;
  let authToken: string;

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
          name: 'E2E Test User',
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
        await projectRepository.query(
          `TRUNCATE TABLE "project_closure" CASCADE`,
        );
        await projectRepository.query(`TRUNCATE TABLE "project" CASCADE`);
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
      if (createdTagIds.length > 0) {
        await tagRepository.delete(createdTagIds);
      }
      if (createdProjectIds.length > 0) {
        await projectRepository.delete(createdProjectIds);
      }
      // Delete the test user
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
        .set('Authorization', `Bearer ${authToken}`)
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
          .set('Authorization', `Bearer ${authToken}`)
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
      // Ensure we have a project and tag to associate
      expect(createdProjectIds.length).toBeGreaterThan(0);
      expect(createdTagIds.length).toBeGreaterThan(0);

      const currentProjectId = createdProjectIds[0]; // Use local var for clarity
      const currentTagIds = [createdTagIds[0]]; // Task created with only the first tag

      const taskData = {
        title: 'E2E Workflow Test Task',
        description: 'Task for testing the entire creation workflow',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.HIGH,
        projectId: currentProjectId,
        tagIds: currentTagIds,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe(taskData.title);
      expect(response.body.project).toBeDefined();
      expect(response.body.project.id).toBe(currentProjectId);
      expect(response.body.tags).toBeDefined();
      expect(response.body.tags.length).toBe(currentTagIds.length); // Expect 1 tag

      // Verify tags match
      const returnedTagIds = response.body.tags.map((tag) => tag.id);
      for (const tagId of currentTagIds) {
        expect(returnedTagIds).toContain(tagId);
      }

      createdTaskIds.push(response.body.id);
    });

    it('should get the task with project and tags', async () => {
      // Ensure we have a task to retrieve
      expect(createdTaskIds.length).toBeGreaterThan(0);
      const taskId = createdTaskIds[0];
      const expectedTagCount = 1; // Task was created with 1 tag
      const expectedProjectId = createdProjectIds[0]; // Project it was created with

      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.project).toBeDefined();
      expect(response.body.project.id).toBe(expectedProjectId);
      expect(response.body.tags).toBeDefined();
      expect(response.body.tags.length).toBe(expectedTagCount); // Assert correct tag count
    });

    it('should filter tasks by project', async () => {
      // Ensure we have a project to filter by
      expect(createdProjectIds.length).toBeGreaterThan(0);
      const projectId = createdProjectIds[0];

      const response = await request(app.getHttpServer())
        .get(`/tasks?projectId=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);

      // All tasks should be from our project
      response.body.forEach((task) => {
        expect(task.project.id).toBe(projectId);
      });
    });

    it('should filter tasks by tag', async () => {
      // Ensure we have a tag to filter by
      expect(createdTagIds.length).toBeGreaterThan(0);
      const tagId = createdTagIds[0];

      const response = await request(app.getHttpServer())
        .get(`/tasks?tagId=${tagId}`)
        .set('Authorization', `Bearer ${authToken}`)
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
      expect(createdTaskIds.length).toBeGreaterThan(0);
      expect(createdTagIds.length).toBeGreaterThan(0);
      const taskId = createdTaskIds[0];
      const tagToRemove = tagIds[0];
      const remainingTags = tagIds.slice(1);

      const updateData = {
        tagIds: remainingTags,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProject)
        .expect(201);

      const newProjectId = projectResponse.body.id;
      createdProjectIds.push(newProjectId);

      // Move the task to the new project
      expect(createdTaskIds.length).toBeGreaterThan(0);
      const taskId = createdTaskIds[0];

      const updateData = {
        projectId: newProjectId,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
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
