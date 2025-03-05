import { Injectable } from '@nestjs/common';
import { Task, TaskStatus } from '../tasks.entity';
import { CreateTaskDto } from '../tasks.dto';
import { TaskAggregate } from '../aggregates/task.aggregate';
import { Tag } from '../../tags/tags.entity';
import { Project } from '../../projects/projects.entity';

/**
 * TaskFactory is responsible for creating Task entities and aggregates.
 * It encapsulates the creation logic and ensures that entities are created with valid state.
 */
@Injectable()
export class TaskFactory {
  /**
   * Create a new Task entity from a DTO
   * @param createTaskDto DTO containing task data
   * @returns A new Task entity
   */
  createTask(createTaskDto: CreateTaskDto): Task {
    const task = new Task();
    task.title = createTaskDto.title;
    task.description = createTaskDto.description || null;
    task.status = TaskStatus.NOT_STARTED;
    task.priority = createTaskDto.priority || null;
    task.dueDate = createTaskDto.dueDate
      ? new Date(createTaskDto.dueDate)
      : null;
    task.hasTime = createTaskDto.hasTime || false;
    task.needsReminder = createTaskDto.needsReminder || false;
    task.reminderMessage = createTaskDto.reminderMessage || null;
    task.recurrenceRule = createTaskDto.recurrenceRule || null;
    task.isRecurring = createTaskDto.isRecurring || false;
    task.recurrencePattern = createTaskDto.recurrencePattern || null;
    task.recurrenceDays = createTaskDto.recurrenceDays || null;
    task.recurrenceTimeOfDay = createTaskDto.recurrenceTimeOfDay || null;
    task.recurrenceTime = createTaskDto.recurrenceTime || null;
    task.nextDueDate = createTaskDto.nextDueDate
      ? new Date(createTaskDto.nextDueDate)
      : null;
    task.recurringParentId = createTaskDto.recurringParentId || null;

    return task;
  }

  /**
   * Create a standard task
   * @param title The task title
   * @param description Optional task description
   * @param dueDate Optional due date
   * @returns A new Task entity
   */
  createStandardTask(
    title: string,
    description?: string,
    dueDate?: Date,
  ): Task {
    const task = new Task();
    task.title = title;
    task.description = description || null;
    task.status = TaskStatus.NOT_STARTED;
    task.dueDate = dueDate || null;
    task.hasTime = dueDate ? true : false;
    task.needsReminder = false;
    task.isRecurring = false;

    return task;
  }

  /**
   * Create a task with a reminder
   * @param title The reminder title
   * @param dueDate The reminder due date (required)
   * @param reminderMessage Optional message for the reminder
   * @param recurrenceRule Optional recurrence rule for recurring reminders
   * @returns A new Task entity
   */
  createReminderTask(
    title: string,
    dueDate: Date,
    reminderMessage?: string,
    recurrenceRule?: string,
  ): Task {
    const task = new Task();
    task.title = title;
    task.description = null;
    task.status = TaskStatus.NOT_STARTED;
    task.dueDate = dueDate;
    task.hasTime = true;
    task.needsReminder = true;
    task.reminderMessage = reminderMessage || null;
    task.recurrenceRule = recurrenceRule || null;
    task.isRecurring = !!recurrenceRule;

    return task;
  }

  /**
   * Create a TaskAggregate from a Task entity
   * @param task The task entity
   * @returns A new TaskAggregate
   */
  createAggregate(task: Task): TaskAggregate {
    return new TaskAggregate(task);
  }
}
