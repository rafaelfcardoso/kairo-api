import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationDomainService,
  NotificationContent,
} from '../../../../src/tasks/notification.domain.service';
import {
  Task,
  TaskPriority,
  TaskStatus,
} from '../../../../src/tasks/tasks.entity';

describe('NotificationDomainService', () => {
  let service: NotificationDomainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationDomainService],
    }).compile();

    service = module.get<NotificationDomainService>(NotificationDomainService);
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
    task.reminderMessage = null;
    task.isArchived = false;
    task.createdAt = new Date();
    task.updatedAt = new Date();

    // Apply any overrides
    Object.assign(task, overrides);

    return task;
  };

  describe('generateNotificationContent', () => {
    it('should generate standard notification for regular tasks', () => {
      const task = createTestTask({
        title: 'Complete Project',
        description: 'Finish the project documentation',
        needsReminder: false,
      });

      const result = service.generateNotificationContent(task);

      expect(result).toBeDefined();
      expect(result.title).toBe('Task Due: Complete Project');
      expect(result.message).toContain(
        'Your task "Complete Project" is now due',
      );
      expect(result.message).toContain('Finish the project documentation');
      expect(result.data).toBeDefined();
      expect(result.data.taskId).toBe(task.id);
      expect(result.data.hasAttachments).toBe(false);
    });

    it('should handle tasks without description in standard notifications', () => {
      const task = createTestTask({
        title: 'Complete Project',
        description: null,
        needsReminder: false,
      });

      const result = service.generateNotificationContent(task);

      expect(result).toBeDefined();
      expect(result.title).toBe('Task Due: Complete Project');
      expect(result.message).toBe('Your task "Complete Project" is now due.');
      expect(result.data).toBeDefined();
      expect(result.data.taskId).toBe(task.id);
    });

    it('should generate reminder notifications for tasks with reminders', () => {
      const task = createTestTask({
        title: 'Call Client',
        needsReminder: true,
        reminderMessage: 'Remember to discuss the new proposal',
      });

      const result = service.generateNotificationContent(task);

      expect(result).toBeDefined();
      expect(result.title).toBe('Reminder: Call Client');
      expect(result.message).toContain('This is a reminder for: Call Client');
      expect(result.message).toContain('Remember to discuss the new proposal');
      expect(result.data).toBeDefined();
      expect(result.data.taskId).toBe(task.id);
      expect(result.data.priority).toBe(task.priority);
      expect(result.data.isReminder).toBe(true);
    });

    it('should handle tasks without custom reminder message', () => {
      const task = createTestTask({
        title: 'Call Client',
        needsReminder: true,
        reminderMessage: null,
      });

      const result = service.generateNotificationContent(task);

      expect(result).toBeDefined();
      expect(result.title).toBe('Reminder: Call Client');
      expect(result.message).toBe('This is a reminder for: Call Client');
      expect(result.data).toBeDefined();
      expect(result.data.taskId).toBe(task.id);
      expect(result.data.isReminder).toBe(true);
    });
  });
});
