import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { Task, TaskStatus } from '../../src/tasks/tasks.entity';
import { SchedulerService } from '../../src/common/services/scheduler.service';
import { NotificationService } from '../../src/common/services/notification.service';

describe('Task Reminder E2E', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;
  let schedulerService: SchedulerService;
  let notificationService: NotificationService;
  let sendTaskNotificationSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TypeOrmModule.forFeature([Task])],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    taskRepository = moduleFixture.get<Repository<Task>>(getRepositoryToken(Task));
    schedulerService = moduleFixture.get<SchedulerService>(SchedulerService);
    notificationService = moduleFixture.get<NotificationService>(NotificationService);

    sendTaskNotificationSpy = jest.spyOn(notificationService, 'sendTaskNotification').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await taskRepository.query('DELETE FROM task WHERE title = $1', ['E2E Reminder Task']);
    await app.close();
  });

  it('should send reminder and update reminderSentAt', async () => {
    // Insert a task with reminderAt in the past and needsReminder = true
    const now = new Date();
    const reminderAt = new Date(now.getTime() - 60 * 1000); // 1 minute ago
    const task = taskRepository.create({
      title: 'E2E Reminder Task',
      needsReminder: true,
      reminderAt,
      isArchived: false,
      status: TaskStatus.NOT_STARTED,
    });
    await taskRepository.save(task);

    // Run the scheduler's reminder check
    await schedulerService.checkReminders();

    // Reload the task
    const updatedTask = await taskRepository.findOne({ where: { id: task.id } });
    expect(updatedTask).toBeDefined();
    expect(updatedTask!.reminderSentAt).not.toBeNull();
    expect(sendTaskNotificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: task.id }),
      expect.any(String),
      expect.any(String),
    );
  });
});
