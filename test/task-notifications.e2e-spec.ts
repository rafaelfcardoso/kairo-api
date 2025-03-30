import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Task, TaskStatus, TaskPriority } from '../src/tasks/tasks.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('Task Notifications (E2E)', () => {
  let app: INestApplication;
  let taskRepository: Repository<Task>;

  // Track created entities for cleanup
  const createdTaskIds: string[] = [];
  const mockDate = new Date('2025-03-15T10:00:00Z');

  // Save original Date implementation
  const RealDate = global.Date;

  beforeAll(async () => {
    // Increase timeout for database connection
    jest.setTimeout(60000);

    // Mock Date for consistent testing
    // @ts-expect-error - intentionally mocking Date
    global.Date = class extends RealDate {
      constructor() {
        super();
        return mockDate;
      }

      static now() {
        return mockDate.getTime();
      }
    };

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe());

      taskRepository = moduleFixture.get<Repository<Task>>(
        getRepositoryToken(Task),
      );

      await app.init();

      // Clean up any existing test data (defensive cleanup)
      try {
        await taskRepository.delete({
          title: 'Notification Test Task',
        });
      } catch (error) {
        console.error('Error cleaning up existing test data:', error);
      }
    } catch (error) {
      console.error('Error setting up test module:', error);
      throw error;
    }
  }, 60000); // Increase timeout for beforeAll

  afterAll(async () => {
    // Clean up test data
    try {
      if (createdTaskIds.length > 0) {
        await taskRepository.delete(createdTaskIds);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }

    // Restore original Date
    global.Date = RealDate;

    await app.close();
  });

  describe('Task Notification Generation', () => {
    it('should create a task with a reminder', async () => {
      // Due 1 day from mock date
      const dueDateISO = new Date(
        mockDate.getTime() + 24 * 60 * 60 * 1000,
      ).toISOString();

      const taskWithReminder = {
        title: 'Notification Test Task - With Reminder',
        description: 'Task for testing notifications',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.HIGH,
        dueDate: dueDateISO,
        hasTime: true,
        needsReminder: true,
        reminderMessage: 'Please complete this task ASAP!',
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .send(taskWithReminder)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe(taskWithReminder.title);
      expect(response.body.needsReminder).toBe(true);
      expect(response.body.reminderMessage).toBe(
        taskWithReminder.reminderMessage,
      );

      // Save ID for cleanup
      createdTaskIds.push(response.body.id);

      // Verify in database
      const savedTask = await taskRepository.findOne({
        where: { id: response.body.id },
      });

      expect(savedTask).toBeDefined();
      expect(savedTask.needsReminder).toBe(true);
      expect(savedTask.reminderMessage).toBe(taskWithReminder.reminderMessage);
    });

    it('should get pending notifications', async () => {
      // Call the notifications endpoint
      const response = await request(app.getHttpServer())
        .get('/notifications/pending')
        .expect(200);

      expect(response.body).toBeDefined();

      // Check if our task is included in pending notifications
      const foundNotification = response.body.find((notification) =>
        notification.title.includes('Notification Test Task'),
      );

      // We should find our task in the pending notifications
      expect(foundNotification).toBeDefined();
      expect(foundNotification.message).toBe('Please complete this task ASAP!');
    });

    it('should acknowledge a notification', async () => {
      // Get pending notifications first to find our notification
      const pendingResponse = await request(app.getHttpServer())
        .get('/notifications/pending')
        .expect(200);

      const ourNotification = pendingResponse.body.find((notification) =>
        notification.title.includes('Notification Test Task'),
      );

      expect(ourNotification).toBeDefined();
      expect(ourNotification.id).toBeDefined();

      // Mark the notification as acknowledged
      const acknowledgeResponse = await request(app.getHttpServer())
        .post(`/notifications/${ourNotification.id}/acknowledge`)
        .expect(200);

      expect(acknowledgeResponse.body).toBeDefined();
      expect(acknowledgeResponse.body.success).toBe(true);

      // Verify notification is no longer pending
      const verifyResponse = await request(app.getHttpServer())
        .get('/notifications/pending')
        .expect(200);

      const stillPending = verifyResponse.body.find(
        (notification) => notification.id === ourNotification.id,
      );

      expect(stillPending).toBeUndefined();
    });

    it('should trigger notifications for due tasks', async () => {
      // Create a task that's due very soon
      const almostDueISO = new Date(
        mockDate.getTime() + 30 * 60 * 1000,
      ).toISOString(); // 30 mins from now

      const urgentTask = {
        title: 'Notification Test Task - Urgent',
        description: 'Task for testing urgent notifications',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.HIGH,
        dueDate: almostDueISO,
        hasTime: true,
        needsReminder: true,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .send(urgentTask)
        .expect(201);

      createdTaskIds.push(createResponse.body.id);

      // Trigger notification check
      await request(app.getHttpServer()).post('/tasks/check-due').expect(200);

      // Check if notification was created
      const notificationsResponse = await request(app.getHttpServer())
        .get('/notifications/pending')
        .expect(200);

      const urgentNotification = notificationsResponse.body.find(
        (notification) => notification.title.includes('Urgent'),
      );

      expect(urgentNotification).toBeDefined();
      expect(urgentNotification.priority).toBe('high');
      expect(urgentNotification.type).toBe('due_soon');
    });

    it('should get notification stats', async () => {
      const statsResponse = await request(app.getHttpServer())
        .get('/notifications/stats')
        .expect(200);

      expect(statsResponse.body).toBeDefined();
      expect(statsResponse.body.total).toBeGreaterThanOrEqual(1);
      expect(statsResponse.body.unread).toBeGreaterThanOrEqual(1);
      expect(statsResponse.body.byPriority).toBeDefined();
      expect(statsResponse.body.byPriority.high).toBeGreaterThanOrEqual(1);
    });

    it('should test notification preferences', async () => {
      // Update notification preferences
      const preferencesResponse = await request(app.getHttpServer())
        .post('/notifications/preferences')
        .send({
          emailNotifications: true,
          pushNotifications: false,
          notifyBeforeDue: 60, // 60 minutes before due
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
        })
        .expect(200);

      expect(preferencesResponse.body).toBeDefined();
      expect(preferencesResponse.body.success).toBe(true);

      // Get preferences
      const getPrefsResponse = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .expect(200);

      expect(getPrefsResponse.body).toBeDefined();
      expect(getPrefsResponse.body.emailNotifications).toBe(true);
      expect(getPrefsResponse.body.pushNotifications).toBe(false);
      expect(getPrefsResponse.body.notifyBeforeDue).toBe(60);
    });

    it('should mark all notifications as read', async () => {
      // Mark all as read
      await request(app.getHttpServer())
        .post('/notifications/mark-all-read')
        .expect(200);

      // Check stats to confirm all were marked as read
      const statsResponse = await request(app.getHttpServer())
        .get('/notifications/stats')
        .expect(200);

      expect(statsResponse.body.unread).toBe(0);
    });
  });
});
