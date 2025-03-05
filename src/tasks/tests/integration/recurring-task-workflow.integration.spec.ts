import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../../tasks.service';
import { RecurringTaskService } from '../../recurring-task.service';
import { TaskDomainService } from '../../tasks.domain.service';
import { SchedulerService } from '../../../common/services/scheduler.service';
import { NotificationService } from '../../../common/services/notification.service';
import { TasksRepository } from '../../tasks.repository';
import { ProjectsRepository } from '../../../projects/projects.repository';
import { TagsRepository } from '../../../tags/tags.repository';
import { SecurityLoggerService } from '../../../common/services/security-logger.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task, TaskStatus, RecurrencePattern } from '../../tasks.entity';
import { Repository } from 'typeorm';
import { TaskFactory } from '../../factories/task.factory';
import { CreateTaskDto } from '../../tasks.dto';

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
      (tasksRepository.getTaskById as jest.Mock).mockResolvedValue(mockTask);
      (tasksRepository.save as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
      });
      (
        recurringTaskService.processCompletedTask as jest.Mock
      ).mockResolvedValue(nextTask);

      // Act
      const result = await taskService.updateTask(taskId, {
        status: TaskStatus.COMPLETED,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(tasksRepository.save).toHaveBeenCalled();
      expect(recurringTaskService.processCompletedTask).toHaveBeenCalledWith(
        mockTask,
      );
    });
  });

  describe('Scheduler processing due tasks', () => {
    it('should process due recurring tasks and schedule next occurrences', async () => {
      // Arrange
      const mockDueTask = {
        id: 'task-1',
        title: 'Due Recurring Task',
        description: 'This task is due and recurring',
        dueDate: new Date('2025-03-15T09:00:00Z'), // 1 hour ago
        isRecurring: true,
        recurrencePattern: RecurrencePattern.DAILY,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        needsReminder: true,
        status: TaskStatus.NOT_STARTED,
      };

      // Mock repository responses
      (taskRepository.find as jest.Mock).mockResolvedValue([mockDueTask]);
      (taskDomainService.calculateNextOccurrence as jest.Mock).mockReturnValue(
        new Date('2025-03-16T09:00:00Z'),
      );
      (taskRepository.save as jest.Mock).mockResolvedValue({
        ...mockDueTask,
        nextDueDate: new Date('2025-03-16T09:00:00Z'),
      });

      // Act
      await schedulerService.checkDueTasks();

      // Assert
      expect(taskRepository.find).toHaveBeenCalled();
      expect(notificationService.sendTaskNotification).toHaveBeenCalled();
      expect(taskDomainService.calculateNextOccurrence).toHaveBeenCalledWith(
        mockDueTask,
      );
      expect(taskRepository.save).toHaveBeenCalled();
    });
  });

  describe('End-to-end recurring task workflow', () => {
    it('should handle the complete lifecycle of a recurring task', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'Weekly Recurring Task',
        description: 'This task recurs weekly',
        dueDate: '2025-03-15T10:00:00Z',
        isRecurring: true,
        recurrencePattern: RecurrencePattern.WEEKLY,
        recurrenceDays: 'monday,wednesday,friday',
        needsReminder: true,
      };

      const mockTask = {
        id: 'task-1',
        title: createTaskDto.title,
        description: createTaskDto.description,
        dueDate: new Date(createTaskDto.dueDate),
        isRecurring: true,
        recurrencePattern: RecurrencePattern.WEEKLY,
        recurrenceDays: 'monday,wednesday,friday',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        needsReminder: true,
        status: TaskStatus.NOT_STARTED,
      };

      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
      };

      const nextTask = {
        id: 'task-2',
        title: mockTask.title,
        description: mockTask.description,
        dueDate: new Date('2025-03-17T10:00:00Z'), // Next Monday
        isRecurring: true,
        recurrencePattern: RecurrencePattern.WEEKLY,
        recurrenceDays: 'monday,wednesday,friday',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        needsReminder: true,
        status: TaskStatus.NOT_STARTED,
        recurringParentId: 'task-1',
      };

      // Mock repository responses
      (tasksRepository.createTask as jest.Mock).mockResolvedValue(mockTask);
      (tasksRepository.getTaskById as jest.Mock)
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(completedTask);
      (tasksRepository.save as jest.Mock).mockResolvedValue(completedTask);
      (
        recurringTaskService.processCompletedTask as jest.Mock
      ).mockResolvedValue(nextTask);
      (
        recurringTaskService.scheduleNextRecurrence as jest.Mock
      ).mockResolvedValue(nextTask);

      // Act - Create the recurring task
      const createdTask = await taskService.createTask(createTaskDto);

      // Act - Complete the task
      const updatedTask = await taskService.updateTask(createdTask.id, {
        status: TaskStatus.COMPLETED,
      });

      // Assert
      expect(createdTask).toBeDefined();
      expect(createdTask.isRecurring).toBe(true);
      expect(updatedTask.status).toBe(TaskStatus.COMPLETED);
      expect(recurringTaskService.processCompletedTask).toHaveBeenCalledWith(
        mockTask,
      );
    });
  });
});
