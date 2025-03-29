import {
  Task,
  TaskStatus,
  TaskPriority,
  RecurrencePattern,
  RecurrenceTimeOfDay,
} from '../../../../src/tasks/tasks.entity';

describe('Task Entity', () => {
  // Factory function to create test tasks
  const createTask = (overrides: Partial<Task> = {}): Task => {
    const task = new Task();
    task.id = 'test-task-id';
    task.title = 'Test Task';
    task.description = 'Test Description';
    task.status = TaskStatus.NOT_STARTED;
    task.priority = TaskPriority.NONE;
    task.dueDate = null;
    task.hasTime = false;
    task.isArchived = false;
    task.needsReminder = false;
    task.isRecurring = false;
    task.recurrenceRule = null;
    task.estimatedMinutes = 0;
    task.createdAt = new Date();
    task.updatedAt = new Date();

    // Apply any overrides
    Object.assign(task, overrides);

    return task;
  };

  describe('Basic Properties', () => {
    it('should create a task with default values when manually set', () => {
      const task = new Task();
      // Manually set the default values as they would be set by TypeORM
      task.status = TaskStatus.NOT_STARTED;
      task.priority = TaskPriority.NONE;
      task.hasTime = false;
      task.isArchived = false;
      task.needsReminder = false;
      task.isRecurring = false;
      task.estimatedMinutes = 0;

      // Check that values are set correctly
      expect(task.status).toEqual(TaskStatus.NOT_STARTED);
      expect(task.priority).toEqual(TaskPriority.NONE);
      expect(task.hasTime).toBe(false);
      expect(task.isArchived).toBe(false);
      expect(task.needsReminder).toBe(false);
      expect(task.isRecurring).toBe(false);
      expect(task.estimatedMinutes).toBe(0);
    });

    it('should set and get properties correctly', () => {
      const task = createTask();

      // Update properties
      task.title = 'Updated Title';
      task.description = 'Updated Description';
      task.status = TaskStatus.IN_PROGRESS;
      task.priority = TaskPriority.HIGH;

      // Check that properties were updated
      expect(task.title).toBe('Updated Title');
      expect(task.description).toBe('Updated Description');
      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
      expect(task.priority).toBe(TaskPriority.HIGH);
    });

    it('should correctly set recurrence properties', () => {
      const task = createTask({
        isRecurring: true,
        recurrencePattern: RecurrencePattern.WEEKLY,
        recurrenceDays: 'monday,wednesday,friday',
        recurrenceTimeOfDay: RecurrenceTimeOfDay.MORNING,
        recurrenceTime: '08:00',
      });

      expect(task.isRecurring).toBe(true);
      expect(task.recurrencePattern).toBe(RecurrencePattern.WEEKLY);
      expect(task.recurrenceDays).toBe('monday,wednesday,friday');
      expect(task.recurrenceTimeOfDay).toBe(RecurrenceTimeOfDay.MORNING);
      expect(task.recurrenceTime).toBe('08:00');
    });

    it('should set and get nextDueDate correctly', () => {
      const nextDueDate = new Date('2023-12-15T10:00:00Z');
      const task = createTask({
        nextDueDate,
      });

      expect(task.nextDueDate).toEqual(nextDueDate);

      // Update nextDueDate
      const newNextDueDate = new Date('2023-12-16T10:00:00Z');
      task.nextDueDate = newNextDueDate;
      expect(task.nextDueDate).toEqual(newNextDueDate);
    });

    it('should set and get recurrenceRule correctly', () => {
      const task = createTask();
      const recurrenceRule = 'FREQ=DAILY;INTERVAL=1';

      task.recurrenceRule = recurrenceRule;
      expect(task.recurrenceRule).toBe(recurrenceRule);

      // Update recurrenceRule
      const newRecurrenceRule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';
      task.recurrenceRule = newRecurrenceRule;
      expect(task.recurrenceRule).toBe(newRecurrenceRule);
    });

    it('should set and get recurringParentId correctly', () => {
      const recurringParentId = 'parent-task-id';
      const task = createTask({
        recurringParentId,
      });

      expect(task.recurringParentId).toBe(recurringParentId);

      // Update recurringParentId
      const newParentId = 'new-parent-task-id';
      task.recurringParentId = newParentId;
      expect(task.recurringParentId).toBe(newParentId);
    });

    it('should handle updatedAt property', () => {
      const task = createTask();
      const initialUpdatedAt = task.updatedAt;

      // In a real database operation, TypeORM would update this automatically
      // Here we simulate that behavior
      const newUpdatedAt = new Date(initialUpdatedAt.getTime() + 1000);
      task.updatedAt = newUpdatedAt;

      expect(task.updatedAt).toEqual(newUpdatedAt);
      expect(task.updatedAt).not.toEqual(initialUpdatedAt);
    });
  });

  describe('isCompleted getter', () => {
    it('should return true when status is COMPLETED', () => {
      const task = createTask({
        status: TaskStatus.COMPLETED,
      });

      expect(task.isCompleted).toBe(true);
    });

    it('should return false when status is NOT_STARTED', () => {
      const task = createTask({
        status: TaskStatus.NOT_STARTED,
      });

      expect(task.isCompleted).toBe(false);
    });

    it('should return false when status is IN_PROGRESS', () => {
      const task = createTask({
        status: TaskStatus.IN_PROGRESS,
      });

      expect(task.isCompleted).toBe(false);
    });

    it('should return false when status is BLOCKED', () => {
      const task = createTask({
        status: TaskStatus.BLOCKED,
      });

      expect(task.isCompleted).toBe(false);
    });
  });

  describe('Task Status Transitions', () => {
    it('should allow transition from NOT_STARTED to IN_PROGRESS', () => {
      const task = createTask({
        status: TaskStatus.NOT_STARTED,
      });

      task.status = TaskStatus.IN_PROGRESS;

      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should allow transition from IN_PROGRESS to COMPLETED', () => {
      const task = createTask({
        status: TaskStatus.IN_PROGRESS,
      });

      task.status = TaskStatus.COMPLETED;

      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(task.isCompleted).toBe(true);
    });

    it('should allow transition from IN_PROGRESS to BLOCKED', () => {
      const task = createTask({
        status: TaskStatus.IN_PROGRESS,
      });

      task.status = TaskStatus.BLOCKED;

      expect(task.status).toBe(TaskStatus.BLOCKED);
    });

    it('should allow transition from BLOCKED to IN_PROGRESS', () => {
      const task = createTask({
        status: TaskStatus.BLOCKED,
      });

      task.status = TaskStatus.IN_PROGRESS;

      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  describe('Relationships', () => {
    it('should initialize tags as undefined', () => {
      const task = new Task();

      expect(task.tags).toBeUndefined();
    });

    it('should initialize focusSessions as undefined', () => {
      const task = new Task();

      expect(task.focusSessions).toBeUndefined();
    });

    it('should initialize project as undefined', () => {
      const task = new Task();

      expect(task.project).toBeUndefined();
    });
  });

  describe('Dates and Times', () => {
    it('should handle due date with time', () => {
      const dueDate = new Date('2023-12-01T14:30:00');

      const task = createTask({
        dueDate: dueDate,
        hasTime: true,
      });

      expect(task.dueDate).toEqual(dueDate);
      expect(task.hasTime).toBe(true);
    });

    it('should handle due date without time', () => {
      const dueDate = new Date('2023-12-01');

      const task = createTask({
        dueDate: dueDate,
        hasTime: false,
      });

      expect(task.dueDate).toEqual(dueDate);
      expect(task.hasTime).toBe(false);
    });
  });

  describe('Task Hierarchy', () => {
    it('should handle recurring parent-child relationship', () => {
      const parentId = 'parent-task-id';

      const task = createTask({
        recurringParentId: parentId,
      });

      expect(task.recurringParentId).toBe(parentId);
    });
  });

  describe('Task Priorities', () => {
    it('should allow setting NONE priority', () => {
      const task = createTask();

      task.priority = TaskPriority.NONE;

      expect(task.priority).toBe(TaskPriority.NONE);
    });

    it('should allow setting LOW priority', () => {
      const task = createTask();

      task.priority = TaskPriority.LOW;

      expect(task.priority).toBe(TaskPriority.LOW);
    });

    it('should allow setting MEDIUM priority', () => {
      const task = createTask();

      task.priority = TaskPriority.MEDIUM;

      expect(task.priority).toBe(TaskPriority.MEDIUM);
    });

    it('should allow setting HIGH priority', () => {
      const task = createTask();

      task.priority = TaskPriority.HIGH;

      expect(task.priority).toBe(TaskPriority.HIGH);
    });
  });
});
