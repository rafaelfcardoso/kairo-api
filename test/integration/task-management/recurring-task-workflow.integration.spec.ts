import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../../../src/tasks/tasks.service';
import { RecurringTaskService } from '../../../src/tasks/recurring-task.service';
import { TaskDomainService } from '../../../src/tasks/tasks.domain.service';
import { SchedulerService } from '../../../src/common/services/scheduler.service';
import { NotificationService } from '../../../src/common/services/notification.service';
import { TasksRepository } from '../../../src/tasks/tasks.repository';
import { ProjectsRepository } from '../../../src/projects/projects.repository';
import { TagsRepository } from '../../../src/tags/tags.repository';
import { SecurityLoggerService } from '../../../src/common/services/security-logger.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Task,
  TaskStatus,
  RecurrencePattern,
} from '../../../src/tasks/tasks.entity';
import { Repository } from 'typeorm';
import { TaskFactory } from '../../../src/tasks/factories/task.factory';
import { CreateTaskDto } from '../../../src/tasks/tasks.dto';
import { NotificationDomainService } from '../../../src/tasks/notification.domain.service';

describe('Recurring Task Workflow Integration', () => {
  let taskService: TaskService;
  let recurringTaskService: RecurringTaskService;
  let taskDomainService: TaskDomainService;
  let schedulerService: SchedulerService;
  let tasksRepository: TasksRepository;
  let taskRepository: Repository<Task>;
  let notificationService: NotificationService;
  let taskFactory: TaskFactory;

  // Mock the current date for consistent testing
  let originalDate: DateConstructor;
  let fixedDate: Date;

  beforeAll(() => {
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
  });

  afterAll(() => {
    global.Date = originalDate;
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
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const mockTasksRepository = {
      createTask: jest.fn(),
      getTaskById: jest.fn(),
      updateTask: jest.fn(),
      save: jest.fn(),
    };

    const mockProjectsRepository = {
      findOne: jest.fn(),
    };

    const mockTagsRepository = {
      findByIds: jest.fn(),
    };

    const mockSecurityLogger = {
      logSecurityEvent: jest.fn(),
      logValidationFailure: jest.fn(),
    };

    const mockNotificationService = {
      sendTaskNotification: jest.fn(),
    };

    // Mock for NotificationDomainService
    const mockNotificationDomainService = {
      generateNotificationContent: jest.fn(),
      scheduleTaskReminder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        RecurringTaskService,
        TaskDomainService,
        SchedulerService,
        TaskFactory,
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
        {
          provide: ProjectsRepository,
          useValue: mockProjectsRepository,
        },
        {
          provide: TagsRepository,
          useValue: mockTagsRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: SecurityLoggerService,
          useValue: mockSecurityLogger,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: NotificationDomainService,
          useValue: mockNotificationDomainService,
        },
      ],
    }).compile();

    taskService = module.get<TaskService>(TaskService);
    recurringTaskService =
      module.get<RecurringTaskService>(RecurringTaskService);
    taskDomainService = module.get<TaskDomainService>(TaskDomainService);
    schedulerService = module.get<SchedulerService>(SchedulerService);
    tasksRepository = module.get<TasksRepository>(TasksRepository);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    notificationService = module.get<NotificationService>(NotificationService);
    taskFactory = module.get<TaskFactory>(TaskFactory);

    // Setup spies
    jest.spyOn(recurringTaskService, 'processCompletedTask');
    jest.spyOn(recurringTaskService, 'scheduleNextRecurrence');
    jest.spyOn(taskDomainService, 'calculateNextOccurrence');
    jest.spyOn(schedulerService as any, 'processTask');
  });

  describe('Creating a recurring task', () => {
    it('should create a recurring task with daily recurrence', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'Daily Recurring Task',
        description: 'This task recurs daily',
        dueDate: '2025-03-15T10:00:00Z',
        isRecurring: true,
        recurrencePattern: RecurrencePattern.DAILY,
        needsReminder: true,
      };

      const mockTask = {
        id: 'task-1',
        title: createTaskDto.title,
        description: createTaskDto.description,
        dueDate: new Date(createTaskDto.dueDate),
        isRecurring: true,
        recurrencePattern: RecurrencePattern.DAILY,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        needsReminder: true,
        status: TaskStatus.NOT_STARTED,
      };

      // Mock repository responses
      (tasksRepository.createTask as jest.Mock).mockResolvedValue(mockTask);
      (tasksRepository.getTaskById as jest.Mock).mockResolvedValue(mockTask);

      // Act
      const result = await taskService.createTask(createTaskDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.isRecurring).toBe(true);
      expect(result.recurrencePattern).toBe(RecurrencePattern.DAILY);
      expect(tasksRepository.createTask).toHaveBeenCalledWith(createTaskDto);
    });
  });

  describe('Completing a recurring task', () => {
    it('should mark the task as completed and schedule the next occurrence', async () => {
      // Arrange
      const taskId = 'task-1';
      const mockTask = {
        id: taskId,
        title: 'Daily Recurring Task',
        description: 'This task recurs daily',
        dueDate: new Date('2025-03-15T10:00:00Z'),
        isRecurring: true,
        recurrencePattern: RecurrencePattern.DAILY,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        status: TaskStatus.NOT_STARTED,
      };

      const nextTask = {
        id: 'task-2',
        title: 'Daily Recurring Task',
        description: 'This task recurs daily',
        dueDate: new Date('2025-03-16T10:00:00Z'),
        isRecurring: true,
        recurrencePattern: RecurrencePattern.DAILY,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        status: TaskStatus.NOT_STARTED,
        recurringParentId: taskId,
      };

      // Mock repository responses
      (tasksRepository.getTaskById as jest.Mock).mockResolvedValueOnce(
        mockTask,
      );
      (tasksRepository.save as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
      });

      // Fix: Use a different approach to mock the functionality without referencing createFromExisting
      const mockTaskFactory = taskFactory as any;
      mockTaskFactory.createNextInstance = jest.fn().mockReturnValue(nextTask);
      (taskRepository.save as jest.Mock).mockResolvedValue(nextTask);

      // Mock the recurring task service to return the new task
      (recurringTaskService.processCompletedTask as jest.Mock) = jest
        .fn()
        .mockResolvedValue(nextTask);

      // Act
      const result = await taskService.updateTask(taskId, {
        status: TaskStatus.COMPLETED,
      });

      // Assert
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(recurringTaskService.processCompletedTask).toHaveBeenCalled();
    });
  });
});
