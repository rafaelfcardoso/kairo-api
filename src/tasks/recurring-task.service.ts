import { Injectable, Logger } from '@nestjs/common';
import { Task, RecurrencePattern, RecurrenceTimeOfDay } from './tasks.entity';
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
   * @param task The task to calculate the next occurrence for
   * @returns The date of the next occurrence
   */
  calculateNextOccurrence(task: Task): Date {
    const now = new Date();
    const nextDate = new Date(now);

    if (!task.recurrencePattern) {
      this.logger.error(`Task ${task.id} has no recurrence pattern`);
      // Just set it to tomorrow as a fallback
      nextDate.setDate(nextDate.getDate() + 1);
      return nextDate;
    }

    // Parse the recurrence pattern
    switch (task.recurrencePattern) {
      case RecurrencePattern.DAILY:
        // Set next date to tomorrow, same time
        nextDate.setDate(nextDate.getDate() + 1);
        break;

      case RecurrencePattern.WEEKLY:
        if (!task.recurrenceDays) {
          // If no specific days, set to same day next week
          nextDate.setDate(nextDate.getDate() + 7);
        } else {
          // Get days of the week
          const days = task.recurrenceDays.split(',');
          const dayMap = {
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6,
            sunday: 0,
          };

          // Find the next day in the list that is after today
          const today = now.getDay(); // 0-6, starting from Sunday
          let nextDay = -1;
          let daysToAdd = 7; // Default to one week if no match

          for (const day of days) {
            const dayNumber = dayMap[day.toLowerCase()];
            if (dayNumber === undefined) continue;

            const daysUntil = (dayNumber - today + 7) % 7;
            if (daysUntil > 0 && daysUntil < daysToAdd) {
              daysToAdd = daysUntil;
              nextDay = dayNumber;
            }
          }

          if (nextDay !== -1) {
            nextDate.setDate(nextDate.getDate() + daysToAdd);
          } else {
            // If no valid day found (or all days already passed this week), use the first day next week
            const firstDay = dayMap[days[0].toLowerCase()];
            if (firstDay !== undefined) {
              daysToAdd = (firstDay - today + 7) % 7;
              if (daysToAdd === 0) daysToAdd = 7; // Ensure we go to next week if it's the same day
              nextDate.setDate(nextDate.getDate() + daysToAdd);
            } else {
              // No valid days at all, default to one week from now
              nextDate.setDate(nextDate.getDate() + 7);
            }
          }
        }
        break;

      case RecurrencePattern.MONTHLY:
        // Set to the same day in the next month
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;

      case RecurrencePattern.YEARLY:
        // Set to the same day in the next year
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;

      default:
        // Default to daily
        nextDate.setDate(nextDate.getDate() + 1);
    }

    // Set the time portion based on recurrence time
    this.setRecurrenceTime(nextDate, task);

    return nextDate;
  }

  /**
   * Sets the time portion of the date based on the task's recurrence time settings
   * @param date The date to set the time on
   * @param task The task with the time settings
   */
  private setRecurrenceTime(date: Date, task: Task): void {
    if (
      task.recurrenceTime &&
      task.recurrenceTimeOfDay === RecurrenceTimeOfDay.CUSTOM
    ) {
      // Parse specific time like "08:00"
      const [hours, minutes] = task.recurrenceTime.split(':').map(Number);

      if (!isNaN(hours) && !isNaN(minutes)) {
        date.setHours(hours, minutes, 0, 0);
        return;
      }
    }

    // Use predefined times if no custom time or parsing failed
    switch (task.recurrenceTimeOfDay) {
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
        // Default to 9 AM
        date.setHours(9, 0, 0, 0);
    }
  }

  /**
   * Schedule the next occurrence of a recurring task
   * @param completedTask The completed task to schedule the next occurrence for
   * @returns The newly created task for the next occurrence
   */
  async scheduleNextRecurrence(completedTask: Task): Promise<Task> {
    try {
      const nextDate = this.calculateNextOccurrence(completedTask);

      // Create a DTO for the next task
      const nextTaskDto: CreateTaskDto = {
        title: completedTask.title,
        description: completedTask.description,
        priority: completedTask.priority,
        taskType: completedTask.taskType,
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
}
