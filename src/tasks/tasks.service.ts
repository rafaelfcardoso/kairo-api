// src/services/task.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TasksRepository } from './tasks.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { TagsRepository } from '../tags/tags.repository';
import { Task, TaskStatus, TaskPriority } from './tasks.entity';
import { Project, ProjectType } from '../projects/projects.entity';
import { CreateTaskDto, UpdateTaskDto, TaskFilterDto } from './tasks.dto';
import { SecurityLoggerService } from '../common/services/security-logger.service';
import { RecurringTaskService } from './recurring-task.service';
import { TaskDomainService } from './tasks.domain.service';
import { NotificationDomainService } from './notification.domain.service';
import { LessThan, In } from 'typeorm';
import {
  CompleteOverdueTasksDto,
  CompleteOverdueTasksResponseDto,
  BatchCompleteTasksDto,
  BatchCompleteTasksResponseDto,
} from './dto/complete-overdue-tasks.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class TaskService {
  private readonly commandPatterns = [
    /rm\s+-rf/i,
    /shutdown/i,
    /format\s+[a-z]:/i,
    /drop\s+(?:database|table)/i,
    /delete\s+from/i,
    /;\s*--/i,
    /\$\(.*\)/,
    /`.*`/,
    /eval\s*\(/i,
    /exec\s*\(/i,
    /system\s*\(/i,
    /curl\s+/i,
    /wget\s+/i,
    /nc\s+/i,
    /netcat\s+/i,
  ];

  private readonly dangerousPatterns = [
    /<script>/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /onclick=/i,
    /data:/i,
    /base64/i,
    /alert\s*\(/i,
    /prompt\s*\(/i,
    /confirm\s*\(/i,
  ];

  constructor(
    @InjectRepository(TasksRepository)
    private tasksRepository: TasksRepository,
    @InjectRepository(ProjectsRepository)
    private projectsRepository: ProjectsRepository,
    private tagsRepository: TagsRepository,
    private securityLogger: SecurityLoggerService,
    private recurringTaskService: RecurringTaskService,
    private taskDomainService: TaskDomainService,
    private notificationDomainService: NotificationDomainService,
  ) {}

  private validateInput(input: string, context: string): void {
    // Check for null bytes
    if (input.includes('\0')) {
      this.securityLogger.logValidationFailure(input, 'Null byte detected', {
        context,
      });
      throw new BadRequestException('Invalid input: contains null bytes');
    }

    // Check for command injection attempts
    if (this.commandPatterns.some((pattern) => pattern.test(input))) {
      this.securityLogger.logValidationFailure(
        input,
        'Command pattern detected',
        { context },
      );
      throw new BadRequestException(
        'Invalid input: contains potentially dangerous commands',
      );
    }

    // Check for XSS attempts
    if (this.dangerousPatterns.some((pattern) => pattern.test(input))) {
      this.securityLogger.logValidationFailure(input, 'XSS pattern detected', {
        context,
      });
      throw new BadRequestException(
        'Invalid input: contains potentially dangerous patterns',
      );
    }

    // Validate length
    if (context === 'title' && input.length > 255) {
      this.securityLogger.logValidationFailure(
        input,
        'Title exceeds maximum length',
        { context, maxLength: 255 },
      );
      throw new BadRequestException('Title exceeds maximum length');
    }

    if (context === 'description' && input.length > 1000) {
      this.securityLogger.logValidationFailure(
        input,
        'Description exceeds maximum length',
        { context, maxLength: 1000 },
      );
      throw new BadRequestException('Description exceeds maximum length');
    }
  }

  private validateDate(date: string | null): void {
    if (date === null || date === undefined) return;

    try {
      // Validate that it's a proper ISO 8601 date first
      const isoRegex =
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?)?$/;
      if (!isoRegex.test(date)) {
        this.securityLogger.logValidationFailure(date, 'Invalid date format', {
          context: 'dueDate',
        });
        throw new BadRequestException('Invalid date format - must be ISO 8601');
      }

      // Then check if the date is in the past
      const taskDate = new Date(date);
      const now = new Date(Date.now()); // Use actual system time

      // Set both dates to midnight UTC for comparison
      const todayUTC = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      );
      const taskDateUTC = Date.UTC(
        taskDate.getUTCFullYear(),
        taskDate.getUTCMonth(),
        taskDate.getUTCDate(),
      );

      if (taskDateUTC < todayUTC) {
        this.securityLogger.logValidationFailure(
          date,
          'Past date not allowed',
          {
            context: 'dueDate',
          },
        );
        throw new BadRequestException('Due date cannot be in the past');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.securityLogger.logValidationFailure(date, 'Date parsing failed', {
        context: 'dueDate',
      });
      throw new BadRequestException('Invalid date format');
    }
  }

  // Helper method for ownership check
  private async checkTaskOwnership(
    taskId: string,
    userId: string,
  ): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with ID "${taskId}" not found`);
    }
    if (task.userId !== userId) {
      this.securityLogger.logSuspiciousActivity(
        'Ownership check failed',
        'HIGH',
        { taskId, attemptedByUserId: userId, ownerUserId: task.userId },
      );
      throw new ForbiddenException('You do not own this task');
    }
    return task;
  }

  async getTasks(filterDto: TaskFilterDto, userId: string): Promise<Task[]> {
    const userFilterDto = { ...filterDto, userId: userId };
    return this.tasksRepository.getTasks(userFilterDto);
  }

  async getTaskById(id: string, userId: string): Promise<Task> {
    const task = await this.tasksRepository.getTaskById(id);
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    if (task.userId !== userId) {
      this.securityLogger.logSuspiciousActivity(
        'Attempted to access unauthorized task',
        'HIGH',
        { taskId: id, attemptedByUserId: userId, ownerUserId: task.userId },
      );
      throw new ForbiddenException('You do not own this task');
    }
    return task;
  }

  async createTask(
    createTaskDto: CreateTaskDto,
    userId: string,
  ): Promise<Task> {
    const { title, description, dueDate, recurrenceRule, needsReminder } =
      createTaskDto;

    try {
      // Validate inputs
      this.validateInput(title, 'title');
      if (description) {
        this.validateInput(description, 'description');
      }
      if (dueDate !== undefined && dueDate !== null) {
        this.validateDate(dueDate);
      }

      // Fix malformed recurrence rule if present
      if (recurrenceRule && recurrenceRule.includes('FREQ=DAILYINTERVAL=')) {
        createTaskDto.recurrenceRule = recurrenceRule.replace(
          'FREQ=DAILYINTERVAL=',
          'FREQ=DAILY;INTERVAL=',
        );
      }

      // Pass userId to the repository method
      const savedTask = await this.tasksRepository.createTask(
        createTaskDto,
        userId,
      );

      // Schedule reminder if needed
      if (needsReminder && savedTask.dueDate) {
        const notificationContent =
          this.notificationDomainService.generateNotificationContent(savedTask);
        this.notificationDomainService.scheduleTaskReminder(
          savedTask,
          notificationContent,
        );
      }

      // Handle recurring task
      if (
        savedTask.isRecurring &&
        savedTask.dueDate &&
        savedTask.recurrenceRule
      ) {
        const nextDate = this.recurringTaskService.calculateNextOccurrence(
          savedTask.dueDate,
          savedTask.recurrenceRule,
        );
        savedTask.nextDueDate = nextDate;
        await this.tasksRepository.save(savedTask);
      }

      this.securityLogger.logSecurityEvent('Task created successfully', {
        taskId: savedTask.id,
        userId: userId,
      });
      return savedTask;
    } catch (error) {
      this.securityLogger.logValidationFailure(
        'Task creation failed',
        error.message,
        {
          dto: createTaskDto,
          userId: userId,
        },
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async updateTask(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    const task = await this.tasksRepository.getTaskById(id);
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    if (task.userId !== userId) {
      this.securityLogger.logSuspiciousActivity(
        'Ownership check failed for update',
        'HIGH',
        { taskId: id, attemptedByUserId: userId, ownerUserId: task.userId },
      );
      throw new ForbiddenException('You do not own this task');
    }

    const { title, description, dueDate, status, recurrenceRule } =
      updateTaskDto;

    try {
      // Validate inputs
      if (title) {
        this.validateInput(title, 'title');
      }
      if (description) {
        this.validateInput(description, 'description');
      }
      if (dueDate) {
        this.validateDate(dueDate);
      }

      // Fix malformed recurrence rule if present
      if (recurrenceRule && recurrenceRule.includes('FREQ=DAILYINTERVAL=')) {
        updateTaskDto.recurrenceRule = recurrenceRule.replace(
          'FREQ=DAILYINTERVAL=',
          'FREQ=DAILY;INTERVAL=',
        );
      }

      const originalStatus = task.status;
      const wasCompleted = originalStatus === TaskStatus.COMPLETED;
      const isCompleting = status === TaskStatus.COMPLETED;
      const isReopening = wasCompleted && status !== TaskStatus.COMPLETED;

      // Check if task is being completed
      if (isCompleting) {
        if (task.isRecurring) {
          // Mark the task as completed
          task.status = TaskStatus.COMPLETED;
          task.updatedAt = new Date();
          task.completedAt = new Date();

          // Save the updated task
          await this.tasksRepository.save(task);

          // Schedule the next occurrence
          await this.recurringTaskService.processCompletedTask(task);

          return this.tasksRepository.getTaskById(id);
        } else {
          // For non-recurring tasks, use the domain service
          const { updatedTask } = this.taskDomainService.completeTask(task);

          // Save the updated task
          await this.tasksRepository.save(updatedTask);

          // Return the updated task with all relations
          return this.tasksRepository.getTaskById(id);
        }
      }
      // Check if task is being reopened
      else if (isReopening) {
        // Update the task entity directly before calling repository update
        // task.completedAt = null; // This would modify the in-memory object, but updateTask repo method might ignore it
        // Instead, pass completedAt: null explicitly to the repository update
        const updatePayload = { ...updateTaskDto, completedAt: null };
        await this.tasksRepository.updateTask(id, updatePayload);
        return this.tasksRepository.getTaskById(id); // Return fresh task
      }
      // For other non-completion, non-reopening updates
      else {
        const updatedTask = await this.tasksRepository.updateTask(
          id,
          updateTaskDto,
        );
        this.securityLogger.logSecurityEvent('Task updated successfully', {
          taskId: id,
          userId: userId,
        });
        return this.tasksRepository.getTaskById(id);
      }
    } catch (error) {
      this.securityLogger.logSuspiciousActivity(
        'Task update failed',
        'MEDIUM',
        { taskId: id, userId: userId, error: error.message },
      );
      throw error;
    }
  }

  public async getInboxProject(): Promise<Project> {
    const inboxProject = await this.projectsRepository.findOne({
      where: {
        type: ProjectType.INBOX,
        isSystem: true,
      },
    });

    if (!inboxProject) {
      throw new NotFoundException(
        'Inbox project not found. This is a system configuration error.',
      );
    }

    return inboxProject;
  }

  async deleteTask(id: string, userId: string): Promise<void> {
    await this.checkTaskOwnership(id, userId);
    await this.tasksRepository.deleteTask(id, userId);
    this.securityLogger.logSecurityEvent('Task deleted successfully', {
      taskId: id,
      userId: userId,
    });
  }

  async archiveTask(id: string, userId: string): Promise<Task> {
    const task = await this.checkTaskOwnership(id, userId);
    const archivedTask = await this.tasksRepository.archiveTask(id, userId);
    this.securityLogger.logSecurityEvent('Task archived successfully', {
      taskId: id,
      userId: userId,
    });
    return archivedTask;
  }

  async getTodayTasks(userId: string): Promise<Task[]> {
    return this.tasksRepository.getTodayTasks(userId);
  }

  async getOverdueTasks(userId: string): Promise<Task[]> {
    return this.tasksRepository.getOverdueTasks(userId);
  }

  async getUpcomingTasks(days: number = 7, userId: string): Promise<Task[]> {
    return this.tasksRepository.getUpcomingTasks(days, userId);
  }

  async assignToProject(
    taskId: string,
    projectId: string,
    userId: string,
  ): Promise<Task> {
    const task = await this.checkTaskOwnership(taskId, userId);
    const project = await this.projectsRepository.findOne({
      where: [
        { id: projectId, userId: userId },
        { id: projectId, isSystem: true },
      ],
    });
    if (!project) {
      this.securityLogger.logSuspiciousActivity(
        'Attempted to assign task to non-owned or non-existent project',
        'MEDIUM',
        { taskId, projectId, userId },
      );
      throw new NotFoundException(
        `Project with ID "${projectId}" not found or not accessible.`,
      );
    }
    return this.tasksRepository.assignToProject(taskId, projectId, userId);
  }

  async addTags(
    taskId: string,
    tagIds: string[],
    userId: string,
  ): Promise<Task> {
    const task = await this.checkTaskOwnership(taskId, userId);
    const foundTags = await this.tagsRepository.getTagsByIds(tagIds, userId);
    const foundTagIds = foundTags.map((t) => t.id);
    const missingOrForbiddenTagIds = tagIds.filter(
      (id) => !foundTagIds.includes(id),
    );

    if (missingOrForbiddenTagIds.length > 0) {
      this.securityLogger.logSuspiciousActivity(
        'Attempted to add non-owned or non-existent tags',
        'MEDIUM',
        { taskId, userId, attemptedTagIds: missingOrForbiddenTagIds },
      );
      throw new NotFoundException(
        `One or more tags not found or not accessible: ${missingOrForbiddenTagIds.join(', ')}`,
      );
    }

    const taskWithTags = await this.tasksRepository.getTaskById(taskId);
    if (!taskWithTags) {
      throw new NotFoundException(`Task with ID "${taskId}" not found`);
    }
    if (taskWithTags.userId !== userId) {
      throw new ForbiddenException('You do not own this task');
    }

    const existingTagIds = taskWithTags.tags?.map((t) => t.id) || [];
    const tagsToAdd = foundTags.filter((t) => !existingTagIds.includes(t.id));

    if (tagsToAdd.length > 0) {
      taskWithTags.tags = [...(taskWithTags.tags || []), ...tagsToAdd];
      await this.tasksRepository.save(taskWithTags);
      this.securityLogger.logSecurityEvent('Tags added to task', {
        taskId,
        addedTagIds: tagsToAdd.map((t) => t.id),
        userId,
      });
    }

    return this.tasksRepository.getTaskById(taskId);
  }

  async removeTags(
    taskId: string,
    tagIds: string[],
    userId: string,
  ): Promise<Task> {
    const task = await this.tasksRepository.getTaskById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID "${taskId}" not found`);
    }
    if (task.userId !== userId) {
      this.securityLogger.logSuspiciousActivity(
        'Attempted to remove tags from unauthorized task',
        'HIGH',
        { taskId: taskId, attemptedByUserId: userId, ownerUserId: task.userId },
      );
      throw new ForbiddenException('You do not own this task');
    }

    if (!task.tags || task.tags.length === 0) {
      return task;
    }

    const originalTagCount = task.tags.length;
    task.tags = task.tags.filter((tag) => !tagIds.includes(tag.id));

    if (task.tags.length < originalTagCount) {
      await this.tasksRepository.save(task);
      const removedIds = tagIds.filter(
        (id) => !task.tags.some((t) => t.id === id),
      );
      this.securityLogger.logSecurityEvent('Tags removed from task', {
        taskId,
        removedTagIds: removedIds,
        userId,
      });
    }

    return this.tasksRepository.getTaskById(taskId);
  }

  async addFocusSession(
    taskId: string,
    sessionId: string,
    userId: string,
  ): Promise<Task> {
    const task = await this.checkTaskOwnership(taskId, userId);
    return this.tasksRepository.addFocusSession(taskId, sessionId);
  }

  async assignOrphanedTasksToInbox(): Promise<Task[]> {
    // Get the Inbox project
    const inboxProject = await this.getInboxProject();

    // Find all tasks without a project
    const orphanedTasks = await this.tasksRepository.getTasksWithoutProject();
    if (!orphanedTasks.length) {
      return [];
    }

    // Assign each task to the Inbox project
    const updatedTasks = await Promise.all(
      orphanedTasks.map(async (task) => {
        task.project = inboxProject;
        return this.tasksRepository.save(task);
      }),
    );

    this.securityLogger.logSecurityEvent(
      'Assigned orphaned tasks to Inbox project',
      {
        tasksCount: orphanedTasks.length,
        inboxProjectId: inboxProject.id,
      },
    );

    return updatedTasks;
  }

  /**
   * Count tasks based on filters
   * @param filters Object containing filters
   * @returns Number of tasks matching the filters
   */
  async countTasks(
    filters: Record<string, any>,
    userId: string,
  ): Promise<number> {
    const filterDto = new TaskFilterDto();
    filterDto.userId = userId;
    if (filters.status) {
      filterDto.status = filters.status;
    }
    if (filters.priority) {
      filterDto.priority = filters.priority;
    }
    if (filters.project_id) {
      filterDto.projectId = filters.project_id;
    }
    if (filters.due_date) {
      filterDto.dueDate = filters.due_date;
    }
    if (filters.search) {
      filterDto.search = filters.search;
    }
    if (filters.tag_ids) {
      filterDto.tagIds = Array.isArray(filters.tag_ids)
        ? filters.tag_ids
        : [filters.tag_ids];
    }
    return this.tasksRepository.countTasks(filterDto);
  }

  /**
   * Complete all overdue tasks with 'not_started' status
   */
  async completeOverdueTasks(
    userId: string,
    options: CompleteOverdueTasksDto,
  ): Promise<Task[]> {
    const whereConditions: any = {
      userId: userId,
      dueDate: LessThan(new Date()),
      isArchived: false,
      ...options?.additionalFilters,
      status: !options?.includeBlockedTasks
        ? TaskStatus.NOT_STARTED
        : In([TaskStatus.NOT_STARTED, TaskStatus.BLOCKED]),
    };

    const overdueTasks = await this.tasksRepository.find({
      where: whereConditions,
      relations: ['project', 'tags'],
    });

    if (!overdueTasks || overdueTasks.length === 0) {
      return [];
    }

    const taskUpdates = overdueTasks.map((task) => ({
      ...task,
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
    }));

    const updatedTasks = await this.tasksRepository.save(taskUpdates);

    return updatedTasks;
  }

  /**
   * Complete all tasks with specified statuses
   */
  async batchCompleteTasks(
    userId: string,
    options: BatchCompleteTasksDto,
  ): Promise<Task[]> {
    const whereConditions: any = {
      userId: userId,
      status: In(options.statuses || [TaskStatus.NOT_STARTED]),
      isArchived: false,
    };

    if (options?.additionalFilters?.taskIds?.length) {
      whereConditions.id = In(options.additionalFilters.taskIds);
    }

    const tasksToComplete = await this.tasksRepository.find({
      where: whereConditions,
      relations: ['project', 'tags'],
    });

    if (!tasksToComplete || tasksToComplete.length === 0) {
      return [];
    }

    const taskUpdates = tasksToComplete.map((task) => ({
      ...task,
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
    }));

    const updatedTasks = await this.tasksRepository.save(taskUpdates);

    return updatedTasks;
  }

  /**
   * Purges all tasks from the database - DEVELOPMENT ONLY
   * @returns number of deleted tasks
   */
  async purgeAllTasks(): Promise<number> {
    const queryRunner =
      this.tasksRepository.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // First, remove the relationships in the join table
      await queryRunner.query('DELETE FROM "focus_session_tasks_task"');

      // Then delete all tasks
      const result = await queryRunner.manager.delete(Task, {});

      await queryRunner.commitTransaction();
      return result.affected || 0;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to purge tasks: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // Re-confirm signature
  async getTaskStats(userId: string): Promise<{
    total: number;
    completed: number;
    overdue: number;
    dueToday: number;
    byPriority: Record<TaskPriority, number>;
  }> {
    const total = await this.tasksRepository.countTasks({ userId });
    const completed = await this.tasksRepository.countTasks({
      userId,
      status: TaskStatus.COMPLETED,
    });
    const overdue = await this.tasksRepository.countOverdueTasks(userId);
    const dueToday = await this.tasksRepository.countTodayTasks(userId);
    const byPriority = await this.tasksRepository.countTasksByPriority(userId);

    return {
      total,
      completed,
      overdue,
      dueToday,
      byPriority,
    };
  }

  // Re-confirm signature
  async getTasksByPriority(
    userId: string,
  ): Promise<Record<TaskPriority, Task[]>> {
    const tasks = await this.tasksRepository.getTasksByPriority(userId);
    const tasksByPriority: Record<TaskPriority, Task[]> = {
      [TaskPriority.NONE]: [],
      [TaskPriority.LOW]: [],
      [TaskPriority.MEDIUM]: [],
      [TaskPriority.HIGH]: [],
    };

    tasks.forEach((task) => {
      tasksByPriority[task.priority].push(task);
    });

    return tasksByPriority;
  }
}
