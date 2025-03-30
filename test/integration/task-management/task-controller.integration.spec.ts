import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from '../../../src/tasks/tasks.controller';
import { TaskService } from '../../../src/tasks/tasks.service';
import { RecurringTaskService } from '../../../src/tasks/recurring-task.service';
import { TaskDomainService } from '../../../src/tasks/tasks.domain.service';
import { TasksRepository } from '../../../src/tasks/tasks.repository';
import { ProjectsRepository } from '../../../src/projects/projects.repository';
import { TagsRepository } from '../../../src/tags/tags.repository';
import { SecurityLoggerService } from '../../../src/common/services/security-logger.service';
import { SchedulerService } from '../../../src/common/services/scheduler.service';
import { NotificationService } from '../../../src/common/services/notification.service';
import { NotificationDomainService } from '../../../src/tasks/notification.domain.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Task,
  TaskStatus,
  TaskPriority,
} from '../../../src/tasks/tasks.entity';
import { Project, ProjectType } from '../../../src/projects/projects.entity';
import { Tag } from '../../../src/tags/tags.entity';
import { Repository } from 'typeorm';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilterDto,
} from '../../../src/tasks/tasks.dto';
import { HttpService } from '@nestjs/axios';
import { Logger, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import {
  CompleteOverdueTasksDto,
  BatchCompleteTasksDto,
} from '../../../src/tasks/dto/complete-overdue-tasks.dto';
import { Reflector } from '@nestjs/core';
import { TaskFactory } from '../../../src/tasks/factories/task.factory';
import { TaskAggregate } from '../../../src/tasks/aggregates/task.aggregate';
import { DataSource } from 'typeorm';

describe('TaskController Integration Test', () => {
  let controller: TaskController;
  let taskService: TaskService;
  let recurringTaskService: RecurringTaskService;
  let taskDomainService: TaskDomainService;
  let tasksRepository: TasksRepository;
  let projectsRepository: ProjectsRepository;
  let tagsRepository: TagsRepository;
  let securityLoggerService: SecurityLoggerService;
  let taskRepository: Repository<Task>;
  let projectRepository: Repository<Project>;
  let tagRepository: Repository<Tag>;

  // Test data
  let testProject: Project;
  let testTask: Task;
  let testTag: Tag;
  let mockRequest: Request;

  beforeAll(async () => {
    // Mock request object
    mockRequest = {
      user: { id: 'test-user-id' },
      ip: '127.0.0.1',
    } as unknown as Request;
  });

  beforeEach(async () => {
    // Create mock repositories and services
    const mockTaskRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    };

    const mockSecurityLogger = {
      logSecurityEvent: jest.fn(),
      logValidationFailure: jest.fn(),
      logSuspiciousActivity: jest.fn(),
    };

    // Create test data
    createTestData();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        TaskService,
        RecurringTaskService,
        TaskDomainService,
        TasksRepository,
        ProjectsRepository,
        TagsRepository,
        TaskFactory,
        {
          provide: SecurityLoggerService,
          useValue: mockSecurityLogger,
        },
        {
          provide: SchedulerService,
          useValue: { processTask: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { sendTaskNotification: jest.fn() },
        },
        {
          provide: NotificationDomainService,
          useValue: {
            generateNotificationContent: jest.fn(),
            scheduleTaskReminder: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createEntityManager: jest.fn().mockReturnValue({}),
            getRepository: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findByIds: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {},
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    taskService = module.get<TaskService>(TaskService);
    recurringTaskService =
      module.get<RecurringTaskService>(RecurringTaskService);
    taskDomainService = module.get<TaskDomainService>(TaskDomainService);
    tasksRepository = module.get<TasksRepository>(TasksRepository);
    projectsRepository = module.get<ProjectsRepository>(ProjectsRepository);
    tagsRepository = module.get<TagsRepository>(TagsRepository);
    securityLoggerService = module.get<SecurityLoggerService>(
      SecurityLoggerService,
    );
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    tagRepository = module.get<Repository<Tag>>(getRepositoryToken(Tag));

    // Setup mock implementations
    setupMockImplementations();
  });

  const createTestData = () => {
    // Create test project
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

    // Create test task
    testTask = {
      id: 'task-1',
      title: 'Test Task',
      description: 'A test task',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date('2025-05-01'),
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
      project: testProject,
      tags: [],
      focusSessions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      recurrenceTimeOfDay: null,
      recurrenceTime: null,
      estimatedMinutes: 0,
      isCompleted: false,
    };

    // Create test tag
    testTag = {
      id: 'tag-1',
      name: 'Important',
      color: '#FF0000',
      description: 'Important tasks',
      isGoal: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tasks: [],
    };
  };

  const setupMockImplementations = () => {
    // Mock taskService methods
    jest.spyOn(taskService, 'getTasks').mockResolvedValue([testTask]);
    jest.spyOn(taskService, 'getTaskById').mockResolvedValue(testTask);
    jest.spyOn(taskService, 'createTask').mockResolvedValue(testTask);
    jest
      .spyOn(taskService, 'updateTask')
      .mockImplementation(async (id, updateDto, _ip) => {
        // Ensure dueDate is a Date object if present
        const dueDate = updateDto.dueDate
          ? typeof updateDto.dueDate === 'string'
            ? new Date(updateDto.dueDate)
            : updateDto.dueDate
          : testTask.dueDate;

        // Ensure nextDueDate is a Date object if present
        const nextDueDate = updateDto.nextDueDate
          ? typeof updateDto.nextDueDate === 'string'
            ? new Date(updateDto.nextDueDate)
            : updateDto.nextDueDate
          : testTask.nextDueDate;

        // Return updated task with proper types
        return {
          ...testTask,
          ...updateDto,
          dueDate,
          nextDueDate,
          isCompleted:
            updateDto.status === TaskStatus.COMPLETED
              ? true
              : testTask.isCompleted,
        };
      });
    jest.spyOn(taskService, 'deleteTask').mockResolvedValue(undefined);
    jest.spyOn(taskService, 'archiveTask').mockResolvedValue({
      ...testTask,
      isArchived: true,
      isCompleted: testTask.isCompleted,
    });
    jest.spyOn(taskService, 'addTags').mockResolvedValue({
      ...testTask,
      tags: [testTag],
      isCompleted: testTask.isCompleted,
    });
    jest.spyOn(taskService, 'removeTags').mockResolvedValue({
      ...testTask,
      tags: [],
      isCompleted: testTask.isCompleted,
    });
    jest.spyOn(taskService, 'getTodayTasks').mockResolvedValue([testTask]);
    jest.spyOn(taskService, 'getOverdueTasks').mockResolvedValue([testTask]);
    jest.spyOn(taskService, 'getUpcomingTasks').mockResolvedValue([testTask]);
    jest.spyOn(taskService, 'getTaskStats').mockResolvedValue({
      total: 5,
      completed: 2,
      overdue: 1,
      upcoming: 2,
    });
    jest.spyOn(taskService, 'getTasksByPriority').mockResolvedValue({
      [TaskPriority.HIGH]: 1,
      [TaskPriority.MEDIUM]: 2,
      [TaskPriority.LOW]: 1,
      [TaskPriority.NONE]: 0,
    });
    jest.spyOn(taskService, 'duplicateTask').mockResolvedValue({
      ...testTask,
      id: 'duplicated-task-id',
      isCompleted: false,
    });
    jest.spyOn(taskService, 'assignOrphanedTasksToInbox').mockResolvedValue({
      tasksAssigned: 3,
      inboxProjectId: 'inbox-project-id',
      summary: 'Found and fixed 3 tasks',
      tasks: [testTask, testTask, testTask],
    });
    jest.spyOn(taskService, 'completeOverdueTasks').mockResolvedValue({
      success: true,
      tasksCompleted: 3,
      message: 'Completed 3 overdue tasks',
      completedTaskIds: ['task-1', 'task-2', 'task-3'],
    });
    jest.spyOn(taskService, 'batchCompleteTasks').mockResolvedValue({
      success: true,
      tasksCompleted: 5,
      message: 'Completed 5 tasks',
      completedTaskIds: ['task-1', 'task-2', 'task-3', 'task-4', 'task-5'],
    });
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should return an array of tasks', async () => {
      // Arrange
      const filterDto = new TaskFilterDto();

      // Act
      const result = await controller.getTasks(filterDto);

      // Assert
      expect(result).toEqual([testTask]);
      expect(taskService.getTasks).toHaveBeenCalledWith(filterDto);
    });

    it('should apply filters when provided', async () => {
      // Arrange
      const filterDto = new TaskFilterDto();
      filterDto.status = TaskStatus.NOT_STARTED;
      filterDto.priority = TaskPriority.HIGH;

      // Act
      await controller.getTasks(filterDto);

      // Assert
      expect(taskService.getTasks).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('getTaskById', () => {
    it('should return a task by id', async () => {
      // Act
      const result = await controller.getTaskById(testTask.id);

      // Assert
      expect(result).toEqual(testTask);
      expect(taskService.getTaskById).toHaveBeenCalledWith(testTask.id);
    });

    it('should throw NotFoundException when task is not found', async () => {
      // Arrange
      jest
        .spyOn(taskService, 'getTaskById')
        .mockRejectedValueOnce(new NotFoundException());

      // Act & Assert
      await expect(controller.getTaskById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTask', () => {
    it('should create a task', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New task description',
        priority: TaskPriority.MEDIUM,
      };

      // Act
      const result = await controller.createTask(createTaskDto, mockRequest);

      // Assert
      expect(result).toEqual(testTask);
      expect(taskService.createTask).toHaveBeenCalledWith(
        createTaskDto,
        mockRequest.ip,
      );
    });
  });

  describe('updateTask', () => {
    it('should update a task', async () => {
      // Arrange
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        description: 'Updated description',
      };

      // Act
      const result = await controller.updateTask(
        testTask.id,
        updateTaskDto,
        mockRequest,
      );

      // Assert
      expect(result.title).toEqual(updateTaskDto.title);
      expect(result.description).toEqual(updateTaskDto.description);
      expect(taskService.updateTask).toHaveBeenCalledWith(
        testTask.id,
        updateTaskDto,
        mockRequest.ip,
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      // Act
      await controller.deleteTask(testTask.id);

      // Assert
      expect(taskService.deleteTask).toHaveBeenCalledWith(testTask.id);
    });
  });

  describe('archiveTask', () => {
    it('should archive a task', async () => {
      // Act
      const result = await controller.archiveTask(testTask.id);

      // Assert
      expect(result.isArchived).toBe(true);
      expect(taskService.archiveTask).toHaveBeenCalledWith(testTask.id);
    });
  });

  describe('addTags', () => {
    it('should add tags to a task', async () => {
      // Arrange
      const tagIds = [testTag.id];

      // Act
      const result = await controller.addTags(testTask.id, tagIds);

      // Assert
      expect(result.tags).toEqual([testTag]);
      expect(taskService.addTags).toHaveBeenCalledWith(testTask.id, tagIds);
    });
  });

  describe('removeTags', () => {
    it('should remove tags from a task', async () => {
      // Arrange
      const tagIds = [testTag.id];

      // Act
      const result = await controller.removeTags(testTask.id, tagIds);

      // Assert
      expect(result.tags).toEqual([]);
      expect(taskService.removeTags).toHaveBeenCalledWith(testTask.id, tagIds);
    });
  });

  describe('completeOverdueTasks', () => {
    it('should complete overdue tasks', async () => {
      // Arrange
      const options: CompleteOverdueTasksDto = {
        additionalFilters: {},
        includeBlockedTasks: false,
      };

      // Act
      const result = await controller.completeOverdueTasks(options, {
        user: { id: 'test-user-id' },
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.tasksCompleted).toBe(3);
      expect(taskService.completeOverdueTasks).toHaveBeenCalledWith(
        'test-user-id',
        options,
      );
    });
  });

  describe('batchCompleteTasks', () => {
    it('should batch complete tasks', async () => {
      // Arrange
      const options: BatchCompleteTasksDto = {
        statuses: [TaskStatus.NOT_STARTED],
        additionalFilters: {},
      };

      // Act
      const result = await controller.batchCompleteTasks(options, {
        user: { id: 'test-user-id' },
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.tasksCompleted).toBe(5);
      expect(taskService.batchCompleteTasks).toHaveBeenCalledWith(
        'test-user-id',
        options,
      );
    });
  });
});
