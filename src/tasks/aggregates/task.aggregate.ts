import { Task, TaskStatus } from '../tasks.entity';
import { Tag } from '../../tags/tags.entity';
import { Logger } from '@nestjs/common';

/**
 * Aggregate root for Task entity
 * Encapsulates business logic and domain rules for tasks
 */
export class TaskAggregate {
  private task: Task;
  private readonly logger = new Logger(TaskAggregate.name);

  constructor(task: Task) {
    this.task = task;
  }

  /**
   * Get the underlying task entity
   * @returns The task entity
   */
  getTask(): Task {
    return this.task;
  }

  /**
   * Mark the task as completed
   * @returns The updated task
   */
  complete(): Task {
    if (this.task.status === TaskStatus.COMPLETED) {
      return this.task;
    }

    this.task.status = TaskStatus.COMPLETED;
    this.task.updatedAt = new Date();
    this.task.completedAt = new Date();

    return this.task;
  }

  /**
   * Reopen a completed task
   * @returns The updated task
   */
  reopen(): Task {
    if (this.task.status !== TaskStatus.COMPLETED) {
      return this.task;
    }

    this.task.status = TaskStatus.NOT_STARTED;
    this.task.updatedAt = new Date();

    return this.task;
  }

  /**
   * Archive a task
   * @returns The updated task
   */
  archive(): Task {
    if (this.task.isArchived) {
      return this.task;
    }

    this.task.isArchived = true;
    this.task.updatedAt = new Date();

    return this.task;
  }

  /**
   * Unarchive a task
   * @returns The updated task
   */
  unarchive(): Task {
    if (!this.task.isArchived) {
      return this.task;
    }

    this.task.isArchived = false;
    this.task.updatedAt = new Date();

    return this.task;
  }

  /**
   * Make a task recurring
   * @param recurrenceRuleStr The recurrence rule in iCalendar format
   * @returns The updated task
   */
  makeRecurring(recurrenceRuleStr: string): Task {
    this.task.recurrenceRule = recurrenceRuleStr;
    this.task.isRecurring = true;
    this.task.updatedAt = new Date();

    return this.task;
  }

  /**
   * Stop a task from recurring
   * @returns The updated task
   */
  stopRecurring(): Task {
    if (!this.task.isRecurring) {
      return this.task;
    }

    this.task.recurrenceRule = null;
    this.task.isRecurring = false;
    this.task.nextDueDate = null;
    this.task.updatedAt = new Date();

    return this.task;
  }

  /**
   * Set the next due date for a recurring task
   * @param nextDueDate The next due date
   * @returns The updated task
   */
  setNextDueDate(nextDueDate: Date): Task {
    if (!this.task.isRecurring) {
      this.logger.warn(
        `Attempted to set next due date for non-recurring task ${this.task.id}`,
      );
      return this.task;
    }

    this.task.nextDueDate = nextDueDate;
    this.task.updatedAt = new Date();

    return this.task;
  }

  /**
   * Mark the task as in progress
   * @returns The updated task
   */
  startWorking(): Task {
    if (this.task.status === TaskStatus.IN_PROGRESS) {
      return this.task;
    }

    if (this.task.status === TaskStatus.COMPLETED) {
      this.logger.warn(
        `Attempted to start working on completed task ${this.task.id}`,
      );
      return this.task;
    }

    this.task.status = TaskStatus.IN_PROGRESS;
    this.task.updatedAt = new Date();

    return this.task;
  }

  /**
   * Mark the task as blocked
   * @param reason Optional reason for the block
   * @returns The updated task
   */
  block(reason?: string): Task {
    if (this.task.status === TaskStatus.BLOCKED) {
      return this.task;
    }

    if (this.task.status === TaskStatus.COMPLETED) {
      this.logger.warn(`Attempted to block completed task ${this.task.id}`);
      return this.task;
    }

    this.task.status = TaskStatus.BLOCKED;
    if (reason) {
      this.task.description = this.task.description
        ? `${this.task.description}\n\nBLOCKED: ${reason}`
        : `BLOCKED: ${reason}`;
    }
    this.task.updatedAt = new Date();

    return this.task;
  }

  /**
   * Check if the task has a specific tag
   * @param tagId The tag ID to check
   * @returns True if the task has the tag
   */
  hasTag(tagId: string): boolean {
    if (!this.task.tags) {
      return false;
    }
    return this.task.tags.some((tag) => tag.id === tagId);
  }

  /**
   * Add tags to the task
   * @param tags The tags to add
   * @returns The updated task
   */
  addTags(tags: Tag[]): Task {
    if (!this.task.tags) {
      this.task.tags = [];
    }

    // Filter out tags that are already on the task
    const newTags = tags.filter((tag) => !this.hasTag(tag.id));

    if (newTags.length === 0) {
      return this.task;
    }

    this.task.tags = [...this.task.tags, ...newTags];
    this.task.updatedAt = new Date();

    return this.task;
  }

  /**
   * Remove tags from the task
   * @param tagIds The tag IDs to remove
   * @returns The updated task
   */
  removeTags(tagIds: string[]): Task {
    if (!this.task.tags || this.task.tags.length === 0) {
      return this.task;
    }

    const originalCount = this.task.tags.length;
    this.task.tags = this.task.tags.filter((tag) => !tagIds.includes(tag.id));

    if (this.task.tags.length !== originalCount) {
      this.task.updatedAt = new Date();
    }

    return this.task;
  }
}
