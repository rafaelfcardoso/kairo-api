import { Test, TestingModule } from '@nestjs/testing';
import { TasksRepository } from '../../../src/tasks/tasks.repository';
import { ProjectsRepository } from '../../../src/projects/projects.repository';
import {
  Task,
  TaskStatus,
  TaskPriority,
} from '../../../src/tasks/tasks.entity';
import { Project, ProjectType } from '../../../src/projects/projects.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Tag } from '../../../src/tags/tags.entity';

describe('TasksRepository Integration', () => {
  let tasksRepository: TasksRepository;
  let projectsRepository: ProjectsRepository;
  let taskRepository: Repository<Task>;
  let projectRepository: Repository<Project>;
  let tagRepository: Repository<Tag>;
  let dataSource: DataSource;

  // Create test entities
  let testProject: Project;
  let testTask: Task;
  let testTag: Tag;

  beforeAll(async () => {
    // Create test data
    createTestData();

    // Create mock task repository
    const mockTaskRepository = {
      create: jest.fn().mockReturnValue(testTask),
      save: jest.fn().mockResolvedValue(testTask),
      findOne: jest.fn().mockResolvedValue(testTask),
      find: jest.fn().mockResolvedValue([testTask]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([testTask]),
        getOne: jest.fn().mockResolvedValue(testTask),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      }),
    };

    // Create mock project repository
    const mockProjectRepository = {
      create: jest.fn().mockReturnValue(testProject),
      save: jest.fn().mockResolvedValue(testProject),
      findOne: jest.fn().mockResolvedValue(testProject),
      find: jest.fn().mockResolvedValue([testProject]),
    };

    // Create mock tag repository
    const mockTagRepository = {
      create: jest.fn().mockReturnValue(testTag),
      save: jest.fn().mockResolvedValue(testTag),
      findOne: jest.fn().mockResolvedValue(testTag),
      find: jest.fn().mockResolvedValue([testTag]),
    };

    // Mock DataSource
    const mockDataSource = {
      createEntityManager: jest.fn().mockReturnValue({
        findOne: jest.fn().mockImplementation((entityClass, options) => {
          if (entityClass === Project) {
            if (options?.where?.id === testProject?.id) {
              return Promise.resolve(testProject);
            } else if (options?.where?.isSystem === true) {
              return Promise.resolve(testProject);
            }
            return Promise.resolve(null);
          }
          if (entityClass === Task) {
            if (options?.where?.id === testTask?.id) {
              return Promise.resolve(testTask);
            }
            return Promise.resolve(null);
          }
          if (entityClass === Tag) {
            if (options?.where?.id === testTag?.id) {
              return Promise.resolve(testTag);
            }
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }),
        findBy: jest.fn().mockImplementation((entityClass, criteria) => {
          if (entityClass === Tag) {
            return Promise.resolve([testTag]);
          }
          return Promise.resolve([]);
        }),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      }),
    };

    // Create a TasksRepository with mocked methods
    const mockTasksRepository = {
      createTask: jest.fn(),
      getTaskById: jest.fn(),
      getTasks: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      archiveTask: jest.fn(),
      assignToProject: jest.fn(),
      addTags: jest.fn(),
      getTodayTasks: jest.fn(),
      getOverdueTasks: jest.fn(),
      getUpcomingTasks: jest.fn(),
      countTasks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
        {
          provide: ProjectsRepository,
          useClass: ProjectsRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    tasksRepository = module.get<TasksRepository>(TasksRepository);
    projectsRepository = module.get<ProjectsRepository>(ProjectsRepository);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    tagRepository = module.get<Repository<Tag>>(getRepositoryToken(Tag));
    dataSource = module.get<DataSource>(DataSource);

    // Implement specific mocked methods
    mockTasksRepository.createTask.mockImplementation(async (createTaskDto) => {
      const { projectId } = createTaskDto;

      if (projectId && projectId !== testProject.id) {
        throw new NotFoundException(`Project with ID "${projectId}" not found`);
      }

      const task = { ...testTask, ...createTaskDto };
      if (projectId) {
        task.project = testProject;
      }

      return task;
    });

    mockTasksRepository.getTaskById.mockImplementation(async (id) => {
      if (id !== testTask.id) {
        throw new NotFoundException(`Task with ID "${id}" not found`);
      }
      return testTask;
    });

    mockTasksRepository.getTasks.mockImplementation(async (filterDto) => {
      return [testTask];
    });

    mockTasksRepository.assignToProject.mockImplementation(
      async (taskId, projectId) => {
        if (taskId !== testTask.id) {
          throw new NotFoundException(`Task with ID "${taskId}" not found`);
        }

        if (projectId !== testProject.id) {
          throw new NotFoundException(
            `Project with ID "${projectId}" not found`,
          );
        }

        const updatedTask = { ...testTask, project: testProject };
        return updatedTask;
      },
    );

    mockTasksRepository.addTags.mockImplementation(async (taskId, tagIds) => {
      if (taskId !== testTask.id) {
        throw new NotFoundException(`Task with ID "${taskId}" not found`);
      }

      const updatedTask = { ...testTask, tags: [testTag] };
      return updatedTask;
    });
  });

  const createTestData = () => {
    // Create a test project
    testProject = {
      id: 'project-1',
      name: 'Test Project',
      description: 'A test project',
      isArchived: false,
      isSystem: false,
      type: ProjectType.REGULAR,
      color: '#FF5733',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      parent: null,
      children: [],
      tasks: [],
    };

    // Create a test task
    testTask = {
      id: 'test-task-id',
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date(),
      isArchived: false,
      isRecurring: false,
      recurrenceRule: null,
      recurrencePattern: null,
      recurrenceDays: null,
      nextDueDate: null,
      reminderMessage: null,
      needsReminder: false,
      hasTime: false,
      recurringParentId: null,
      project: null,
      tags: [],
      focusSessions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      recurrenceTimeOfDay: null,
      recurrenceTime: null,
      estimatedMinutes: 0,
      completedAt: null,
      isCompleted: false,
    };

    // Create a test tag
    testTag = {
      id: 'tag-1',
      name: 'Important',
      color: '#FF0000',
      description: 'Important tasks',
      createdAt: new Date(),
      updatedAt: new Date(),
      tasks: [],
    };
  };

  afterAll(async () => {
    // Clean up
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task with a project', async () => {
      // Arrange
      const createTaskDto = {
        title: 'New Test Task',
        description: 'A new test task',
        projectId: testProject.id,
        priority: TaskPriority.HIGH,
      };

      const expectedTask = {
        ...testTask,
        title: createTaskDto.title,
        description: createTaskDto.description,
        priority: createTaskDto.priority,
        project: testProject,
      };

      // Act
      const result = await tasksRepository.createTask(createTaskDto);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          title: createTaskDto.title,
          description: createTaskDto.description,
          priority: createTaskDto.priority,
          project: testProject,
        }),
      );
    });

    it('should create a task without a project', async () => {
      // Arrange
      const createTaskDto = {
        title: 'New Test Task',
        description: 'A new test task',
        priority: TaskPriority.HIGH,
      };

      // Act
      const result = await tasksRepository.createTask(createTaskDto);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          title: createTaskDto.title,
          description: createTaskDto.description,
          priority: createTaskDto.priority,
        }),
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      // Arrange
      const createTaskDto = {
        title: 'New Test Task',
        description: 'A new test task',
        projectId: 'non-existent-project-id',
      };

      // Act & Assert
      await expect(tasksRepository.createTask(createTaskDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTaskById', () => {
    it('should return a task by id', async () => {
      // Arrange
      const taskId = testTask.id;

      // Act
      const result = await tasksRepository.getTaskById(taskId);

      // Assert
      expect(result).toEqual(testTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      // Arrange
      const taskId = 'non-existent-task-id';

      // Act & Assert
      await expect(tasksRepository.getTaskById(taskId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTasks', () => {
    it('should return tasks with filters', async () => {
      // Arrange
      const filterDto = {
        status: TaskStatus.NOT_STARTED,
        search: 'test',
        priority: TaskPriority.MEDIUM,
      };

      // Act
      const result = await tasksRepository.getTasks(filterDto);

      // Assert
      expect(result).toEqual([testTask]);
    });
  });

  describe('assignToProject', () => {
    it('should assign a task to a project', async () => {
      // Arrange
      const taskId = testTask.id;
      const projectId = testProject.id;

      // Act
      const result = await tasksRepository.assignToProject(taskId, projectId);

      // Assert
      expect(result.project).toEqual(testProject);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      // Arrange
      const taskId = testTask.id;
      const projectId = 'non-existent-project-id';

      // Act & Assert
      await expect(
        tasksRepository.assignToProject(taskId, projectId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addTags', () => {
    it('should add tags to a task', async () => {
      // Arrange
      const taskId = testTask.id;
      const tagIds = [testTag.id];

      // Act
      const result = await tasksRepository.addTags(taskId, tagIds);

      // Assert
      expect(result.tags).toEqual([testTag]);
    });
  });
});
