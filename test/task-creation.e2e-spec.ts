import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Task, TaskStatus, TaskPriority } from '../src/tasks/tasks.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '../src/tags/tags.entity';
import { Project, ProjectType } from '../src/projects/projects.entity';

describe('Task Creation Workflow (E2E)', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let tagRepository: Repository<Tag>;
  let projectRepository: Repository<Project>;
  // Track created entities for cleanup
  const createdTaskIds: string[] = [];
  const createdTagIds: string[] = [];
  const createdProjectIds: string[] = [];

  beforeAll(async () => {
    // Increase timeout for database connection
    jest.setTimeout(60000);

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

      tagRepository = moduleFixture.get<Repository<Tag>>(
        getRepositoryToken(Tag),
      );

      projectRepository = moduleFixture.get<Repository<Project>>(
        getRepositoryToken(Project),
      );

      await app.init();

      // Clean up any existing test data (defensive cleanup)
      try {
        await taskRepository.delete({ title: 'E2E Test Task' });
        await tagRepository.delete({ name: 'E2E Test Tag' });
        await projectRepository.delete({ name: 'E2E Test Project' });
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

      const response = await request(app.getHttpServer())
        .get(`/tasks?tagIds=${tagId}`)
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
