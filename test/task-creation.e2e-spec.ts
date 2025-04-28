import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Task, TaskStatus, TaskPriority } from '../src/tasks/tasks.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '../src/tags/tags.entity';
import { Project, ProjectType } from '../src/projects/projects.entity';
import { User } from '../src/entities/user.entity';

describe('Task Creation Workflow (E2E)', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let tagRepository: Repository<Tag>;
  let projectRepository: Repository<Project>;
  let userRepository: Repository<User>;
  let authToken: string;
  let testUserId: string;

  // Track created entities for cleanup
  const createdTaskIds: string[] = [];
  const createdTagIds: string[] = [];
  const createdProjectIds: string[] = [];

  // Test user credentials
  const testUserEmail = `test-creation-${Date.now()}@e2e.com`;
  const testUserPassword = 'TestPassword123!';

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
      tagRepository = moduleFixture.get<Repository<Tag>>(
        getRepositoryToken(Tag),
      );
      projectRepository = moduleFixture.get<Repository<Project>>(
        getRepositoryToken(Project),
      );
      userRepository = moduleFixture.get<Repository<User>>(
        getRepositoryToken(User),
      );

      await app.init();

      // Use standard auth setup
      // Register test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          name: 'E2E Creation User',
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

      // REMOVED TRUNCATE LOGIC
      // console.log('Truncating initial schema tables before test suite...');
      // try {
      //   await taskRepository.query(`TRUNCATE TABLE "tag" CASCADE`);
      //   await taskRepository.query(`TRUNCATE TABLE "task" CASCADE`);
      //   await projectRepository.query(
      //     `TRUNCATE TABLE "project_closure" CASCADE`,
      //   );
      //   await projectRepository.query(`TRUNCATE TABLE "project" CASCADE`);
      //   console.log('Tables truncated.');
      // } catch (error) {
      //   console.error('Error truncating tables:', error);
      // }
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
      if (createdTagIds.length > 0) {
        await tagRepository.delete(createdTagIds);
      }
      if (createdProjectIds.length > 0) {
        await projectRepository.delete(createdProjectIds);
      }
      if (testUserId) {
        await userRepository.delete(testUserId);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
    await app.close();
  });

  describe('Task Creation End-to-End Workflow', () => {
    it('should create a project for task organization', async () => {
      const createProjectDto = {
        name: 'E2E Test Project',
        description: 'Project created for E2E testing',
        type: ProjectType.REGULAR,
        color: '#FF5733',
      };

      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProjectDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe(createProjectDto.name);
      expect(response.body.id).toBeDefined();

      // Store the project ID for later use
      createdProjectIds.push(response.body.id);

      // Verify the project was created in the database
      const savedProject = await projectRepository.findOne({
        where: { id: response.body.id },
      });

      expect(savedProject).toBeDefined();
      if (!savedProject) throw new Error('Project not found');
      expect(savedProject.name).toBe(createProjectDto.name);
    });

    it('should create a tag for task categorization', async () => {
      const createTagDto = {
        name: 'E2E Test Tag',
        color: '#3498DB',
        description: 'Tag created for E2E testing',
      };

      const response = await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTagDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.name).toBe(createTagDto.name);
      expect(response.body.id).toBeDefined();

      // Store the tag ID for later use
      createdTagIds.push(response.body.id);

      // Verify the tag was created in the database
      const savedTag = await tagRepository.findOne({
        where: { id: response.body.id },
      });

      expect(savedTag).toBeDefined();
      if (!savedTag) throw new Error('Tag not found');
      expect(savedTag.name).toBe(createTagDto.name);
    });

    it('should create a task with project and tag', async () => {
      // Ensure we have a project and tag to associate
      expect(createdProjectIds.length).toBeGreaterThan(0);
      expect(createdTagIds.length).toBeGreaterThan(0);

      const projectId = createdProjectIds[0];
      const tagIds = [createdTagIds[0]];

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const createTaskDto = {
        title: 'E2E Test Task',
        description: 'Task created for E2E testing',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.MEDIUM,
        dueDate: tomorrow.toISOString(),
        projectId: projectId,
        tagIds: tagIds,
        estimatedMinutes: 60,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTaskDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.title).toBe(createTaskDto.title);
      expect(response.body.id).toBeDefined();

      // Store the task ID for later use
      createdTaskIds.push(response.body.id);

      // Verify the task was created in the database with correct relationships
      const savedTask = await taskRepository.findOne({
        where: { id: response.body.id },
        relations: ['project', 'tags'],
      });

      expect(savedTask).toBeDefined();
      if (!savedTask) throw new Error('Task not found');
      expect(savedTask.title).toBe(createTaskDto.title);
      expect(savedTask.project).toBeDefined();
      expect(savedTask.project.id).toBe(projectId);
      expect(savedTask.tags).toBeDefined();
      expect(savedTask.tags.length).toBe(1);
      expect(savedTask.tags[0].id).toBe(tagIds[0]);
    });

    it('should retrieve the created task with project and tags', async () => {
      // Ensure we have a task to retrieve
      expect(createdTaskIds.length).toBeGreaterThan(0);
      const taskId = createdTaskIds[0];

      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.title).toBe('E2E Test Task');
      expect(response.body.project).toBeDefined();
      expect(response.body.project.id).toBe(createdProjectIds[0]);
      expect(response.body.tags).toBeDefined();
      expect(response.body.tags.length).toBe(1);
      expect(response.body.tags[0].id).toBe(createdTagIds[0]);
    });

    it('should update the task with new details', async () => {
      // Ensure we have a task to update
      expect(createdTaskIds.length).toBeGreaterThan(0);
      const taskId = createdTaskIds[0];

      const updateTaskDto = {
        title: 'Updated E2E Test Task',
        description: 'Updated description for E2E testing',
        priority: TaskPriority.HIGH,
      };

      const response = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateTaskDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(taskId);
      expect(response.body.title).toBe(updateTaskDto.title);
      expect(response.body.description).toBe(updateTaskDto.description);
      expect(response.body.priority).toBe(updateTaskDto.priority);

      // Verify the task was updated in the database
      const updatedTask = await taskRepository.findOne({
        where: { id: taskId },
      });

      expect(updatedTask).toBeDefined();
      if (!updatedTask) throw new Error('Task not found');
      expect(updatedTask.title).toBe(updateTaskDto.title);
      expect(updatedTask.description).toBe(updateTaskDto.description);
      expect(updatedTask.priority).toBe(updateTaskDto.priority);
    });

    it('should search for tasks and filter by project', async () => {
      // Ensure we have a project to filter by
      expect(createdProjectIds.length).toBeGreaterThan(0);
      const projectId = createdProjectIds[0];

      const response = await request(app.getHttpServer())
        .get(`/tasks?projectId=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);

      // All tasks in the response should belong to the project
      response.body.forEach((task) => {
        expect(task.project.id).toBe(projectId);
      });
    });

    it('should search for tasks and filter by tag', async () => {
      // Ensure we have a tag to filter by
      expect(createdTagIds.length).toBeGreaterThan(0);
      const tagId = createdTagIds[0];

      // Send tagId as a query parameter (check API for array format if needed)
      const response = await request(app.getHttpServer())
        .get(`/tasks`)
        .query({ tagIds: [tagId] }) // Send as object for supertest to format
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.length).toBeGreaterThan(0);

      // All tasks in the response should have the tag
      response.body.forEach((task) => {
        const hasTag = task.tags.some((tag) => tag.id === tagId);
        expect(hasTag).toBe(true);
      });
    });
  });
});
