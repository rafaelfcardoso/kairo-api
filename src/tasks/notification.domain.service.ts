import { Injectable, Logger } from '@nestjs/common';
import { Task } from './tasks.entity';

/**
 * Notification content model with all the necessary information for creating a notification
 */
export interface NotificationContent {
  title: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * NotificationDomainService handles the business logic for generating
 * notification content based on task properties.
 */
@Injectable()
export class NotificationDomainService {
  private readonly logger = new Logger(NotificationDomainService.name);

  /**
   * Generate notification content for a task
   * @param task The task to generate a notification for
   * @returns Notification content with title, message, and optional data
   */
  generateNotificationContent(task: Task): NotificationContent {
    // Handle reminder tasks differently
    if (task.needsReminder) {
      return this.generateReminderNotification(task);
    }

    // Default notification for standard tasks
    return this.generateStandardNotification(task);
  }

  /**
   * Generate notification for a standard task
   */
  private generateStandardNotification(task: Task): NotificationContent {
    return {
      title: `Task Due: ${task.title}`,
      message: `Your task "${task.title}" is now due.${
        task.description ? ' ' + task.description : ''
      }`,
      data: {
        taskId: task.id,
        hasAttachments: false,
      },
    };
  }

  /**
   * Generate notification for a reminder task
   */
  private generateReminderNotification(task: Task): NotificationContent {
    // Get custom reminder message if available
    const customMessage = task.reminderMessage
      ? `\n${task.reminderMessage}`
      : '';

    return {
      title: `Reminder: ${task.title}`,
      message: `This is a reminder for: ${task.title}${customMessage}`,
      data: {
        taskId: task.id,
        priority: task.priority,
        isReminder: true,
      },
    };
  }

  /**
   * Schedule a reminder for a task
   * @param task The task to schedule a reminder for
   * @param notificationContent The notification content to be sent
   */
  scheduleTaskReminder(
    task: Task,
    notificationContent: NotificationContent,
  ): void {
    this.logger.log(`Scheduling reminder for task: ${task.id}`);
    // In a real implementation, this would call a notification or scheduling service
    // This is just a placeholder for the test to verify the method is called
  }
}
