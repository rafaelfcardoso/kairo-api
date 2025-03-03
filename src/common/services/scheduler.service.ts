import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private taskService: TaskService,
    private taskDomainService: TaskDomainService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Check for due tasks every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkDueTasks() {
    this.logger.debug('Checking for due tasks...');

    try {
      // Find tasks that are due now or in the past and not completed
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
      const recurringTasks = await this.taskRepository.find({
        where: [
          {
            isRecurring: true,
            nextDueDate: IsNull(),
            status: Not(TaskStatus.COMPLETED),
            isArchived: false,
          },
          {
            recurrenceRule: Not(IsNull()),
            nextDueDate: IsNull(),
            status: Not(TaskStatus.COMPLETED),
            isArchived: false,
          },
        ],
      });

      if (recurringTasks.length > 0) {
        this.logger.log(
          `Found ${recurringTasks.length} recurring tasks that need nextDueDate to be set`,
        );

        // Update each task
        for (const task of recurringTasks) {
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
}
