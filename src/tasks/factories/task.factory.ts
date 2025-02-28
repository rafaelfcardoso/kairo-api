import { Injectable } from '@nestjs/common';
import { Task, TaskType, TaskStatus } from '../tasks.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { TaskAggregate } from '../aggregates/task.aggregate';

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
    // Create the task entity
    const task = new Task();
    task.title = createTaskDto.title;
    task.description = createTaskDto.description || '';
    task.taskType = createTaskDto.taskType || TaskType.STANDARD;

    // Handle status (instead of done)
    if (createTaskDto.done) {
      task.status = TaskStatus.COMPLETED;
    }

    // Handle archived
    if (createTaskDto.archived) {
      task.isArchived = createTaskDto.archived;
    }

    // Handle reminder properties
    task.needsReminder = createTaskDto.needsReminder || false;
    task.reminderMessage = createTaskDto.reminderMessage || null;

    // Set due date if provided
    if (createTaskDto.dueDate) {
      task.dueDate = createTaskDto.dueDate;
      // If this is a reminder, it should have a time
      if (task.needsReminder) {
        task.hasTime = true;
      }
    }

    // Set recurrence rule if provided
    if (createTaskDto.recurrenceRule) {
      task.recurrenceRule = createTaskDto.recurrenceRule;
    }

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
    task.description = description || '';
    task.taskType = TaskType.STANDARD;

    if (dueDate) {
      task.dueDate = dueDate;
    }

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
    if (!dueDate) {
      throw new Error('Due date is required for reminder tasks');
    }

    const task = new Task();
    task.title = title;
    task.description = '';
    task.taskType = TaskType.STANDARD;
    task.dueDate = dueDate;
    task.hasTime = true;
    task.needsReminder = true;
    task.reminderMessage = reminderMessage || null;

    if (recurrenceRule) {
      task.recurrenceRule = recurrenceRule;
    }

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
