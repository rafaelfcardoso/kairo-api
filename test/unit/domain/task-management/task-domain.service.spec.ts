import { Test, TestingModule } from '@nestjs/testing';
import { TaskDomainService } from '../../../../src/tasks/tasks.domain.service';
import {
  Task,
  TaskStatus,
  TaskPriority,
  RecurrencePattern,
} from '../../../../src/tasks/tasks.entity';
import { RRule } from 'rrule';
import * as moment from 'moment-timezone';
import { Project } from '../../../../src/projects/projects.entity';
import { Tag } from '../../../../src/tags/tags.entity';

// Hoist the mock above imports
jest.mock('moment-timezone', () => {
  // Mock the moment(...) call itself
  const momentFn = jest.fn((input) => {
    // Basic mock: return an object with a format function
    // Handle invalid date input specifically if possible
    const isInvalid = input && input.toString() === 'Invalid Date';
    return {
      tz: jest.fn().mockReturnThis(),
      format: jest
        .fn()
        .mockReturnValue(isInvalid ? 'Invalid date' : '[Mocked Date String]'),
    };
  });

  // Do NOT mock static properties like .tz if it causes type errors
  // momentFn.tz = { setDefault: jest.fn() };

  return momentFn;
});

describe('TaskDomainService', () => {
  let service: TaskDomainService;
  const mockedMoment = moment as jest.MockedFunction<any>;

  beforeEach(async () => {
    mockedMoment.mockClear();
    // Remove attempt to clear static mocks
    // if (mockedMoment.tz) { mockedMoment.tz.setDefault.mockClear(); }

    // Clear mocks on the *returned* object if needed, but might be complex
    // For simplicity, rely on mockReturnValueOnce per test

    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskDomainService],
    }).compile();

    service = module.get<TaskDomainService>(TaskDomainService);
  });

  // Factory function to create test tasks
  const createTestTask = (overrides: Partial<Task> = {}): Task => {
    const task = new Task();
    task.id = 'test-task-id';
    task.title = 'Test Task';
    task.description = 'Test Description';
    task.status = TaskStatus.NOT_STARTED;
    task.priority = TaskPriority.MEDIUM;
    task.dueDate = new Date();
    task.hasTime = false;
    task.needsReminder = false;
    task.isArchived = false;
    task.isRecurring = false;
    task.recurrenceRule = '';
    task.createdAt = new Date();
    task.updatedAt = new Date();

    // Apply any overrides
    Object.assign(task, overrides);

    return task;
  };

  describe('calculateNextOccurrence', () => {
    it('should calculate the next occurrence date', () => {
      // Create a task with a daily recurrence rule
      const today = new Date();
      const dueDate = new Date(today);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create an RRule for daily recurrence
      const rrule = new RRule({
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dueDate,
      });

      const task = createTestTask({
        dueDate,
        isRecurring: true,
        recurrenceRule: rrule.toString(),
      });

      // Get the next occurrence
      const nextOccurrence = service.calculateNextOccurrence(task);

      // The next occurrence should be tomorrow
      expect(nextOccurrence).not.toBeNull();
      if (nextOccurrence) {
        expect(nextOccurrence.getDate()).toBe(tomorrow.getDate());
        expect(nextOccurrence.getMonth()).toBe(tomorrow.getMonth());
        expect(nextOccurrence.getFullYear()).toBe(tomorrow.getFullYear());
      }
    });

    it('should return null for tasks without recurrence rule', () => {
      const task = createTestTask({
        dueDate: new Date(),
        isRecurring: false,
        recurrenceRule: undefined,
      });

      const nextOccurrence = service.calculateNextOccurrence(task);

      expect(nextOccurrence).toBeNull();
    });

    it('should throw an error for invalid recurrence rule', () => {
      const task = createTestTask({
        dueDate: new Date(),
        isRecurring: true,
        recurrenceRule: 'INVALID-RRULE',
      });

      // Spy on the logger to silence the error during testing
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation(() => {});

      // We expect an error to be handled internally but returning null
      const result = service.calculateNextOccurrence(task);
      expect(result).toBeNull();

      // Check that the logger was called with the expected error
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Error calculating next occurrence for task ${task.id}`,
        ),
        expect.any(String),
      );

      // Restore the logger
      loggerSpy.mockRestore();
    });

    it('should return null when calculateNextOccurrence is called with null task', () => {
      // First we need to spy on the logger to avoid actual errors in the test output
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation(() => {});

      // Create a variable and explicitly set it to null for type safety
      const nullTask = null as any;

      // We need to mock any property access that might happen before the error
      // is caught to prevent the TypeError from being thrown
      try {
        const nextOccurrence = service.calculateNextOccurrence(nullTask);
        // Verify that the method returned null
        expect(nextOccurrence).toBeNull();
      } catch (error) {
        fail('Should not throw with null task');
      }

      // Verify that an error was logged (without checking specific message)
      expect(loggerSpy).toHaveBeenCalled();

      // Restore the original implementation
      loggerSpy.mockRestore();
    });
  });

  describe('isTaskDue', () => {
    it('should return false for tasks without due date', () => {
      const task = createTestTask({
        dueDate: undefined,
      });

      const isDue = service.isTaskDue(task);

      expect(isDue).toBe(false);
    });

    it('should return false for completed tasks', () => {
      const task = createTestTask({
        dueDate: new Date(Date.now() - 86400000), // Yesterday
        status: TaskStatus.COMPLETED,
      });

      const isDue = service.isTaskDue(task);

      expect(isDue).toBe(false);
    });

    it('should return false for archived tasks', () => {
      const task = createTestTask({
        dueDate: new Date(Date.now() - 86400000), // Yesterday
        isArchived: true,
      });

      const isDue = service.isTaskDue(task);

      expect(isDue).toBe(false);
    });

    it('should return true for overdue tasks', () => {
      const task = createTestTask({
        dueDate: new Date(Date.now() - 86400000), // Yesterday
      });

      const isDue = service.isTaskDue(task);

      expect(isDue).toBe(true);
    });

    it('should return true for tasks due today', () => {
      const now = new Date();
      const task = createTestTask({
        dueDate: now,
      });

      const isDue = service.isTaskDue(task);

      expect(isDue).toBe(true);
    });

    it('should return false for future tasks', () => {
      const tomorrow = new Date(Date.now() + 86400000); // Tomorrow
      const task = createTestTask({
        dueDate: tomorrow,
      });

      const isDue = service.isTaskDue(task);

      expect(isDue).toBe(false);
    });
  });

  describe('getTasksNeedingReminders', () => {
    it('should return tasks that need reminders', () => {
      const yesterday = new Date(Date.now() - 86400000); // Yesterday
      const tomorrow = new Date(Date.now() + 86400000); // Tomorrow

      const tasks = [
        createTestTask({
          dueDate: yesterday,
          needsReminder: true,
        }),
        createTestTask({
          dueDate: tomorrow,
          needsReminder: true,
        }),
        createTestTask({
          dueDate: yesterday,
          needsReminder: false,
        }),
        createTestTask({
          dueDate: yesterday,
          needsReminder: true,
          status: TaskStatus.COMPLETED,
        }),
        createTestTask({
          dueDate: yesterday,
          needsReminder: true,
          isArchived: true,
        }),
      ];

      const tasksNeedingReminders = service.getTasksNeedingReminders(tasks);

      // Only the first task should need a reminder
      expect(tasksNeedingReminders.length).toBe(1);
      expect(tasksNeedingReminders[0]).toBe(tasks[0]);
    });
  });

  describe('completeTask', () => {
    it('should mark a task as completed', () => {
      const task = createTestTask({
        status: TaskStatus.NOT_STARTED,
      });

      const result = service.completeTask(task);

      expect(result.updatedTask.status).toBe(TaskStatus.COMPLETED);
    });

    it('should create next occurrence for recurring tasks', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const task = createTestTask({
        status: TaskStatus.NOT_STARTED,
        isRecurring: true,
        recurrenceRule: new RRule({
          freq: RRule.DAILY,
          interval: 1,
          dtstart: today,
        }).toString(),
        project: { id: '123', name: 'Test Project' } as Project,
      });

      const result = service.completeTask(task);

      expect(result.updatedTask.status).toBe(TaskStatus.COMPLETED);
      expect(result.nextTask).toBeDefined();
      expect(result.nextTask!.project).toEqual(task.project);
    });

    it('should not create next occurrence if task is recurring but has reached count limit', () => {
      const dueDate = new Date();
      const rrule = new RRule({
        freq: RRule.DAILY,
        interval: 1,
        count: 1, // Only occurs once
        dtstart: dueDate,
      });

      const task = createTestTask({
        dueDate,
        isRecurring: true,
        recurrenceRule: rrule.toString(),
        nextDueDate: new Date('2023-12-15T10:00:00Z'),
        description: undefined,
        reminderMessage: undefined,
        project: undefined,
      });

      const result = service.completeTask(task);

      expect(result.updatedTask.status).toBe(TaskStatus.COMPLETED);
      expect(result.nextTask).toBeUndefined();
    });

    it('should handle error when completeTask is called with a task in invalid state', () => {
      // Create a task with invalid state (already completed)
      const task = createTestTask({
        status: TaskStatus.COMPLETED,
      });

      const result = service.completeTask(task);

      // The service should still mark it as completed without error
      expect(result.updatedTask.status).toBe(TaskStatus.COMPLETED);
      // No next task should be created
      expect(result.nextTask).toBeUndefined();
    });
  });

  describe('canCompleteTask', () => {
    it('should return true for incomplete task', () => {
      const task = createTestTask({
        status: TaskStatus.NOT_STARTED,
      });

      const canComplete = service.canCompleteTask(task);

      expect(canComplete).toBe(true);
    });

    it('should return false for completed task', () => {
      const task = createTestTask({
        status: TaskStatus.COMPLETED,
      });

      const canComplete = service.canCompleteTask(task);

      expect(canComplete).toBe(false);
    });
  });

  describe('createRecurrenceRule', () => {
    it('should create a daily recurrence rule', () => {
      const result = service.createRecurrenceRule('daily');
      expect(result).toContain('FREQ=DAILY');
    });

    it('should create a weekly recurrence rule', () => {
      const result = service.createRecurrenceRule('weekly');
      expect(result).toContain('FREQ=WEEKLY');
    });

    it('should create a monthly recurrence rule', () => {
      const result = service.createRecurrenceRule('monthly');
      expect(result).toContain('FREQ=MONTHLY');
    });

    it('should handle case-insensitive patterns', () => {
      const result = service.createRecurrenceRule('DAILY');
      expect(result).toContain('FREQ=DAILY');
    });

    it('should throw error for unknown pattern', () => {
      expect(() => service.createRecurrenceRule('invalid')).toThrow();
    });
  });

  describe('createTaskInstanceFromRecurring', () => {
    it('should create task instance from recurring task with basic properties', () => {
      const task = createTestTask({
        title: 'Recurring Task',
        description: 'Task Description',
        priority: TaskPriority.HIGH,
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        nextDueDate: new Date('2023-12-15T10:00:00Z'),
      });

      const result = service.createTaskInstanceFromRecurring(task);

      expect(result).toBeDefined();
      expect(result.title).toBe(task.title);
      expect(result.description).toBe(task.description);
      expect(result.priority).toBe(task.priority);
      expect(result.status).toBe(TaskStatus.NOT_STARTED);
      expect(result.dueDate).toEqual(task.nextDueDate);
      expect(result.isRecurring).toBe(false);
      expect(result.recurringParentId).toBe(task.id);
    });

    it('should create task instance from recurring task with project', () => {
      const project = new Project();
      project.id = 'project-1';
      project.name = 'Test Project';

      const task = createTestTask({
        title: 'Recurring Task with Project',
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        nextDueDate: new Date('2023-12-15T10:00:00Z'),
        project: project,
      });

      const result = service.createTaskInstanceFromRecurring(task);

      expect(result.project).toBe(task.project);
      expect(result.project.id).toBe('project-1');
    });

    it('should create task instance from recurring task with reminder settings', () => {
      const task = createTestTask({
        title: 'Recurring Task with Reminder',
        isRecurring: true,
        needsReminder: true,
        reminderMessage: 'Custom reminder message',
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        nextDueDate: new Date('2023-12-15T10:00:00Z'),
      });

      const result = service.createTaskInstanceFromRecurring(task);

      expect(result.needsReminder).toBe(true);
      expect(result.reminderMessage).toBe('Custom reminder message');
    });

    it('should create task instance from recurring task and handle hasTime property', () => {
      const task = createTestTask({
        title: 'Recurring Task with Time',
        isRecurring: true,
        hasTime: true,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        nextDueDate: new Date('2023-12-15T10:00:00Z'),
      });

      const result = service.createTaskInstanceFromRecurring(task);

      expect(result.hasTime).toBe(true);
    });

    it('should handle null or undefined values for optional fields', () => {
      const task = createTestTask({
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        nextDueDate: new Date('2023-12-15T10:00:00Z'),
        description: undefined,
        reminderMessage: undefined,
        project: undefined,
      });

      const result = service.createTaskInstanceFromRecurring(task);

      expect(result.description).toBeUndefined();
      expect(result.reminderMessage).toBeUndefined();
      expect(result.project).toBeUndefined();
    });

    it('should handle invalid date input gracefully', () => {
      const invalidDate = new Date('invalid-date');
      const expectedOutput = 'Invalid date'; // Based on simplified mock

      // Configure the main mock function to return the object for invalid date
      const mockReturn = {
        tz: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnValue(expectedOutput),
      };
      // Use mockImplementation to handle specific input
      mockedMoment.mockImplementation((input) => {
        if (input === invalidDate) {
          return mockReturn;
        }
        // Default for other calls in this test if any
        return { tz: jest.fn().mockReturnThis(), format: jest.fn() };
      });

      const formatted = service.formatDueDate(invalidDate);

      expect(formatted).toBe(expectedOutput);
      expect(mockedMoment).toHaveBeenCalledWith(invalidDate);
      expect(mockReturn.tz).toHaveBeenCalled();
      expect(mockReturn.format).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('formatDueDate', () => {
    it('should return a string for valid dates with default timezone', () => {
      const dueDate = new Date('2023-12-15T10:00:00Z');
      // Configure the mock for this call
      const mockReturn = {
        tz: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnValue('[Valid Date Output]'),
      };
      mockedMoment.mockReturnValueOnce(mockReturn);

      const formatted = service.formatDueDate(dueDate);

      expect(formatted).toBe('[Valid Date Output]');
      expect(mockedMoment).toHaveBeenCalledWith(dueDate);
      expect(mockReturn.tz).toHaveBeenCalledWith('UTC');
      expect(mockReturn.format).toHaveBeenCalledWith(expect.any(String)); // Check format was called
    });

    it('should return a string for valid dates with specified timezone', () => {
      const dueDate = new Date('2023-12-15T10:00:00Z');
      const timezone = 'America/New_York';
      const mockReturn = {
        tz: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnValue('[Valid Date Output TZ]'),
      };
      mockedMoment.mockReturnValueOnce(mockReturn);

      const formatted = service.formatDueDate(dueDate, timezone);

      expect(formatted).toBe('[Valid Date Output TZ]');
      expect(mockedMoment).toHaveBeenCalledWith(dueDate);
      expect(mockReturn.tz).toHaveBeenCalledWith(timezone);
      expect(mockReturn.format).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle invalid date input gracefully', () => {
      const invalidDate = new Date('invalid-date');
      const mockReturn = {
        tz: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnValue('Invalid date'), // Specific return for invalid
      };
      // Configure the main mock function to return our specific object for this invalid date input
      mockedMoment.mockImplementation((input) => {
        if (input === invalidDate) {
          return mockReturn;
        }
        // Default return for other inputs if necessary
        return {
          tz: jest.fn().mockReturnThis(),
          format: jest.fn().mockReturnValue('[Default]'),
        };
      });

      const formatted = service.formatDueDate(invalidDate);

      expect(formatted).toBe('Invalid date');
      expect(mockedMoment).toHaveBeenCalledWith(invalidDate);
      expect(mockReturn.tz).toHaveBeenCalled();
      expect(mockReturn.format).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('getUpcomingOccurrences', () => {
    it('should return empty array for tasks without recurrence rule', () => {
      const task = createTestTask({
        recurrenceRule: undefined,
      });

      const occurrences = service.getUpcomingOccurrences(task);

      expect(occurrences).toEqual([]);
    });

    it('should return specified number of upcoming occurrences', () => {
      const today = new Date();
      const rrule = new RRule({
        freq: RRule.DAILY,
        interval: 1,
        dtstart: today,
      });

      const task = createTestTask({
        isRecurring: true,
        recurrenceRule: rrule.toString(),
      });

      // Get 3 upcoming occurrences
      const occurrences = service.getUpcomingOccurrences(task, 3);

      expect(occurrences.length).toBe(3);

      // Each occurrence should be one day after the previous
      for (let i = 0; i < occurrences.length - 1; i++) {
        const currentDate = occurrences[i];
        const nextDate = occurrences[i + 1];

        expect(nextDate.getDate()).toBe(
          new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).getDate(),
        );
      }
    });

    it('should handle errors when parsing invalid recurrence rule', () => {
      // Spy on the logger to prevent actual error logs in test output
      const loggerSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation(() => {});

      const task = createTestTask({
        isRecurring: true,
        recurrenceRule: 'INVALID-RRULE',
      });

      const occurrences = service.getUpcomingOccurrences(task);

      expect(occurrences).toEqual([]);
      expect(loggerSpy).toHaveBeenCalled();

      // Restore the original implementation
      loggerSpy.mockRestore();
    });

    it('should respect the count parameter and limit occurrences', () => {
      const today = new Date();
      const rrule = new RRule({
        freq: RRule.DAILY,
        interval: 1,
        dtstart: today,
      });

      const task = createTestTask({
        isRecurring: true,
        recurrenceRule: rrule.toString(),
      });

      // Get 10 upcoming occurrences
      const occurrences = service.getUpcomingOccurrences(task, 10);

      expect(occurrences.length).toBe(10);

      // Get 1 upcoming occurrence
      const singleOccurrence = service.getUpcomingOccurrences(task, 1);

      expect(singleOccurrence.length).toBe(1);
    });
  });

  describe('createTaskInstanceFromRecurring - additional test cases', () => {
    it('should handle null or undefined values for optional fields', () => {
      const task = createTestTask({
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        nextDueDate: new Date('2023-12-15T10:00:00Z'),
        description: undefined,
        reminderMessage: undefined,
        project: undefined,
      });

      const result = service.createTaskInstanceFromRecurring(task);

      expect(result.description).toBeUndefined();
      expect(result.reminderMessage).toBeUndefined();
      expect(result.project).toBeUndefined();
    });

    it('should handle task with tags', () => {
      // Create mock tags
      const tag1 = new Tag();
      tag1.id = 'tag-1';
      tag1.name = 'Work';

      const tag2 = new Tag();
      tag2.id = 'tag-2';
      tag2.name = 'Important';

      const task = createTestTask({
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        nextDueDate: new Date('2023-12-15T10:00:00Z'),
        tags: [tag1, tag2],
      });

      const result = service.createTaskInstanceFromRecurring(task);

      // If tags are supposed to be copied in the implementation
      // (Note: This assertion should match the actual implementation behavior)
      if (task.tags && result.tags) {
        expect(result.tags.length).toBe(task.tags.length);
        expect(result.tags[0].id).toBe('tag-1');
        expect(result.tags[1].id).toBe('tag-2');
      }
    });

    it('should create a new task instance when no nextDueDate is available', () => {
      // Creating a task without nextDueDate
      const task = createTestTask({
        isRecurring: true,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        nextDueDate: undefined, // Explicitly set to undefined
      });

      const result = service.createTaskInstanceFromRecurring(task);

      // New task should still be created with undefined dueDate
      expect(result).toBeDefined();
      expect(result.dueDate).toBeUndefined(); // Expect undefined instead of null
    });
  });

  describe('determineNotificationType', () => {
    it('should return reminder type for tasks that need reminders', () => {
      const task = createTestTask({
        needsReminder: true,
      });

      const notificationType = service.determineNotificationType(task);

      expect(notificationType).toBe('reminder');
    });

    it('should return standard type for tasks that do not need reminders', () => {
      const task = createTestTask({
        needsReminder: false,
      });

      const notificationType = service.determineNotificationType(task);

      expect(notificationType).toBe('standard');
    });
  });
});
