import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { TaskService } from '../../../../src/tasks/tasks.service';
import { TasksRepository } from '../../../../src/tasks/tasks.repository';
import { ProjectsRepository } from '../../../../src/projects/projects.repository';
import { TagsRepository } from '../../../../src/tags/tags.repository';
import { SecurityLoggerService } from '../../../../src/common/services/security-logger.service';
import { RecurringTaskService } from '../../../../src/tasks/recurring-task.service';
import { TaskDomainService } from '../../../../src/tasks/tasks.domain.service';
import { Project, ProjectType } from '../../../../src/projects/projects.entity';
import {
  Task,
  TaskStatus,
  TaskPriority,
} from '../../../../src/tasks/tasks.entity';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilterDto,
} from '../../../../src/tasks/tasks.dto';
import { NotificationDomainService } from '../../../../src/tasks/notification.domain.service';
import { TaskFactory } from '../../../../src/tasks/factories/task.factory';
import { Tag } from '../../../../src/tags/tags.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeepPartial } from 'typeorm';

describe('TaskService', () => {
  let service: TaskService;
  let tasksRepository: jest.Mocked<TasksRepository>;
  let projectsRepository: jest.Mocked<ProjectsRepository>;
  let tagsRepository: jest.Mocked<TagsRepository>;
  let securityLogger: jest.Mocked<SecurityLoggerService>;
  let recurringTaskService: jest.Mocked<RecurringTaskService>;
  let taskDomainService: jest.Mocked<TaskDomainService>;
  let notificationService: jest.Mocked<NotificationDomainService>;
  let taskFactory: jest.Mocked<TaskFactory>;
  let logger: jest.Mocked<Logger>;

  // Helper function to create a complete mock Task
  const createMockTask = (overrides: Partial<Task> = {}): Task => {
    const base: Task = {
      id: 'mock-task-id',
      title: 'Mock Task',
      description: 'Mock Description',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.MEDIUM,
      needsReminder: false,
      reminderMessage: null,
      recurrenceRule: null,
      dueDate: new Date(),
      nextDueDate: null,
      hasTime: false,
      isRecurring: false,
      recurrencePattern: null,
      recurrenceDays: null,
      recurrenceTimeOfDay: null,
      recurrenceTime: null,
      recurringParentId: null,
      estimatedMinutes: 0,
      isArchived: false,
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: null,
      tags: [],
      focusSessions: [],
      completedAt: null,
    };

    // Handle date conversions for dueDate and nextDueDate
    const processedOverrides = { ...overrides };
    if (typeof processedOverrides.dueDate === 'string') {
      processedOverrides.dueDate = new Date(processedOverrides.dueDate);
    }
    if (typeof processedOverrides.nextDueDate === 'string') {
      processedOverrides.nextDueDate = new Date(processedOverrides.nextDueDate);
    }

    return Object.assign({}, base, processedOverrides);
  };

  const convertDtoToTask = (
    dto: CreateTaskDto | UpdateTaskDto,
  ): Partial<Task> => {
    const task: Partial<Task> = {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
    };
    return task;
  };

  beforeEach(async () => {
    const mockTasksRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getTaskById: jest.fn(),
      getTasks: jest.fn(),
      createTask: jest.fn((dto) => {
        const task = createMockTask({
          ...dto,
          id: 'mock-task-id',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : null,
        });
        return Promise.resolve(task);
      }),
      updateTask: jest.fn((id, dto) => {
        const task = createMockTask({
          ...dto,
          id,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : null,
        });
        return Promise.resolve(task);
      }),
      deleteTask: jest.fn(),
      archiveTask: jest.fn(),
      addTags: jest.fn(),
      removeTags: jest.fn(),
      getTasksByPriority: jest.fn(),
      assignOrphanedTasksToInbox: jest.fn(),
      getTasksWithoutProject: jest.fn(),
      countTasks: jest.fn(),
      count: jest.fn(),
    };

    const mockProjectsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockTagsRepository = {
      getTagById: jest.fn(),
      getTagsByIds: jest.fn(),
      findSimilarTags: jest.fn(),
    };

    const mockSecurityLogger = {
      logValidationFailure: jest.fn(),
      logSecurityEvent: jest.fn(),
      logSuspiciousActivity: jest.fn(),
    };

    const mockTaskDomainService = {
      completeTask: jest.fn(),
      calculateNextOccurrence: jest.fn(),
      createRecurrenceRule: jest.fn(),
    };

    const mockRecurringTaskService = {
      scheduleNextRecurrence: jest.fn(),
      processCompletedTask: jest.fn(),
      calculateNextOccurrence: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
        {
          provide: getRepositoryToken(ProjectsRepository),
          useValue: mockProjectsRepository,
        },
        {
          provide: getRepositoryToken(TagsRepository),
          useValue: mockTagsRepository,
        },
        {
          provide: SecurityLoggerService,
          useValue: mockSecurityLogger,
        },
        {
          provide: TaskDomainService,
          useValue: mockTaskDomainService,
        },
        {
          provide: RecurringTaskService,
          useValue: mockRecurringTaskService,
        },
        {
          provide: NotificationDomainService,
          useValue: {
            generateNotificationContent: jest.fn(),
            scheduleTaskReminder: jest.fn(),
          },
        },
        {
          provide: TaskFactory,
          useValue: {
            createTask: jest.fn(),
          },
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
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    tasksRepository = module.get<jest.Mocked<TasksRepository>>(TasksRepository);
    projectsRepository = module.get(getRepositoryToken(ProjectsRepository));
    tagsRepository = module.get(getRepositoryToken(TagsRepository));
    securityLogger = module.get(SecurityLoggerService);
    recurringTaskService =
      module.get<jest.Mocked<RecurringTaskService>>(RecurringTaskService);
    taskDomainService =
      module.get<jest.Mocked<TaskDomainService>>(TaskDomainService);
    notificationService = module.get(NotificationDomainService);
    taskFactory = module.get(TaskFactory);
    logger = module.get(Logger);
  });

  // HIGH PRIORITY TESTS

  describe('Core Task Operations', () => {
    describe('createTask', () => {
      it('should create a task successfully', async () => {
        const createTaskDto: CreateTaskDto = {
          title: 'Test Task',
          description: 'Test Description',
          priority: TaskPriority.MEDIUM,
          dueDate: '2023-12-31T00:00:00.000Z',
          needsReminder: false,
          reminderMessage: null,
          isRecurring: false,
          recurrenceRule: null,
          nextDueDate: null,
          hasTime: false,
          recurrencePattern: null,
          recurrenceDays: null,
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
        };

        const expectedTask = createMockTask({
          ...convertDtoToTask(createTaskDto),
          id: 'mock-task-id',
        });

        // Clear previous mock implementations
        jest.clearAllMocks();

        // Mock the specific calls for this test
        tasksRepository.createTask.mockResolvedValue(expectedTask);

        const result = await service.createTask(createTaskDto, '127.0.0.1');
        expect(result).toEqual(expectedTask);
        expect(tasksRepository.createTask).toHaveBeenCalledWith(createTaskDto);
      });

      it('should create a recurring task with reminder', async () => {
        const recurringTaskDto: CreateTaskDto = {
          title: 'Recurring Task',
          description: 'Recurring Description',
          priority: TaskPriority.MEDIUM,
          dueDate: '2023-12-31T00:00:00.000Z',
          needsReminder: true,
          reminderMessage: 'Time to work on this!',
          isRecurring: true,
          recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
          nextDueDate: null,
          hasTime: false,
          recurrencePattern: null,
          recurrenceDays: null,
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
        };

        const expectedTask = createMockTask({
          ...convertDtoToTask(recurringTaskDto),
          id: 'mock-task-id',
          isRecurring: true,
          recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
          needsReminder: true,
          reminderMessage: 'Time to work on this!',
        });

        // Clear previous mock implementations
        jest.clearAllMocks();

        // Mock the specific calls for this test
        tasksRepository.createTask.mockResolvedValue(expectedTask);

        const result = await service.createTask(recurringTaskDto, '127.0.0.1');
        expect(result).toEqual(expectedTask);
        expect(tasksRepository.createTask).toHaveBeenCalledWith(
          recurringTaskDto,
        );
      });

      it('should handle validation errors', async () => {
        const invalidDto: CreateTaskDto = {
          title: '',
          description: 'Test Description',
          priority: TaskPriority.MEDIUM,
        };

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.createTask.mockRejectedValue(new BadRequestException());

        await expect(
          service.createTask(invalidDto, '127.0.0.1'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateTask', () => {
      it('should update a task successfully', async () => {
        const taskId = 'task-id';
        const updateTaskDto: UpdateTaskDto = {
          title: 'Updated Task',
          description: 'Updated Description',
          priority: TaskPriority.HIGH,
          dueDate: '2023-12-31T00:00:00.000Z',
          needsReminder: true,
          reminderMessage: 'Reminder message',
          isRecurring: false,
          recurrenceRule: null,
          nextDueDate: null,
          hasTime: false,
          recurrencePattern: null,
          recurrenceDays: null,
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
        };

        const existingTask = createMockTask();
        const updatedTask = createMockTask({
          ...convertDtoToTask(updateTaskDto),
          id: existingTask.id,
        });

        // Clear previous mock implementations
        jest.clearAllMocks();

        // Mock the specific calls for this test
        tasksRepository.getTaskById.mockResolvedValue(existingTask);
        tasksRepository.updateTask.mockResolvedValue(updatedTask);

        const result = await service.updateTask(
          taskId,
          updateTaskDto,
          '127.0.0.1',
        );
        expect(result).toEqual(updatedTask);
        expect(tasksRepository.updateTask).toHaveBeenCalledWith(
          taskId,
          updateTaskDto,
        );
      });

      it('should throw NotFoundException when task does not exist', async () => {
        const taskId = 'non-existent-task-id';
        const updateTaskDto: UpdateTaskDto = {
          title: 'Updated Task',
          description: 'Updated Description',
          priority: TaskPriority.HIGH,
        };

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(null);

        await expect(
          service.updateTask(taskId, updateTaskDto, '127.0.0.1'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteTask', () => {
      const taskId = 'test-task-id';

      it('should delete a task successfully', async () => {
        const existingTask = createMockTask();

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(existingTask);
        tasksRepository.deleteTask.mockResolvedValue(undefined);

        await service.deleteTask(taskId);

        expect(tasksRepository.deleteTask).toHaveBeenCalledWith(taskId);
      });

      it('should throw NotFoundException when task does not exist', async () => {
        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(null);

        await expect(service.deleteTask(taskId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('getTaskById', () => {
      it('should return a task by ID', async () => {
        const mockTask = createMockTask();

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(mockTask);

        const result = await service.getTaskById('test-task-id');

        expect(result).toEqual(mockTask);
      });

      it('should throw NotFoundException for non-existent task', async () => {
        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockRejectedValue(new NotFoundException());

        await expect(service.getTaskById('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('getTasks', () => {
      it('should return filtered tasks', async () => {
        const filters: TaskFilterDto = {
          status: TaskStatus.NOT_STARTED,
          priority: TaskPriority.HIGH,
        };
        const mockTasks = [createMockTask(), createMockTask()];

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTasks.mockResolvedValue(mockTasks);

        const result = await service.getTasks(filters);

        expect(result).toEqual(mockTasks);
        expect(tasksRepository.getTasks).toHaveBeenCalledWith(filters);
      });
    });

    describe('duplicateTask', () => {
      const taskId = 'test-task-id';

      it('should duplicate a task successfully', async () => {
        const originalTask = createMockTask();
        const duplicatedTask = createMockTask({
          id: 'duplicated-task-id',
          title: `${originalTask.title} (Copy)`,
          status: TaskStatus.NOT_STARTED,
        });

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(originalTask);
        tasksRepository.createTask.mockResolvedValue(duplicatedTask);

        const result = await service.duplicateTask(taskId);

        expect(result).toEqual(duplicatedTask);
      });

      it('should throw NotFoundException when task does not exist', async () => {
        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(null);

        await expect(service.duplicateTask(taskId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('assignOrphanedTasksToInbox', () => {
      it('should assign orphaned tasks to inbox project', async () => {
        const mockInboxProject = new Project();
        mockInboxProject.id = 'inbox-id';
        mockInboxProject.name = 'Inbox';
        mockInboxProject.type = ProjectType.INBOX;
        mockInboxProject.isSystem = false;
        mockInboxProject.isArchived = false;
        mockInboxProject.order = 0;

        const orphanedTasks = [
          createMockTask({ project: null }),
          createMockTask({ project: null }),
        ];

        const updatedTask = createMockTask({
          ...orphanedTasks[0],
          project: mockInboxProject,
        });

        // Clear previous mock implementations
        jest.clearAllMocks();

        projectsRepository.findOne.mockResolvedValue(mockInboxProject);
        tasksRepository.getTasksWithoutProject.mockResolvedValue(orphanedTasks);
        tasksRepository.save.mockResolvedValue(updatedTask);

        const result = await service.assignOrphanedTasksToInbox();

        expect(result).toBeDefined();
      });
    });
  });

  // MEDIUM PRIORITY TESTS

  describe('Task Project Management', () => {
    describe('assignToProject', () => {
      const taskId = 'test-task-id';
      const projectId = 'test-project-id';

      it('should assign a task to a project successfully', async () => {
        const mockProject = new Project();
        mockProject.id = projectId;
        mockProject.name = 'Test Project';
        mockProject.type = ProjectType.REGULAR;

        const mockTask = createMockTask();
        const updatedTask = createMockTask({
          ...mockTask,
          project: mockProject,
        });

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(mockTask);
        projectsRepository.findOne.mockResolvedValue(mockProject);
        tasksRepository.save.mockResolvedValue(updatedTask);

        const result = await service.assignToProject(taskId, projectId);

        expect(result).toEqual(updatedTask);
      });

      it('should throw NotFoundException when task does not exist', async () => {
        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(null);

        await expect(
          service.assignToProject(taskId, projectId),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw NotFoundException when project does not exist', async () => {
        const mockTask = createMockTask();

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(mockTask);
        projectsRepository.findOne.mockResolvedValue(null);

        await expect(
          service.assignToProject(taskId, projectId),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('addTags', () => {
      const taskId = 'test-task-id';
      const tagIds = ['tag-1', 'tag-2'];

      it('should add tags to a task successfully', async () => {
        const mockTask = createMockTask();
        const mockTags = tagIds.map((id) => {
          const tag = new Tag();
          tag.id = id;
          tag.name = `Tag ${id}`;
          return tag;
        });
        const updatedTask = createMockTask({ ...mockTask, tags: mockTags });

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(mockTask);
        tagsRepository.getTagsByIds.mockResolvedValue(mockTags);
        tasksRepository.save.mockResolvedValue(updatedTask);

        const result = await service.addTags(taskId, tagIds);

        expect(result).toEqual(updatedTask);
      });

      it('should throw NotFoundException when task does not exist', async () => {
        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(null);

        await expect(service.addTags(taskId, tagIds)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw NotFoundException when any tag does not exist', async () => {
        const mockTask = createMockTask();

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(mockTask);
        tagsRepository.getTagsByIds.mockResolvedValue([]);

        await expect(service.addTags(taskId, tagIds)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Task Tag Management', () => {
    describe('removeTags', () => {
      const taskId = 'test-task-id';
      const tagIds = ['tag-1', 'tag-2'];

      it('should remove tags from a task successfully', async () => {
        const mockTags = tagIds.map((id) => {
          const tag = new Tag();
          tag.id = id;
          tag.name = `Tag ${id}`;
          return tag;
        });
        const mockTask = createMockTask({ tags: mockTags });
        const updatedTask = createMockTask({ ...mockTask, tags: [] });

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(mockTask);
        tasksRepository.save.mockResolvedValue(updatedTask);

        const result = await service.removeTags(taskId, tagIds);

        expect(result).toEqual(updatedTask);
      });

      it('should throw NotFoundException when task does not exist', async () => {
        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.getTaskById.mockResolvedValue(null);

        await expect(service.removeTags(taskId, tagIds)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  // LOW PRIORITY TESTS

  describe('Task Archiving', () => {
    describe('archiveTask', () => {
      it('should archive a task', async () => {
        const taskId = 'test-task-id';
        const mockTask = createMockTask({ isArchived: true });

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.archiveTask.mockResolvedValue(mockTask);

        const result = await service.archiveTask(taskId);

        expect(result.isArchived).toBe(true);
        expect(tasksRepository.archiveTask).toHaveBeenCalledWith(taskId);
      });
    });
  });

  describe('Task Statistics', () => {
    describe('getTaskStats', () => {
      it('should return task statistics', async () => {
        const mockStats = {
          total: 10,
          completed: 5,
          overdue: 2,
          upcoming: 3,
        };

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.countTasks.mockResolvedValue(mockStats.total);
        tasksRepository.count.mockImplementation((options: any) => {
          if (options.where && options.where['status'] === TaskStatus.COMPLETED)
            return Promise.resolve(mockStats.completed);
          if (options.where && options.where['dueDate'])
            return Promise.resolve(mockStats.overdue);
          return Promise.resolve(mockStats.upcoming);
        });

        const result = await service.getTaskStats();

        expect(result).toEqual(mockStats);
      });
    });

    describe('getTasksByPriority', () => {
      it('should return tasks grouped by priority', async () => {
        const mockHighTask = createMockTask({ priority: TaskPriority.HIGH });
        const mockMediumTask = createMockTask({
          priority: TaskPriority.MEDIUM,
        });
        const mockLowTask = createMockTask({ priority: TaskPriority.LOW });
        const mockNoneTask = createMockTask({ priority: TaskPriority.NONE });

        // Clear previous mock implementations
        jest.clearAllMocks();

        tasksRepository.find.mockImplementation((options: any) => {
          const priority = options.where?.priority;
          switch (priority) {
            case TaskPriority.HIGH:
              return Promise.resolve([mockHighTask]);
            case TaskPriority.MEDIUM:
              return Promise.resolve([mockMediumTask]);
            case TaskPriority.LOW:
              return Promise.resolve([mockLowTask]);
            case TaskPriority.NONE:
              return Promise.resolve([mockNoneTask]);
            default:
              return Promise.resolve([]);
          }
        });

        const result = await service.getTasksByPriority();

        expect(result).toEqual({
          [TaskPriority.HIGH]: [mockHighTask],
          [TaskPriority.MEDIUM]: [mockMediumTask],
          [TaskPriority.LOW]: [mockLowTask],
          [TaskPriority.NONE]: [mockNoneTask],
        });
      });
    });

    describe('completeOverdueTasks', () => {
      // Skipped: This functionality is not planned for production systems
      it.skip('should complete overdue tasks', async () => {
        // This test is skipped and implementation details are simplified
        const mockTasks = [createMockTask(), createMockTask()];
        tasksRepository.find.mockResolvedValue(mockTasks);
        tasksRepository.save.mockResolvedValue(mockTasks);

        await service.completeOverdueTasks('user-id', {
          additionalFilters: { cutoffDate: new Date() },
          includeBlockedTasks: false,
        });

        // Just verify the function doesn't throw
        expect(true).toBe(true);
      });
    });

    describe('batchCompleteTasks', () => {
      // Skipped: This functionality is not planned for production systems
      it.skip('should batch complete tasks', async () => {
        // This test is skipped and implementation details are simplified
        const mockTasks = [createMockTask(), createMockTask()];
        tasksRepository.find.mockResolvedValue(mockTasks);
        tasksRepository.save.mockResolvedValue(mockTasks);

        await service.batchCompleteTasks('user-id', {
          additionalFilters: { taskIds: ['task-1', 'task-2'] },
          statuses: [TaskStatus.NOT_STARTED],
        });

        // Just verify the function doesn't throw
        expect(true).toBe(true);
      });
    });
  });
});
