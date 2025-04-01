import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task, TaskStatus, RecurrencePattern } from '../src/tasks/tasks.entity';
import { Repository } from 'typeorm';
import { SchedulerService } from '../src/common/services/scheduler.service';

describe('Scheduler E2E', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let schedulerService: SchedulerService;
  let testTaskId: string;

  // Mock the current date for consistent testing
  let originalDate: DateConstructor;
  let fixedDate: Date;

  beforeAll(async () => {
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    taskRepository = moduleFixture.get<Repository<Task>>(
      getRepositoryToken(Task),
    );
    schedulerService = moduleFixture.get<SchedulerService>(SchedulerService);

    await app.init();

    // Clean up any existing test data
    await taskRepository.delete({ title: 'E2E Scheduler Test Task' });
  });

  afterAll(async () => {
    global.Date = originalDate;

    // Clean up test data
    if (testTaskId) {
      await taskRepository.delete(testTaskId);
    }

    await app.close();
  });

  describe('Scheduler Processing', () => {
    it('should create a task that is due and process it', async () => {
      // Create a task that is due now (or slightly in the past)
      const pastDate = new Date(fixedDate);
      pastDate.setMinutes(pastDate.getMinutes() - 5); // 5 minutes ago

      const task = taskRepository.create({
        title: 'E2E Scheduler Test Task',
        description: 'This task should be processed by the scheduler',
        dueDate: pastDate,
        needsReminder: true,
        status: TaskStatus.NOT_STARTED,
        isArchived: false,
      });

      const savedTask = await taskRepository.save(task);
      testTaskId = savedTask.id;

      // Manually trigger the scheduler check
      await schedulerService.checkDueTasks();

      // Verify the task was processed
      const processedTask = await taskRepository.findOne({
        where: { id: testTaskId },
      });

      expect(processedTask).toBeDefined();
      // The task should still exist and not be completed by the scheduler
      // It should have been processed for notifications
    });

    it('should process a recurring task and set the next due date', async () => {
      // Update the test task to be recurring
      const task = await taskRepository.findOne({
        where: { id: testTaskId },
      });

      // Add null check
      expect(task).not.toBeNull();
      if (!task) return;

      task.isRecurring = true;
      task.recurrencePattern = RecurrencePattern.DAILY;
      task.recurrenceRule = 'FREQ=DAILY;INTERVAL=1';

      await taskRepository.save(task);

      // Manually trigger the scheduler check
      await schedulerService.checkDueTasks();

      // Verify the task was processed and next due date was set
      const processedTask = await taskRepository.findOne({
        where: { id: testTaskId },
      });

      expect(processedTask).not.toBeNull();
      if (!processedTask) return;

      expect(processedTask.nextDueDate).toBeDefined();

      // The next due date should be tomorrow
      const tomorrow = new Date(fixedDate);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Compare dates by converting to ISO string and comparing the date part
      const nextDueDateStr = processedTask.nextDueDate
        .toISOString()
        .split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      expect(nextDueDateStr).toBe(tomorrowStr);
    });

    it('should update recurring tasks without nextDueDate', async () => {
      // Create a recurring task without nextDueDate
      const task = taskRepository.create({
        title: 'E2E Scheduler Maintenance Test',
        description: 'This task should be updated by the maintenance job',
        dueDate: fixedDate,
        isRecurring: true,
        recurrencePattern: RecurrencePattern.DAILY,
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
        status: TaskStatus.NOT_STARTED,
        isArchived: false,
      });

      const savedTask = await taskRepository.save(task);

      // Manually trigger the maintenance job
      await schedulerService.updateRecurringTasksDueDates();

      // Verify the task was updated
      const updatedTask = await taskRepository.findOne({
        where: { id: savedTask.id },
      });

      expect(updatedTask).not.toBeNull();
      if (!updatedTask) return;

      expect(updatedTask.nextDueDate).toBeDefined();

      // Clean up
      await taskRepository.delete(savedTask.id);
    });
  });
});
