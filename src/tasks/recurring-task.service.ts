import { Injectable, Logger } from '@nestjs/common';
import {
  Task,
  RecurrencePattern,
  RecurrenceTimeOfDay,
  TaskStatus,
} from './tasks.entity';
import { TasksRepository } from './tasks.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateTaskDto } from './tasks.dto';
import { TaskFactory } from './factories/task.factory';

/**
 * Service that handles the logic for recurring tasks
 */
@Injectable()
export class RecurringTaskService {
  private readonly logger = new Logger(RecurringTaskService.name);

  constructor(
    @InjectRepository(TasksRepository)
    private tasksRepository: TasksRepository,
    private taskFactory: TaskFactory,
  ) {}

  /**
   * Calculate the next occurrence date based on recurrence pattern
   * @param dueDate The due date of the task
   * @param recurrenceRule The recurrence rule string
   * @returns The date of the next occurrence
   */
  calculateNextOccurrence(dueDate: Date, recurrenceRule: string): Date {
    const now = new Date();
    const nextDate = new Date(now);

    // Fix any malformed recurrence rule
    recurrenceRule = this.fixRecurrenceRule(recurrenceRule);

    // Extract recurrence pattern from the rule
    const recurrencePattern = this.extractRecurrencePattern(recurrenceRule);
    const recurrenceDays = this.extractRecurrenceDays(recurrenceRule);

    if (!recurrencePattern) {
      this.logger.error(
        `Could not extract recurrence pattern from rule: ${recurrenceRule}`,
      );
      // Just set it to tomorrow as a fallback
      nextDate.setDate(nextDate.getDate() + 1);
      return nextDate;
    }

    // Parse the recurrence pattern
    switch (recurrencePattern) {
      case RecurrencePattern.DAILY:
        // Set next date to tomorrow, same time
        nextDate.setDate(nextDate.getDate() + 1);
        break;

      case RecurrencePattern.WEEKLY:
        if (!recurrenceDays) {
          // If no specific days, set to same day next week
          nextDate.setDate(nextDate.getDate() + 7);
        } else {
          // Get days of the week
          const days = recurrenceDays.split(',');
          const dayMap = {
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6,
            sunday: 0,
          };

          // Get current day of week (0-6, 0 is Sunday)
          const currentDay = now.getDay();

          // Find the next day in the list
          let nextDay = -1;
          for (const day of days) {
            const dayNum = dayMap[day.toLowerCase()];
            if (dayNum > currentDay) {
              nextDay = dayNum;
              break;
            }
          }

          // If no day found, use the first day in the list (for next week)
          if (nextDay === -1) {
            nextDay = dayMap[days[0].toLowerCase()];
            // Add days until we reach the next occurrence
            const daysToAdd = 7 - currentDay + nextDay;
            nextDate.setDate(nextDate.getDate() + daysToAdd);
          } else {
            // Add days until we reach the next occurrence
            const daysToAdd = nextDay - currentDay;
            nextDate.setDate(nextDate.getDate() + daysToAdd);
          }
        }
        break;

      case RecurrencePattern.MONTHLY:
        // Set to same day next month
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;

      case RecurrencePattern.YEARLY:
        // Set to same day next year
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;

      default:
        // Default to daily
        nextDate.setDate(nextDate.getDate() + 1);
    }

    // Set the time portion based on recurrence time
    const recurrenceTimeOfDay = this.extractRecurrenceTimeOfDay(recurrenceRule);
    const recurrenceTime = this.extractRecurrenceTime(recurrenceRule);
    this.setRecurrenceTime(nextDate, recurrenceTimeOfDay, recurrenceTime);

    return nextDate;
  }

  /**
   * Fix common issues with recurrence rules
   * @param recurrenceRule The recurrence rule string to fix
   * @returns The fixed recurrence rule string
   */
  private fixRecurrenceRule(recurrenceRule: string): string {
    if (!recurrenceRule) return recurrenceRule;

    // Fix missing semicolon between FREQ=DAILY and INTERVAL=
    if (recurrenceRule.includes('FREQ=DAILYINTERVAL=')) {
      return recurrenceRule.replace(
        'FREQ=DAILYINTERVAL=',
        'FREQ=DAILY;INTERVAL=',
      );
    }

    return recurrenceRule;
  }

