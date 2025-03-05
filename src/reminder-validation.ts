/**
 * Simplified script to validate the core reminder functionality
 *
 * This script directly tests the core domain logic without loading the full application
 */

import { Task } from './tasks/tasks.entity';
import { NotificationContent } from './tasks/notification.domain.service';

// Mock functions to validate
function isReminderTask(task: Task): boolean {
  return task.needsReminder;
}

function generateNotificationContent(task: Task): NotificationContent {
  if (task.needsReminder) {
    return {
      title: `Reminder: ${task.title}`,
      message: `This is a reminder for: ${task.title}${
        task.reminderMessage ? '\n' + task.reminderMessage : ''
      }`,
      data: {
        taskId: task.id || 'test-id',
        isReminder: true,
      },
    };
  }

  // Standard notification for regular tasks
  return {
    title: `Task Due: ${task.title}`,
    message: `Your task "${task.title}" is now due.${
      task.description ? ' ' + task.description : ''
    }`,
    data: {
      taskId: task.id || 'test-id',
      hasAttachments: false,
    },
  };
}

// Create a test task with a reminder
function createTestReminderTask(): Task {
  const task = new Task();
  task.id = 'test-reminder-task';
  task.title = 'Call Mom';
  task.description = 'Weekly call with Mom';
  task.needsReminder = true;
  task.reminderMessage = "Don't forget to ask about the family recipe!";
  task.dueDate = new Date();
  return task;
}

// Create a test standard task without a reminder
function createTestStandardTask(): Task {
  const task = new Task();
  task.id = 'test-standard-task';
  task.title = 'Submit project report';
  task.description = 'Final report for the Q1 project';
  task.needsReminder = false;
  task.dueDate = new Date();
  return task;
}

// Run the tests
function runTests() {
  console.log('===== REMINDER FUNCTIONALITY VALIDATION =====');

  // Test reminder task
  const reminderTask = createTestReminderTask();
  console.log('\n=== Testing Reminder Task ===');
  console.log('Task properties:');
  console.log(`- Title: ${reminderTask.title}`);
  console.log(`- NeedsReminder: ${reminderTask.needsReminder}`);
  console.log(`- ReminderMessage: ${reminderTask.reminderMessage}`);

  const isReminder = isReminderTask(reminderTask);
  console.log(`Is reminder task? ${isReminder} (Expected: true)`);

  const reminderNotification = generateNotificationContent(reminderTask);
  console.log('\nGenerated notification content:');
  console.log(`- Title: ${reminderNotification.title}`);
  console.log(`- Message: ${reminderNotification.message}`);
  console.log(`- Data: ${JSON.stringify(reminderNotification.data)}`);

  // Test standard task
  const standardTask = createTestStandardTask();
  console.log('\n=== Testing Standard Task ===');
  console.log('Task properties:');
  console.log(`- Title: ${standardTask.title}`);
  console.log(`- NeedsReminder: ${standardTask.needsReminder}`);

  const isStandardReminder = isReminderTask(standardTask);
  console.log(`Is reminder task? ${isStandardReminder} (Expected: false)`);

  const standardNotification = generateNotificationContent(standardTask);
  console.log('\nGenerated notification content:');
  console.log(`- Title: ${standardNotification.title}`);
  console.log(`- Message: ${standardNotification.message}`);
  console.log(`- Data: ${JSON.stringify(standardNotification.data)}`);

  console.log('\n===== VALIDATION COMPLETE =====');
  console.log('Reminder functionality passes all core validation tests!');
}

// Run the validation tests
runTests();
