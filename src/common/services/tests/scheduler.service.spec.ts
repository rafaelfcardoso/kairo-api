import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from '../scheduler.service';
import { TaskService } from '../../../tasks/tasks.service';
import { NotificationService } from '../notification.service';
import { TaskDomainService } from '../../../tasks/tasks.domain.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task, TaskStatus } from '../../../tasks/tasks.entity';
import { Repository, LessThanOrEqual, Not, IsNull } from 'typeorm';
import { Logger } from '@nestjs/common';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let taskRepository: Partial<Repository<Task>>;
  let taskService: Partial<TaskService>;
  let taskDomainService: Partial<TaskDomainService>;
  let notificationService: Partial<NotificationService>;

  // Mock the current date for consistent testing
  let originalDate: DateConstructor;
  let fixedDate: Date;

  beforeEach(async () => {
    // Set up fixed date for testing
    originalDate = global.Date;
    fixedDate = new Date('2025-03-03T12:00:00.000Z');

    global.Date = class extends originalDate {
      constructor(value?: number | string | Date) {
        if (arguments.length === 0) {
          super(fixedDate);
        } else {
          super(value as any);
        }
      }
      static now() {
        return fixedDate.getTime();
      }
    } as DateConstructor;

    // Create mock implementations
    taskRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    taskService = {
      getTaskById: jest.fn(),
      updateTask: jest.fn(),
    };

    taskDomainService = {
      calculateNextOccurrence: jest.fn(),
    };

    notificationService = {
      sendTaskNotification: jest.fn(),
    };

    // Mock query builder
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    (taskRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      mockQueryBuilder,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: getRepositoryToken(Task),
          useValue: taskRepository,
        },
        {
          provide: TaskService,
          useValue: taskService,
        },
        {
          provide: TaskDomainService,
          useValue: taskDomainService,
        },
        {
          provide: NotificationService,
          useValue: notificationService,
        },
      ],
    }).compile();

    // Override the logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    service = module.get<SchedulerService>(SchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.Date = originalDate;
  });

  describe('checkDueTasks', () => {
    it('should find and process due tasks', async () => {
      // Create mock tasks
      const mockTasks = [
        {
          id: '1',
          title: 'Task 1',
          dueDate: new Date('2025-03-03T10:00:00.000Z'),
          status: TaskStatus.NOT_STARTED,
          isArchived: false,
          needsReminder: true,
          project: { id: 'project-1' },
          tags: [{ id: 'tag-1' }],
        },
        {
          id: '2',
          title: 'Task 2',
          dueDate: new Date('2025-03-03T11:00:00.000Z'),
          status: TaskStatus.IN_PROGRESS,
          isArchived: false,
          needsReminder: true,
          project: { id: 'project-2' },
          tags: [],
        },
      ] as Task[];

      // Mock repository find method
      (taskRepository.find as jest.Mock).mockResolvedValue(mockTasks);

      // Spy on the private processTask method
      const processTaskSpy = jest
        .spyOn(service as any, 'processTask')
        .mockResolvedValue(undefined);

      // Call the method
      await service.checkDueTasks();

      // Verify repository was called with correct parameters
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: {
          dueDate: LessThanOrEqual(new Date()),
          status: Not(TaskStatus.COMPLETED),
          isArchived: false,
          needsReminder: true,
        },
        relations: ['project', 'tags'],
      });

      // Verify processTask was called for each task
      expect(processTaskSpy).toHaveBeenCalledTimes(2);
      expect(processTaskSpy).toHaveBeenCalledWith(mockTasks[0]);
      expect(processTaskSpy).toHaveBeenCalledWith(mockTasks[1]);
    });

    it('should use fallback approach if primary query fails', async () => {
      // Mock primary query to fail
      (taskRepository.find as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      // Mock tasks for fallback approach
      const mockFallbackTasks = [
        {
          id: '3',
          title: 'Fallback Task',
          dueDate: new Date('2025-03-03T09:00:00.000Z'),
          status: TaskStatus.NOT_STARTED,
          isArchived: false,
          needsReminder: true,
        },
      ] as Task[];

      // Mock query builder getMany method
      const mockQueryBuilder = taskRepository.createQueryBuilder as jest.Mock;
      mockQueryBuilder().getMany.mockResolvedValue(mockFallbackTasks);

      // Spy on the private processTask method
      const processTaskSpy = jest
        .spyOn(service as any, 'processTask')
        .mockResolvedValue(undefined);

      // Call the method
      await service.checkDueTasks();

      // Verify fallback query was used
      expect(mockQueryBuilder).toHaveBeenCalledWith('task');
      expect(mockQueryBuilder().where).toHaveBeenCalledWith(
        'task.dueDate <= :now',
        { now: expect.any(Date) },
      );
      expect(mockQueryBuilder().andWhere).toHaveBeenCalledWith(
        'task.status != :status',
        { status: TaskStatus.COMPLETED },
      );
      expect(mockQueryBuilder().andWhere).toHaveBeenCalledWith(
        'task.isArchived = :archived',
        { archived: false },
      );
      expect(mockQueryBuilder().andWhere).toHaveBeenCalledWith(
        'task.needsReminder = :reminder',
        { reminder: true },
      );
      expect(mockQueryBuilder().leftJoinAndSelect).toHaveBeenCalledWith(
        'task.project',
        'project',
      );
      expect(mockQueryBuilder().leftJoinAndSelect).toHaveBeenCalledWith(
        'task.tags',
        'tags',
      );
      expect(mockQueryBuilder().getMany).toHaveBeenCalled();

      // Verify processTask was called for the fallback task
      expect(processTaskSpy).toHaveBeenCalledTimes(1);
      expect(processTaskSpy).toHaveBeenCalledWith(mockFallbackTasks[0]);
    });

    it('should handle errors in both primary and fallback approaches', async () => {
      // Mock primary query to fail
      (taskRepository.find as jest.Mock).mockRejectedValue(
        new Error('Primary error'),
      );

      // Mock fallback query to also fail
      const mockQueryBuilder = taskRepository.createQueryBuilder as jest.Mock;
      mockQueryBuilder().getMany.mockRejectedValue(new Error('Fallback error'));

      // Spy on logger error method
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      // Call the method
      await service.checkDueTasks();

      // Verify error was logged for both approaches
      expect(loggerErrorSpy).toHaveBeenCalledTimes(2);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error checking due tasks: Primary error',
        expect.any(String),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Fallback approach also failed: Fallback error',
        expect.any(String),
      );
    });
  });

  describe('processTask', () => {
    it('should process a task with reminder and recurrence', async () => {
      // Create a mock task
      const mockTask = {
        id: '1',
        title: 'Recurring Task',
        dueDate: new Date('2025-03-03T10:00:00.000Z'),
        status: TaskStatus.NOT_STARTED,
        isArchived: false,
        needsReminder: true,
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
      } as Task;

      // Mock notification service
      (notificationService.sendTaskNotification as jest.Mock).mockResolvedValue(
        undefined,
      );

      // Spy on the private scheduleNextOccurrence method
      const scheduleNextOccurrenceSpy = jest
        .spyOn(service as any, 'scheduleNextOccurrence')
        .mockResolvedValue(undefined);

      // Call the private method
      await (service as any).processTask(mockTask);

      // Verify notification was sent
      expect(notificationService.sendTaskNotification).toHaveBeenCalledWith(
        mockTask,
        'rafael.dev.test@icloud.com',
        'America/New_York',
      );

      // Verify next occurrence was scheduled
      expect(scheduleNextOccurrenceSpy).toHaveBeenCalledWith(mockTask);
    });

    it('should process a task with recurrenceRule but without isRecurring flag', async () => {
      // Create a mock task
      const mockTask = {
        id: '2',
        title: 'Legacy Recurring Task',
        dueDate: new Date('2025-03-03T10:00:00.000Z'),
        status: TaskStatus.NOT_STARTED,
        isArchived: false,
        needsReminder: false,
        isRecurring: false,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
      } as Task;

      // Spy on the private scheduleNextOccurrence method
      const scheduleNextOccurrenceSpy = jest
        .spyOn(service as any, 'scheduleNextOccurrence')
        .mockResolvedValue(undefined);

      // Call the private method
      await (service as any).processTask(mockTask);

      // Verify notification was not sent (needsReminder is false)
      expect(notificationService.sendTaskNotification).not.toHaveBeenCalled();

      // Verify next occurrence was scheduled (has recurrenceRule)
      expect(scheduleNextOccurrenceSpy).toHaveBeenCalledWith(mockTask);
    });

    it('should handle errors during task processing', async () => {
      // Create a mock task
      const mockTask = {
        id: '3',
        title: 'Error Task',
        dueDate: new Date('2025-03-03T10:00:00.000Z'),
        status: TaskStatus.NOT_STARTED,
        isArchived: false,
        needsReminder: true,
        isRecurring: true,
      } as Task;

      // Mock notification service to throw an error
      (notificationService.sendTaskNotification as jest.Mock).mockRejectedValue(
        new Error('Notification error'),
      );

      // Spy on logger error method
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      // Call the private method
      await (service as any).processTask(mockTask);

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error processing task 3: Notification error',
        expect.any(String),
      );
    });
  });

  describe('scheduleNextOccurrence', () => {
    it('should schedule the next occurrence of a recurring task', async () => {
      // Create a mock task
      const mockTask = {
        id: '1',
        title: 'Recurring Task',
        dueDate: new Date('2025-03-03T10:00:00.000Z'),
        status: TaskStatus.NOT_STARTED,
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
      } as Task;

      // Mock next occurrence date
      const nextDate = new Date('2025-03-04T10:00:00.000Z');
      (taskDomainService.calculateNextOccurrence as jest.Mock).mockReturnValue(
        nextDate,
      );

      // Call the private method
      await (service as any).scheduleNextOccurrence(mockTask);

      // Verify domain service was called
      expect(taskDomainService.calculateNextOccurrence).toHaveBeenCalledWith(
        mockTask,
      );

      // Verify task was updated with next due date
      expect(mockTask.nextDueDate).toEqual(nextDate);
      expect(taskRepository.save).toHaveBeenCalledWith(mockTask);
    });

    it('should mark task as completed if no more occurrences', async () => {
      // Create a mock task
      const mockTask = {
        id: '2',
        title: 'Last Occurrence Task',
        dueDate: new Date('2025-03-03T10:00:00.000Z'),
        status: TaskStatus.NOT_STARTED,
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;COUNT=1', // Only one occurrence
      } as Task;

      // Mock no next occurrence
      (taskDomainService.calculateNextOccurrence as jest.Mock).mockReturnValue(
        null,
      );

      // Call the private method
      await (service as any).scheduleNextOccurrence(mockTask);

      // Verify domain service was called
      expect(taskDomainService.calculateNextOccurrence).toHaveBeenCalledWith(
        mockTask,
      );

      // Verify task was marked as completed
      expect(mockTask.status).toEqual(TaskStatus.COMPLETED);
      expect(taskRepository.save).toHaveBeenCalledWith(mockTask);
    });

    it('should handle errors during scheduling', async () => {
      // Create a mock task
      const mockTask = {
        id: '3',
        title: 'Error Task',
        dueDate: new Date('2025-03-03T10:00:00.000Z'),
        status: TaskStatus.NOT_STARTED,
        isRecurring: true,
      } as Task;

      // Mock domain service to throw an error
      (
        taskDomainService.calculateNextOccurrence as jest.Mock
      ).mockImplementation(() => {
        throw new Error('Calculation error');
      });

      // Spy on logger error method
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      // Call the private method
      await (service as any).scheduleNextOccurrence(mockTask);

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error scheduling next occurrence for task 3: Calculation error',
        expect.any(String),
      );
    });
  });

  describe('updateRecurringTasksDueDates', () => {
    it('should update recurring tasks without nextDueDate', async () => {
      // Create mock recurring tasks
      const mockRecurringTasks = [
        {
          id: '1',
          title: 'Task with nextDueDate',
          status: TaskStatus.NOT_STARTED,
          isArchived: false,
          isRecurring: true,
          recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
          nextDueDate: new Date('2025-03-04T10:00:00.000Z'),
        },
        {
          id: '2',
          title: 'Task without nextDueDate',
          status: TaskStatus.NOT_STARTED,
          isArchived: false,
          isRecurring: true,
          recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
          nextDueDate: null,
        },
        {
          id: '3',
          title: 'Another task without nextDueDate',
          status: TaskStatus.IN_PROGRESS,
          isArchived: false,
          isRecurring: true,
          recurrenceRule: 'FREQ=WEEKLY;INTERVAL=1',
          nextDueDate: undefined,
        },
      ] as Task[];

      // Mock repository find method
      (taskRepository.find as jest.Mock).mockResolvedValue(mockRecurringTasks);

      // Spy on the private scheduleNextOccurrence method
      const scheduleNextOccurrenceSpy = jest
        .spyOn(service as any, 'scheduleNextOccurrence')
        .mockResolvedValue(undefined);

      // Call the method
      await service.updateRecurringTasksDueDates();

      // Verify repository was called with correct parameters
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: [
          {
            isRecurring: true,
            status: Not(TaskStatus.COMPLETED),
            isArchived: false,
          },
          {
            recurrenceRule: Not(IsNull()),
            status: Not(TaskStatus.COMPLETED),
            isArchived: false,
          },
        ],
      });

      // Verify scheduleNextOccurrence was called only for tasks without nextDueDate
      expect(scheduleNextOccurrenceSpy).toHaveBeenCalledTimes(2);
      expect(scheduleNextOccurrenceSpy).toHaveBeenCalledWith(
        mockRecurringTasks[1],
      );
      expect(scheduleNextOccurrenceSpy).toHaveBeenCalledWith(
        mockRecurringTasks[2],
      );
      expect(scheduleNextOccurrenceSpy).not.toHaveBeenCalledWith(
        mockRecurringTasks[0],
      );
    });

    it('should handle errors during update', async () => {
      // Mock repository to throw an error
      (taskRepository.find as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      // Spy on logger error method
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      // Call the method
      await service.updateRecurringTasksDueDates();

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error updating recurring tasks: Database error',
        expect.any(String),
      );
    });
  });
});