  /**
   * Extract recurrence pattern from a recurrence rule string
   * @param recurrenceRule The recurrence rule string
   * @returns The recurrence pattern or null if not found
   */
  private extractRecurrencePattern(
    recurrenceRule: string,
  ): RecurrencePattern | null {
    if (!recurrenceRule) return null;

    // Fix common formatting issue where semicolon is missing
    if (recurrenceRule.includes('FREQ=DAILYINTERVAL=')) {
      // This is a malformed rule, but we can still extract the pattern
      return RecurrencePattern.DAILY;
    }

    if (recurrenceRule.includes('FREQ=DAILY')) {
      return RecurrencePattern.DAILY;
    } else if (recurrenceRule.includes('FREQ=WEEKLY')) {
      return RecurrencePattern.WEEKLY;
    } else if (recurrenceRule.includes('FREQ=MONTHLY')) {
      return RecurrencePattern.MONTHLY;
    } else if (recurrenceRule.includes('FREQ=YEARLY')) {
      return RecurrencePattern.YEARLY;
    }

    return null;
  }

  /**
   * Extract recurrence days from a recurrence rule string
   * @param recurrenceRule The recurrence rule string
   * @returns The recurrence days string or null if not found
   */
  private extractRecurrenceDays(recurrenceRule: string): string | null {
    if (!recurrenceRule) return null;

    const match = recurrenceRule.match(/BYDAY=([^;]+)/);
    if (match && match[1]) {
      // Convert SU,MO,TU to sunday,monday,tuesday
      const dayMap = {
        SU: 'sunday',
        MO: 'monday',
        TU: 'tuesday',
        WE: 'wednesday',
        TH: 'thursday',
        FR: 'friday',
        SA: 'saturday',
      };

      return match[1]
        .split(',')
        .map((day) => dayMap[day] || day)
        .join(',');
    }

    return null;
  }

  /**
   * Extract recurrence time of day from a recurrence rule string
   * @param recurrenceRule The recurrence rule string
   * @returns The recurrence time of day or null if not found
   */
  private extractRecurrenceTimeOfDay(
    recurrenceRule: string,
  ): RecurrenceTimeOfDay | null {
    if (!recurrenceRule) return null;

    // Check for time indicators in the rule
    const hourMatch = recurrenceRule.match(/BYHOUR=(\d+)/);
    if (hourMatch && hourMatch[1]) {
      const hour = parseInt(hourMatch[1], 10);
      if (hour >= 5 && hour < 12) {
        return RecurrenceTimeOfDay.MORNING;
      } else if (hour >= 12 && hour < 17) {
        return RecurrenceTimeOfDay.AFTERNOON;
      } else if (hour >= 17 && hour < 24) {
        return RecurrenceTimeOfDay.EVENING;
      }
    }

    return RecurrenceTimeOfDay.CUSTOM;
  }

