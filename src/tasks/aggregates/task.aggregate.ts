import { Task, TaskStatus, TaskType } from '../tasks.entity';
import { RecurrenceRule } from '../value-objects/recurrence-rule.value-object';
import { Tag } from '../../tags/tags.entity';

/**
 * TaskAggregate is the aggregate root for the Task domain.
 * It encapsulates all operations on a Task entity and enforces business invariants.
 */
export class TaskAggregate {
  private task: Task;

  constructor(task: Task) {
    this.task = task;
  }

  /**
   * Get the underlying Task entity
   */
  getTask(): Task {
    return this.task;
  }

  /**
   * Mark a task as completed
   * @returns The updated task
   * @throws Error if the task is already completed
   */
  complete(): Task {
    if (this.task.isCompleted) {
      throw new Error(`Task ${this.task.id} is already completed`);
    }

    this.task.status = TaskStatus.COMPLETED;
    return this.task;
  }

  /**
   * Reopen a completed task
   * @returns The updated task
   * @throws Error if the task is not completed
   */
  reopen(): Task {
    if (!this.task.isCompleted) {
      throw new Error(`Task ${this.task.id} is not completed`);
    }

    this.task.status = TaskStatus.NOT_STARTED;
    return this.task;
  }

  /**
   * Archive a task
   * @returns The updated task
   * @throws Error if the task is already archived
   */
  archive(): Task {
    if (this.task.isArchived) {
      throw new Error(`Task ${this.task.id} is already archived`);
    }

    this.task.isArchived = true;
    return this.task;
  }

  /**
   * Unarchive a task
   * @returns The updated task
   * @throws Error if the task is not archived
   */
  unarchive(): Task {
    if (!this.task.isArchived) {
      throw new Error(`Task ${this.task.id} is not archived`);
    }

    this.task.isArchived = false;
    return this.task;
  }

  /**
   * Make a task recurring with the specified recurrence rule
   * @param recurrenceRuleStr A string representing the recurrence rule
   * @returns The updated task
   */
  makeRecurring(recurrenceRuleStr: string): Task {
    // Validate the recurrence rule by attempting to create a RecurrenceRule value object
    new RecurrenceRule(recurrenceRuleStr);

    this.task.recurrenceRule = recurrenceRuleStr;
    return this.task;
  }

  /**
   * Stop a task from recurring
   * @returns The updated task
   * @throws Error if the task is not recurring
   */
  stopRecurring(): Task {
    if (!this.task.recurrenceRule) {
      throw new Error(`Task ${this.task.id} is not recurring`);
    }

    this.task.recurrenceRule = null;
    this.task.nextDueDate = null;
    return this.task;
  }

  /**
   * Set the next due date for a recurring task
   * @param nextDueDate The next due date
   * @returns The updated task
   * @throws Error if the task is not recurring
   */
  setNextDueDate(nextDueDate: Date): Task {
    if (!this.task.recurrenceRule) {
      throw new Error(`Task ${this.task.id} is not recurring`);
    }

    this.task.nextDueDate = nextDueDate;
    return this.task;
  }

  /**
   * Start working on a task
   * @returns The updated task
   * @throws Error if the task is already in progress or completed
   */
  startWorking(): Task {
    if (this.task.status === TaskStatus.IN_PROGRESS) {
      throw new Error(`Task ${this.task.id} is already in progress`);
    }

    if (this.task.isCompleted) {
      throw new Error(`Task ${this.task.id} is already completed`);
    }

    this.task.status = TaskStatus.IN_PROGRESS;
    return this.task;
  }

  /**
   * Mark a task as blocked
   * @param reason Optional reason why the task is blocked
   * @returns The updated task
   */
  block(reason?: string): Task {
    if (this.task.status === TaskStatus.BLOCKED) {
      throw new Error(`Task ${this.task.id} is already blocked`);
    }

    this.task.status = TaskStatus.BLOCKED;
    if (reason) {
      this.task.description = this.task.description
        ? `${this.task.description}\n\nBLOCKED: ${reason}`
        : `BLOCKED: ${reason}`;
    }
    return this.task;
  }

  /**
   * Convert a task to a specific task type
   * @param taskType The new task type
   * @returns The updated task
   */
  convertToType(taskType: TaskType): Task {
    if (this.task.taskType === taskType) {
      return this.task;
    }

    this.task.taskType = taskType;
    return this.task;
  }

  /**
   * Check if this task has a specific tag
   * @param tagId The tag ID to check for
   * @returns True if the task has the tag
   */
  hasTag(tagId: string): boolean {
    return this.task.tags?.some((tag) => tag.id === tagId) || false;
  }

  /**
   * Add tags to this task
   * @param tags The tags to add
   * @returns The updated task
   */
  addTags(tags: Tag[]): Task {
    if (!this.task.tags) {
      this.task.tags = [];
    }

    const existingTagIds = new Set(this.task.tags.map((tag) => tag.id));

    for (const tag of tags) {
      if (!existingTagIds.has(tag.id)) {
        this.task.tags.push(tag);
        existingTagIds.add(tag.id);
      }
    }

    return this.task;
  }

  /**
   * Remove tags from this task
   * @param tagIds The tag IDs to remove
   * @returns The updated task
   */
  removeTags(tagIds: string[]): Task {
    if (!this.task.tags || this.task.tags.length === 0) {
      return this.task;
    }

    const tagIdSet = new Set(tagIds);
    this.task.tags = this.task.tags.filter((tag) => !tagIdSet.has(tag.id));
    return this.task;
  }
}
