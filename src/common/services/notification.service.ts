import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Task } from '../../tasks/tasks.entity';
import { AiService } from './ai.service';
import {
  NotificationDomainService,
  NotificationContent,
} from '../../tasks/notification.domain.service';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * NotificationService is an infrastructure service responsible for delivering notifications.
 * It uses the NotificationDomainService to generate notification content.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
    private readonly notificationDomainService: NotificationDomainService,
  ) {}

  /**
   * Send a notification based on a task
   * @param task The task to send a notification for
   * @param userEmail The user's email address
   * @param userTimezone The user's timezone
   */
  async sendTaskNotification(
    task: Task,
    userEmail: string,
    userTimezone: string = 'UTC',
  ): Promise<void> {
    try {
      // Collect additional context based on task type
      const context = await this.collectAdditionalContext(task, userTimezone);

      // Generate notification content using the domain service
      const notificationContent =
        this.notificationDomainService.generateNotificationContent(task);

      // Merge the additional context with the notification content
      notificationContent.data = {
        ...notificationContent.data,
        ...context,
      };

      // Prepare and send email
      const emailOptions =
        this.prepareEmailFromNotificationContent(notificationContent);
      emailOptions.to = userEmail;

      await this.sendEmail(emailOptions);
      this.logger.log(`Notification sent for task ${task.id} to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification for task ${task.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Collect additional context data based on task type
   */
  private async collectAdditionalContext(
    task: Task,
    userTimezone: string,
  ): Promise<Record<string, any>> {
    const context: Record<string, any> = {
      currentTime: new Date().toISOString(),
      userTimezone,
    };

    try {
      // Use the needsReminder flag instead of checking task types
      if (task.needsReminder) {
        // Get AI-generated reminder text
        const reminderContext = {
          task_title: task.title,
          task_description: task.description || '',
          user_timezone: userTimezone,
          current_time: new Date().toISOString(),
        };

        const smartReminder = await this.aiService.getSmartReminder({
          task_id: task.id,
          task_title: task.title,
          task_description: task.description,
          task_due_date: task.dueDate?.toISOString(),
          task_priority: task.priority,
          task_tags: task.tags?.map((tag) => tag.name),
          task_project: task.project?.name,
          user_timezone: reminderContext.user_timezone,
        });

        context.aiReminderText = smartReminder.reminder_text;
      }

      // Standard tasks don't need extra processing

      // Note: News updates and job listings functionality has been removed
      // in the simplified model
    } catch (error) {
      this.logger.warn(
        `Failed to collect additional context for task ${task.id}: ${error.message}`,
      );
    }

    return context;
  }

  /**
   * Convert notification content to email format
   */
  private prepareEmailFromNotificationContent(
    content: NotificationContent,
  ): EmailOptions {
    return {
      to: '',
      subject: content.title,
      html: this.createEmailHtml(content),
    };
  }

  /**
   * Create HTML email content from notification content
   */
  private createEmailHtml(content: NotificationContent): string {
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${content.title}</h2>
        <p>${content.message}</p>
    `;

    // Add task-specific data if available
    if (content.data) {
      // Add news items if present
      if (content.data.newsItems && content.data.newsItems.length > 0) {
        html += this.createNewsItemsHtml(content.data.newsItems);
      }

      // Add job items if present
      if (content.data.jobItems && content.data.jobItems.length > 0) {
        html += this.createJobItemsHtml(content.data.jobItems);
      }
    }

    // Close the email
    html += `
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated notification from Zenith Task Manager.</p>
      </div>
    `;

    return html;
  }

  /**
   * Create HTML for news items
   */
  private createNewsItemsHtml(newsItems: any[]): string {
    return newsItems
      .map(
        (item) => `
      <div style="margin-bottom: 20px;">
        <h3><a href="${item.url}" style="color: #007bff; text-decoration: none;">${item.title}</a></h3>
        <p>${item.summary}</p>
        ${item.source ? `<p style="font-size: 12px; color: #666;">Source: ${item.source}</p>` : ''}
      </div>
    `,
      )
      .join('');
  }

  /**
   * Create HTML for job items
   */
  private createJobItemsHtml(jobItems: any[]): string {
    return jobItems
      .map(
        (job) => `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3><a href="${job.url}" style="color: #007bff; text-decoration: none;">${job.title}</a></h3>
        <p><strong>${job.company}</strong> | ${job.location}</p>
        ${job.description ? `<p>${job.description}</p>` : ''}
      </div>
    `,
      )
      .join('');
  }

  /**
   * Send an email (implementation would depend on email service)
   * This is a placeholder that would be replaced with actual email sending logic
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    // In a real implementation, this would use a service like:
    // - @nestjs-modules/mailer
    // - nodemailer directly
    // - A third-party service like SendGrid, Mailgun, etc.

    // For demonstration, we'll just log the email
    this.logger.log(
      `[EMAIL SIMULATION] To: ${options.to}, Subject: ${options.subject}`,
    );
    this.logger.debug(`[EMAIL CONTENT] ${options.html.substring(0, 100)}...`);

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