  /**
   * Extract recurrence time from a recurrence rule string
   * @param recurrenceRule The recurrence rule string
   * @returns The recurrence time string or null if not found
   */
  private extractRecurrenceTime(recurrenceRule: string): string | null {
    if (!recurrenceRule) return null;

    const hourMatch = recurrenceRule.match(/BYHOUR=(\d+)/);
    const minuteMatch = recurrenceRule.match(/BYMINUTE=(\d+)/);

    if (hourMatch && hourMatch[1]) {
      const hour = parseInt(hourMatch[1], 10);
      const minute =
        minuteMatch && minuteMatch[1] ? parseInt(minuteMatch[1], 10) : 0;

      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    return null;
  }

  /**
   * Set the time portion of a date based on recurrence time
   * @param date The date to modify
   * @param recurrenceTimeOfDay The time of day setting
   * @param recurrenceTime The specific time string (HH:MM)
   */
  private setRecurrenceTime(
    date: Date,
    recurrenceTimeOfDay: RecurrenceTimeOfDay | null,
    recurrenceTime: string | null,
  ): void {
    if (recurrenceTime) {
      // Parse HH:MM format
      const [hours, minutes] = recurrenceTime.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
      return;
    }

    // Set time based on time of day
    switch (recurrenceTimeOfDay) {
      case RecurrenceTimeOfDay.MORNING:
        date.setHours(9, 0, 0, 0);
        break;
      case RecurrenceTimeOfDay.AFTERNOON:
        date.setHours(14, 0, 0, 0);
        break;
      case RecurrenceTimeOfDay.EVENING:
        date.setHours(19, 0, 0, 0);
        break;
      default:
        // Keep the current time
        break;
    }
  }

  /**
   * Schedule the next occurrence of a recurring task
   * @param completedTask The completed task to schedule the next occurrence for
   * @returns The newly created task for the next occurrence
   */
  async scheduleNextRecurrence(completedTask: Task): Promise<Task> {
    try {
      const nextDate = this.calculateNextOccurrence(
        completedTask.dueDate,
        completedTask.recurrenceRule,
      );

      // Create a DTO for the next task
      const nextTaskDto: CreateTaskDto = {
        title: completedTask.title,
        description: completedTask.description,
        priority: completedTask.priority,
        dueDate: nextDate.toISOString(),
        hasTime: true, // Always set hasTime for recurring tasks
        needsReminder: completedTask.needsReminder,
        reminderMessage: completedTask.reminderMessage,
        isRecurring: true,
        recurrencePattern: completedTask.recurrencePattern,
        recurrenceDays: completedTask.recurrenceDays,
        recurrenceTimeOfDay: completedTask.recurrenceTimeOfDay,
        recurrenceTime: completedTask.recurrenceTime,
        recurringParentId: completedTask.recurringParentId || completedTask.id,
      };

      // If the task has a project, associate it
      if (completedTask.project) {
        nextTaskDto.projectId = completedTask.project.id;
      }

      // Create the next task
      const nextTask = await this.tasksRepository.createTask(nextTaskDto);

      this.logger.log(
        `Scheduled next occurrence of recurring task ${completedTask.id} for ${nextDate.toISOString()}`,
      );

      return nextTask;
    } catch (error) {
      this.logger.error(
        `Failed to schedule next occurrence of recurring task ${completedTask.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process a completed task, scheduling the next occurrence if it's a recurring task
   * @param task The completed task to process
   * @returns The next occurrence task if created, or null
   */
  async processCompletedTask(task: Task): Promise<Task | null> {
    if (!task.isRecurring) {
      return null;
    }

    return this.scheduleNextRecurrence(task);
  }

  /**
   * Creates a new task instance for the next occurrence of a recurring task
   * @param completedTask The completed recurring task
   * @returns The new task instance and the next occurrence date
   */
  async createNextTaskInstance(
    completedTask: Task,
  ): Promise<{ nextTask: Task; nextDate: Date }> {
    if (!completedTask.recurrenceRule) {
      throw new Error('Task is not recurring');
    }

    const nextDate = this.calculateNextOccurrence(
      completedTask.dueDate,
      completedTask.recurrenceRule,
    );

    if (!nextDate) {
      throw new Error('Could not calculate next occurrence');
    }

    // Create a new task for the next occurrence
    const nextTask = new Task();
    nextTask.title = completedTask.title;
    nextTask.description = completedTask.description;
    nextTask.priority = completedTask.priority;
    nextTask.status = TaskStatus.NOT_STARTED;
    nextTask.dueDate = nextDate;
    nextTask.hasTime = completedTask.hasTime;
    nextTask.needsReminder = completedTask.needsReminder;
    nextTask.reminderMessage = completedTask.reminderMessage;
    nextTask.recurrenceRule = completedTask.recurrenceRule;
    nextTask.isRecurring = true;
    nextTask.recurrencePattern = completedTask.recurrencePattern;
    nextTask.recurrenceDays = completedTask.recurrenceDays;
    nextTask.recurrenceTimeOfDay = completedTask.recurrenceTimeOfDay;
    nextTask.recurrenceTime = completedTask.recurrenceTime;

    // Copy project relationship
    if (completedTask.project) {
      nextTask.project = completedTask.project;
    }

    // Copy tags
    if (completedTask.tags && completedTask.tags.length > 0) {
      nextTask.tags = [...completedTask.tags];
    }

    return { nextTask, nextDate };
  }
}
