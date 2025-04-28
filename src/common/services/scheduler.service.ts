import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { TaskService } from '../../tasks/tasks.service';
import { NotificationService } from './notification.service';
import { Task, TaskStatus } from '../../tasks/tasks.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not, IsNull } from 'typeorm';
import { TaskDomainService } from '../../tasks/tasks.domain.service';

/**
 * SchedulerService is an infrastructure service that handles scheduling and execution of tasks
 * using cron jobs. It delegates domain logic to the TaskDomainService.
 */
@Injectable()
export class SchedulerService implements OnApplicationShutdown {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private taskService: TaskService,
    private taskDomainService: TaskDomainService,
    private notificationService: NotificationService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationShutdown(signal?: string) {
    this.logger.log(`SchedulerService shutting down (signal: ${signal})...`);
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((job, name) => {
      try {
        job.stop();
        this.logger.log(`Stopped cron job: ${name}`);
      } catch (e) {
        this.logger.error(`Failed to stop cron job ${name}:`, e);
      }
    });
  }

  /**
   * Check for due tasks every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkDueTasks() {
    this.logger.debug('Checking for due tasks...');

    try {
      // Find tasks that are due now or in the past and not completed
      // Only use columns that are guaranteed to exist
      const dueTasks = await this.taskRepository.find({
        where: {
          dueDate: LessThanOrEqual(new Date()),
          status: Not(TaskStatus.COMPLETED),
          isArchived: false,
          needsReminder: true,
        },
        relations: ['project', 'tags'],
      });

      if (dueTasks.length > 0) {
        this.logger.log(`Found ${dueTasks.length} due tasks to process`);

        // Process each due task
        for (const task of dueTasks) {
          await this.processTask(task);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking due tasks: ${error.message}`,
        error.stack,
      );

      // Fallback approach if the query fails
      try {
        this.logger.log('Trying fallback approach with simpler query');
        // Use a simpler query without potentially missing columns
        const simpleTasks = await this.taskRepository
          .createQueryBuilder('task')
          .where('task.dueDate <= :now', { now: new Date() })
          .andWhere('task.status != :status', { status: TaskStatus.COMPLETED })
          .andWhere('task.isArchived = :archived', { archived: false })
          .andWhere('task.needsReminder = :reminder', { reminder: true })
          .leftJoinAndSelect('task.project', 'project')
          .leftJoinAndSelect('task.tags', 'tags')
          .getMany();

        if (simpleTasks.length > 0) {
          this.logger.log(
            `Found ${simpleTasks.length} due tasks to process using fallback approach`,
          );

          // Process each due task
          for (const task of simpleTasks) {
            await this.processTask(task);
          }
        }
      } catch (fallbackError) {
        this.logger.error(
          `Fallback approach also failed: ${fallbackError.message}`,
          fallbackError.stack,
        );
      }
    }
  }

  /**
   * Process a due task - send notification and handle recurrence
   */
  private async processTask(task: Task): Promise<void> {
    try {
      // Get user email and timezone (in a real app, you'd get these from user records)
      const userEmail = 'rafael.dev.test@icloud.com'; // Placeholder - would come from user record
      const userTimezone = 'America/New_York'; // Placeholder - would come from user preferences

      // Only send notification if the task needs a reminder
      if (task.needsReminder) {
        // Send notification for the task
        await this.notificationService.sendTaskNotification(
          task,
          userEmail,
          userTimezone,
        );
      }

      // Handle recurring tasks using the domain service
      // Check for isRecurring first, then fall back to recurrenceRule if the column exists
      if (task.isRecurring || task.recurrenceRule) {
        await this.scheduleNextOccurrence(task);
      }
    } catch (error) {
      this.logger.error(
        `Error processing task ${task.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Schedule the next occurrence of a recurring task
   */
  private async scheduleNextOccurrence(task: Task): Promise<void> {
    try {
      // Use the domain service to calculate the next occurrence
      const nextOccurrence =
        this.taskDomainService.calculateNextOccurrence(task);

      if (nextOccurrence) {
        // Update the task with the new due date
        task.nextDueDate = nextOccurrence;
        await this.taskRepository.save(task);

        this.logger.log(
          `Scheduled next occurrence of task ${task.id} for ${nextOccurrence.toISOString()}`,
        );
      } else {
        // No more occurrences, mark task as completed
        task.status = TaskStatus.COMPLETED;
        task.completedAt = new Date();
        await this.taskRepository.save(task);

        this.logger.log(
          `No more occurrences for recurring task ${task.id}, marked as completed`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error scheduling next occurrence for task ${task.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update due dates for recurring tasks
   * Used for maintenance and fixing issues with scheduled tasks
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateRecurringTasksDueDates(): Promise<void> {
    try {
      // Find all recurring tasks that don't have nextDueDate set
      // Use isRecurring as the primary check, fall back to recurrenceRule
      // Avoid using nextDueDate in the where clause directly to prevent errors
      const recurringTasks = await this.taskRepository.find({
        where: [
          {
            isRecurring: true,
            status: Not(TaskStatus.COMPLETED),
            isArchived: false,
          },
          {
            recurrenceRule: Not(IsNull()),
            status: Not(TaskStatus.COMPLETED),
            isArchived: false,
          },
        ],
      });

      // Filter tasks that don't have nextDueDate set
      const tasksNeedingUpdate = recurringTasks.filter(
        (task) => !task.nextDueDate,
      );

      if (tasksNeedingUpdate.length > 0) {
        this.logger.log(
          `Found ${tasksNeedingUpdate.length} recurring tasks that need nextDueDate to be set`,
        );

        // Update each task
        for (const task of tasksNeedingUpdate) {
          await this.scheduleNextOccurrence(task);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error updating recurring tasks: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check for due reminders every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkReminders() {
    this.logger.debug('Checking for scheduled reminders...');

    try {
      // Find tasks where reminder is due and not yet sent
      const reminderTasks = await this.taskRepository.find({
        where: {
          needsReminder: true,
          reminderAt: LessThanOrEqual(new Date()),
          reminderSentAt: IsNull(),
          isArchived: false,
          status: Not(TaskStatus.COMPLETED),
        },
        relations: ['project', 'tags'],
      });

      if (reminderTasks.length > 0) {
        this.logger.log(`Found ${reminderTasks.length} reminders to process`);
        for (const task of reminderTasks) {
          await this.processReminder(task);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking reminders: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Process a due reminder - send notification and mark as sent
   */
  private async processReminder(task: Task): Promise<void> {
    try {
      const userEmail = 'rafael.dev.test@icloud.com'; // Placeholder
      const userTimezone = 'America/New_York'; // Placeholder

      await this.notificationService.sendTaskNotification(
        task,
        userEmail,
        userTimezone,
      );

      // Mark reminder as sent
      task.reminderSentAt = new Date();
      await this.taskRepository.save(task);
      this.logger.log(`Reminder sent for task ${task.id}`);
    } catch (error) {
      this.logger.error(
        `Error processing reminder for task ${task.id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
