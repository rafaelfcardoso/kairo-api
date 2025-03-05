/**
 * Test script to validate the reminder functionality
 *
 * This script simulates creating a task with a reminder and
 * verifying that the reminder is properly processed.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TaskFactory } from './tasks/factories/task.factory';
import { TaskDomainService } from './tasks/tasks.domain.service';
import { NotificationDomainService } from './tasks/notification.domain.service';
import { Logger } from '@nestjs/common';

async function testReminderFunctionality() {
  const logger = new Logger('ReminderTest');
  logger.log('Starting reminder functionality test...');

  // Initialize the NestJS application
  const app = await NestFactory.createApplicationContext(AppModule);

  // Get the required services
  const taskFactory = app.get(TaskFactory);
  const taskDomainService = app.get(TaskDomainService);
  const notificationDomainService = app.get(NotificationDomainService);

  try {
    // Create a task with a reminder
    logger.log('Creating a task with a reminder...');
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + 5); // Set due date 5 minutes from now

    const reminderTask = taskFactory.createReminderTask(
      'Test Reminder Task',
      dueDate,
      'This is a test reminder message',
    );

    logger.log(`Created task: ${reminderTask.title}`);
    logger.log(`Due date: ${reminderTask.dueDate}`);
    logger.log(`NeedsReminder: ${reminderTask.needsReminder}`);
    logger.log(`ReminderMessage: ${reminderTask.reminderMessage}`);

    // Check if the task needs a reminder
    const isDue = taskDomainService.isTaskDue(reminderTask);
    logger.log(`Is task due: ${isDue}`);

    // Get the notification content
    const notificationContent =
      notificationDomainService.generateNotificationContent(reminderTask);
    logger.log('Generated notification:');
    logger.log(`- Title: ${notificationContent.title}`);
    logger.log(`- Message: ${notificationContent.message}`);
    logger.log(`- Data: ${JSON.stringify(notificationContent.data)}`);

    // Test the notification type determination
    const notificationType =
      taskDomainService.determineNotificationType(reminderTask);
    logger.log(`Notification type: ${notificationType}`);

    // Test getting tasks that need reminders
    const tasksWithReminders = taskDomainService.getTasksNeedingReminders([
      reminderTask,
    ]);
    logger.log(`Tasks needing reminders: ${tasksWithReminders.length}`);

    logger.log('Reminder functionality test completed successfully!');
  } catch (error) {
    logger.error(`Test failed: ${error.message}`, error.stack);
  } finally {
    await app.close();
  }
}

// Run the test
testReminderFunctionality().catch((error) => {
  console.error('Test failed with uncaught error:', error);
});
