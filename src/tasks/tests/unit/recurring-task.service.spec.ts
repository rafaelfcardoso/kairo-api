import { Test, TestingModule } from '@nestjs/testing';
import { RecurringTaskService } from '../../recurring-task.service';
import { TasksRepository } from '../../tasks.repository';
import { TaskFactory } from '../../factories/task.factory';
import {
  Task,
  RecurrencePattern,
  TaskStatus,
  TaskPriority,
} from '../../tasks.entity';
import { Logger } from '@nestjs/common';

describe('RecurringTaskService', () => {
  let service: RecurringTaskService;
  let tasksRepository: Partial<TasksRepository>;
  let taskFactory: Partial<TaskFactory>;

  beforeEach(async () => {
    // Create mock implementations
    tasksRepository = {
      createTask: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    taskFactory = {
      createTask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTaskService,
        {
          provide: TasksRepository,
          useValue: tasksRepository,
        },
        {
          provide: TaskFactory,
          useValue: taskFactory,
        },
      ],
    }).compile();

    // Override the logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    service = module.get<RecurringTaskService>(RecurringTaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateNextOccurrence', () => {
    // Mock the current date for consistent testing
    let originalDate: DateConstructor;
    let fixedDate: Date;

    beforeEach(() => {
      originalDate = global.Date;
      fixedDate = new Date('2025-03-03T12:00:00.000Z'); // Monday

      // Mock Date constructor and now() method
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
    });

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should calculate next occurrence for daily pattern', () => {
      const dueDate = new Date('2025-03-03T10:00:00.000Z');
      const recurrenceRule = 'FREQ=DAILY;INTERVAL=1';

      const result = service.calculateNextOccurrence(dueDate, recurrenceRule);

      // Should be tomorrow at the same time
      expect(result.getDate()).toBe(4); // 3 + 1
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getFullYear()).toBe(2025);
    });

    it('should calculate next occurrence for weekly pattern without specific days', () => {
      const dueDate = new Date('2025-03-03T10:00:00.000Z');
      const recurrenceRule = 'FREQ=WEEKLY;INTERVAL=1';

      const result = service.calculateNextOccurrence(dueDate, recurrenceRule);

      // Should be next week on the same day
      expect(result.getDate()).toBe(10); // 3 + 7
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getFullYear()).toBe(2025);
    });

    it('should calculate next occurrence for weekly pattern with specific days (next day this week)', () => {
      // Current date is Monday (day 1)
      const dueDate = new Date('2025-03-03T10:00:00.000Z');
      const recurrenceRule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';

      // Mock the extractRecurrenceDays method to return the days
      jest
        .spyOn(service as any, 'extractRecurrenceDays')
        .mockReturnValue('monday,wednesday,friday');

      const result = service.calculateNextOccurrence(dueDate, recurrenceRule);

      // Should be Wednesday (2 days after Monday)
      expect(result.getDate()).toBe(5); // 3 + 2
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getFullYear()).toBe(2025);
    });

    it('should calculate next occurrence for weekly pattern with specific days (next week)', () => {
      // Current date is Friday (day 5)
      fixedDate = new Date('2025-03-07T12:00:00.000Z'); // Friday

      const dueDate = new Date('2025-03-07T10:00:00.000Z');
      const recurrenceRule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';

      // Mock the extractRecurrenceDays method to return the days
      jest
        .spyOn(service as any, 'extractRecurrenceDays')
        .mockReturnValue('monday,wednesday,friday');

      const result = service.calculateNextOccurrence(dueDate, recurrenceRule);

      // Should be next Monday (3 days after Friday)
      expect(result.getDate()).toBe(10); // 7 + 3
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getFullYear()).toBe(2025);
    });

    it('should calculate next occurrence for monthly pattern', () => {
      const dueDate = new Date('2025-03-03T10:00:00.000Z');
      const recurrenceRule = 'FREQ=MONTHLY;INTERVAL=1';

      const result = service.calculateNextOccurrence(dueDate, recurrenceRule);

      // Should be next month on the same day
      expect(result.getDate()).toBe(3);
      expect(result.getMonth()).toBe(3); // April (0-indexed)
      expect(result.getFullYear()).toBe(2025);
    });

    it('should calculate next occurrence for yearly pattern', () => {
      const dueDate = new Date('2025-03-03T10:00:00.000Z');
      const recurrenceRule = 'FREQ=YEARLY;INTERVAL=1';

      const result = service.calculateNextOccurrence(dueDate, recurrenceRule);

      // Should be next year on the same day
      expect(result.getDate()).toBe(3);
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getFullYear()).toBe(2026);
    });

    it('should default to tomorrow if recurrence pattern cannot be extracted', () => {
      const dueDate = new Date('2025-03-03T10:00:00.000Z');
      const recurrenceRule = 'INVALID_RULE';

      // Mock the extractRecurrencePattern method to return null
      jest
        .spyOn(service as any, 'extractRecurrencePattern')
        .mockReturnValue(null);

      const result = service.calculateNextOccurrence(dueDate, recurrenceRule);

      // Should default to tomorrow
      expect(result.getDate()).toBe(4); // 3 + 1
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getFullYear()).toBe(2025);
    });
  });

  describe('extractRecurrencePattern', () => {
    it('should extract DAILY pattern', () => {
      const result = (service as any).extractRecurrencePattern(
        'FREQ=DAILY;INTERVAL=1',
      );
      expect(result).toBe(RecurrencePattern.DAILY);
    });

    it('should extract WEEKLY pattern', () => {
      const result = (service as any).extractRecurrencePattern(
        'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR',
      );
      expect(result).toBe(RecurrencePattern.WEEKLY);
    });

    it('should extract MONTHLY pattern', () => {
      const result = (service as any).extractRecurrencePattern(
        'FREQ=MONTHLY;INTERVAL=1',
      );
      expect(result).toBe(RecurrencePattern.MONTHLY);
    });

    it('should extract YEARLY pattern', () => {
      const result = (service as any).extractRecurrencePattern(
        'FREQ=YEARLY;INTERVAL=1',
      );
      expect(result).toBe(RecurrencePattern.YEARLY);
    });

    it('should return null for invalid pattern', () => {
      const result = (service as any).extractRecurrencePattern('INVALID_RULE');
      expect(result).toBeNull();
    });

    it('should return null for empty rule', () => {
      const result = (service as any).extractRecurrencePattern('');
      expect(result).toBeNull();
    });

    it('should return null for null rule', () => {
      const result = (service as any).extractRecurrencePattern(null);
      expect(result).toBeNull();
    });
  });

  describe('createNextTaskInstance', () => {
    it('should create a new task instance for the next occurrence', async () => {
      // Create a completed recurring task
      const completedTask = new Task();
      completedTask.id = '123';
      completedTask.title = 'Recurring Task';
      completedTask.description = 'This is a recurring task';
      completedTask.status = TaskStatus.COMPLETED;
      completedTask.priority = TaskPriority.MEDIUM;
      completedTask.dueDate = new Date('2025-03-03T10:00:00.000Z');
      completedTask.hasTime = true;
      completedTask.needsReminder = true;
      completedTask.reminderMessage = 'Reminder message';
      completedTask.recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
      completedTask.isRecurring = true;
      completedTask.recurrencePattern = RecurrencePattern.DAILY;
      completedTask.project = { id: 'project-123' } as any;
      completedTask.tags = [{ id: 'tag-123' }] as any;

      // Mock the calculateNextOccurrence method
      jest
        .spyOn(service, 'calculateNextOccurrence')
        .mockReturnValue(new Date('2025-03-04T10:00:00.000Z'));

      const result = await service.createNextTaskInstance(completedTask);

      // Verify the next task has the correct properties
      expect(result.nextTask).toBeDefined();
      expect(result.nextDate).toEqual(new Date('2025-03-04T10:00:00.000Z'));
      expect(result.nextTask.title).toBe(completedTask.title);
      expect(result.nextTask.description).toBe(completedTask.description);
      expect(result.nextTask.status).toBe(TaskStatus.NOT_STARTED);
      expect(result.nextTask.priority).toBe(completedTask.priority);
      expect(result.nextTask.dueDate).toEqual(
        new Date('2025-03-04T10:00:00.000Z'),
      );
      expect(result.nextTask.hasTime).toBe(completedTask.hasTime);
      expect(result.nextTask.needsReminder).toBe(completedTask.needsReminder);
      expect(result.nextTask.reminderMessage).toBe(
        completedTask.reminderMessage,
      );
      expect(result.nextTask.recurrenceRule).toBe(completedTask.recurrenceRule);
      expect(result.nextTask.isRecurring).toBe(true);
      expect(result.nextTask.recurrencePattern).toBe(
        completedTask.recurrencePattern,
      );
      expect(result.nextTask.project).toEqual(completedTask.project);
      expect(result.nextTask.tags).toEqual(completedTask.tags);
    });

    it('should throw an error if the task is not recurring', async () => {
      const nonRecurringTask = new Task();
      nonRecurringTask.id = '123';
      nonRecurringTask.title = 'Non-recurring Task';
      nonRecurringTask.recurrenceRule = null;

      await expect(
        service.createNextTaskInstance(nonRecurringTask),
      ).rejects.toThrow('Task is not recurring');
    });

    it('should throw an error if next occurrence cannot be calculated', async () => {
      const recurringTask = new Task();
      recurringTask.id = '123';
      recurringTask.title = 'Recurring Task';
      recurringTask.recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
      recurringTask.dueDate = new Date('2025-03-03T10:00:00.000Z');

      // Mock calculateNextOccurrence to return null
      jest.spyOn(service, 'calculateNextOccurrence').mockReturnValue(null);

      await expect(
        service.createNextTaskInstance(recurringTask),
      ).rejects.toThrow('Could not calculate next occurrence');
    });
  });
});
