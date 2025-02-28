import { Injectable, Logger } from '@nestjs/common';
import { RRule } from 'rrule';
import * as moment from 'moment-timezone';
import { Task, TaskStatus, TaskType } from './tasks.entity';

/**
 * TaskDomainService handles core domain logic related to tasks.
 * It encapsulates business rules and complex operations on tasks.
 */
@Injectable()
export class TaskDomainService {
  private readonly logger = new Logger(TaskDomainService.name);

  /**
   * Calculate the next occurrence date for a recurring task
   * @param task The task to calculate the next occurrence for
   * @param fromDate The date to calculate from (defaults to now)
   * @returns The next occurrence date or null if not recurring
   */
  calculateNextOccurrence(
    task: Task,
    fromDate: Date = new Date(),
  ): Date | null {
    try {
      // If task is not recurring, return null
      if (!task.recurrenceRule) {
        return null;
      }

      // Use the RRule library to calculate the next occurrence
      const rrule = RRule.fromString(task.recurrenceRule);

      // Get all occurrences after fromDate (limited to just the next one)
      const nextDates = rrule.after(fromDate, true);

      // If we got a next date, return it
      if (nextDates) {
        return nextDates;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error calculating next occurrence for task ${task.id}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Check if a task is due now or overdue
   * @param task The task to check
   * @returns True if the task is due now or overdue
   */
  isTaskDue(task: Task): boolean {
    // Task without due date is never due
    if (!task.dueDate) {
      return false;
    }

    // Completed tasks are never due
    if (task.status === TaskStatus.COMPLETED) {
      return false;
    }

    // Archived tasks are never due
    if (task.isArchived) {
      return false;
    }

    const now = new Date();
    return task.dueDate <= now;
  }

  /**
   * Get tasks that need reminders
   * @param tasks List of tasks to check
   * @returns Tasks that need reminders
   */
  getTasksNeedingReminders(tasks: Task[]): Task[] {
    return tasks.filter(
      (task) =>
        task.needsReminder &&
        this.isTaskDue(task) &&
        task.status !== TaskStatus.COMPLETED &&
        !task.isArchived,
    );
  }

  /**
   * Complete a task and calculate next occurrence if it's recurring
   * @param task The task to complete
   * @returns The updated task and the next task if recurring
   */
  completeTask(task: Task): { updatedTask: Task; nextTask?: Task } {
    // Mark the task as completed
    task.status = TaskStatus.COMPLETED;

    // If the task is not recurring, just return the updated task
    if (!task.recurrenceRule) {
      return { updatedTask: task };
    }

    // If the task is recurring, we need to create a new task for the next occurrence
    const nextDate = this.calculateNextOccurrence(task);
    if (!nextDate) {
      return { updatedTask: task };
    }

    // Create the next task
    const nextTask = this.createNextOccurrence(task, nextDate);

    return { updatedTask: task, nextTask };
  }

  /**
   * Create a new task for the next occurrence of a recurring task
   * @param task The original task
   * @param nextDate The next occurrence date
   * @returns A new task for the next occurrence
   */
  private createNextOccurrence(task: Task, nextDate: Date): Task {
    const nextTask = new Task();

    // Copy properties from the original task
    nextTask.title = task.title;
    nextTask.description = task.description;
    nextTask.taskType = task.taskType;
    nextTask.priority = task.priority;
    nextTask.recurrenceRule = task.recurrenceRule;
    nextTask.hasTime = task.hasTime;
    nextTask.needsReminder = task.needsReminder;
    nextTask.reminderMessage = task.reminderMessage;

    // Set the due date to the next occurrence
    nextTask.dueDate = nextDate;

    // If the original task has a project, copy it
    if (task.project) {
      nextTask.project = task.project;
    }

    return nextTask;
  }

  /**
   * Determine the appropriate notification type based on task properties
   * @param task The task to determine notification type for
   * @returns The notification type as a string
   */
  determineNotificationType(task: Task): string {
    if (task.needsReminder) {
      return 'reminder';
    }
    return 'standard';
  }

  /**
   * Create a recurrence rule string from a common pattern
   * @param pattern A common recurrence pattern (e.g., 'daily', 'weekly', 'monthly')
   * @returns A recurrence rule string
   */
  createRecurrenceRule(pattern: string): string {
    try {
      let rule: RRule;

      // Convert common patterns to RRule
      switch (pattern.toLowerCase()) {
        case 'daily':
          rule = new RRule({ freq: RRule.DAILY });
          break;
        case 'weekly':
          rule = new RRule({ freq: RRule.WEEKLY });
          break;
        case 'monthly':
          rule = new RRule({ freq: RRule.MONTHLY });
          break;
        default:
          throw new Error(`Unknown recurrence pattern: ${pattern}`);
      }

      return rule.toString();
    } catch (error) {
      this.logger.error(
        `Failed to create recurrence rule from pattern '${pattern}': ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Format a due date in a user-friendly way
   * @param dueDate The due date to format
   * @param timezone The user's timezone (defaults to UTC)
   * @returns A formatted string representing the due date
   */
  formatDueDate(dueDate: Date, timezone: string = 'UTC'): string {
    return moment(dueDate).tz(timezone).format('MMMM D, YYYY [at] h:mm A z');
  }

  /**
   * Determine if a task can be completed based on its state
   * @param task The task to check
   * @returns True if the task can be completed
   */
  canCompleteTask(task: Task): boolean {
    // A task can be completed if it's not already completed
    return !task.isCompleted;
  }

  /**
   * Get upcoming occurrences for a recurring task
   * @param task The recurring task
   * @param count The number of occurrences to get
   * @returns An array of upcoming occurrence dates
   */
  getUpcomingOccurrences(task: Task, count: number = 5): Date[] {
    if (!task.recurrenceRule) {
      return [];
    }

    try {
      const rrule = RRule.fromString(task.recurrenceRule);

      // Get next "count" occurrences from now
      const now = new Date();
      const oneYearFromNow = new Date(
        now.getTime() + 365 * 24 * 60 * 60 * 1000,
      ); // 1 year from now

      // Get occurrences between now and one year from now
      const occurrences = rrule.between(now, oneYearFromNow, true);

      // Return only the requested number of occurrences
      return occurrences.slice(0, count);
    } catch (error) {
      this.logger.error(
        `Failed to get upcoming occurrences for task ${task.id}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
}
