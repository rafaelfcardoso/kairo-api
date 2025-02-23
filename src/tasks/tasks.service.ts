// src/services/task.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TasksRepository } from './tasks.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { TagsRepository } from '../tags/tags.repository';
import { Task, TaskStatus, TaskPriority } from './tasks.entity';
import { Project, ProjectType } from '../projects/projects.entity';
import { CreateTaskDto, UpdateTaskDto, TaskFilterDto } from './tasks.dto';
import { Repository } from 'typeorm';
import { SecurityLoggerService } from '../common/services/security-logger.service';

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
    private tasksRepository: TasksRepository,
    private projectsRepository: ProjectsRepository,
    private tagsRepository: TagsRepository,
    private securityLogger: SecurityLoggerService,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
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

  async getTasks(filterDto: TaskFilterDto): Promise<Task[]> {
    return this.tasksRepository.getTasks(filterDto);
  }

  async getTaskById(id: string): Promise<Task> {
    return this.tasksRepository.getTaskById(id);
  }

  async createTask(createTaskDto: CreateTaskDto, _ip?: string): Promise<Task> {
    const { title, description, dueDate } = createTaskDto;

    // Validate inputs
    this.validateInput(title, 'title');
    if (description) {
      this.validateInput(description, 'description');
    }
    if (dueDate !== undefined && dueDate !== null) {
      this.validateDate(dueDate);
    }

    try {
      const savedTask = await this.tasksRepository.createTask(createTaskDto);

      this.securityLogger.logSecurityEvent('Task created successfully', {
        taskId: savedTask.id,
      });
      return savedTask;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.securityLogger.logSuspiciousActivity(
        'Task creation failed',
        'MEDIUM',
        { error: error.message },
      );
      throw error;
    }
  }

  async updateTask(
    id: string,
    updateTaskDto: UpdateTaskDto,
    _ip?: string,
  ): Promise<Task> {
    const { title, description, dueDate } = updateTaskDto;

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

    try {
      const savedTask = await this.tasksRepository.updateTask(
        id,
        updateTaskDto,
      );

      this.securityLogger.logSecurityEvent('Task updated successfully', {
        taskId: savedTask.id,
      });

      return savedTask;
    } catch (error) {
      this.securityLogger.logSuspiciousActivity(
        'Task update failed',
        'MEDIUM',
        { taskId: id, error: error.message },
      );
      throw error;
    }
  }

  private async getInboxProject(): Promise<Project> {
    const inboxProject = await this.projectsRepository.findOne({
      where: {
        type: ProjectType.INBOX,
        isSystem: true,
      },
    });

    if (!inboxProject) {
      throw new Error(
        'Inbox project not found. This is a system configuration error.',
      );
    }

    return inboxProject;
  }

  async deleteTask(id: string): Promise<void> {
    return this.tasksRepository.deleteTask(id);
  }

  async archiveTask(id: string): Promise<Task> {
    return this.tasksRepository.archiveTask(id);
  }

  async getTodayTasks(): Promise<Task[]> {
    return this.tasksRepository.getTodayTasks();
  }

  async getOverdueTasks(): Promise<Task[]> {
    return this.tasksRepository.getOverdueTasks();
  }

  async getUpcomingTasks(days: number = 7): Promise<Task[]> {
    return this.tasksRepository.getUpcomingTasks(days);
  }

  async assignToProject(taskId: string, projectId: string): Promise<Task> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    return this.tasksRepository.assignToProject(taskId, projectId);
  }

  async addTags(taskId: string, tagIds: string[]): Promise<Task> {
    const foundTags = await this.tagsRepository.findByIds(tagIds);
    if (foundTags.length !== tagIds.length) {
      throw new NotFoundException('One or more tags not found');
    }

    return this.tasksRepository.addTags(taskId, tagIds);
  }

  async removeTags(taskId: string, tagIds: string[]): Promise<Task> {
    const task = await this.getTaskById(taskId);
    task.tags = task.tags.filter((tag) => !tagIds.includes(tag.id));
    return this.tasksRepository.save(task);
  }

  async addFocusSession(taskId: string, sessionId: string): Promise<Task> {
    return this.tasksRepository.addFocusSession(taskId, sessionId);
  }

  async getTaskStats(): Promise<{
    total: number;
    completed: number;
    overdue: number;
    upcoming: number;
  }> {
    const [total, completed, overdue, upcoming] = await Promise.all([
      this.tasksRepository.count({ where: { isArchived: false } }),
      this.tasksRepository.count({
        where: {
          status: TaskStatus.COMPLETED,
          isArchived: false,
        },
      }),
      this.tasksRepository.getOverdueTasks(),
      this.tasksRepository.getUpcomingTasks(),
    ]);

    return {
      total,
      completed,
      overdue: overdue.length,
      upcoming: upcoming.length,
    };
  }

  async getTasksByPriority(): Promise<Record<TaskPriority, number>> {
    const tasks = await this.tasksRepository.find({
      where: { isArchived: false },
      select: ['priority'],
    });

    return {
      [TaskPriority.NONE]: tasks.filter((t) => t.priority === TaskPriority.NONE)
        .length,
      [TaskPriority.LOW]: tasks.filter((t) => t.priority === TaskPriority.LOW)
        .length,
      [TaskPriority.MEDIUM]: tasks.filter(
        (t) => t.priority === TaskPriority.MEDIUM,
      ).length,
      [TaskPriority.HIGH]: tasks.filter((t) => t.priority === TaskPriority.HIGH)
        .length,
    };
  }

  async duplicateTask(id: string): Promise<Task> {
    const sourceTask = await this.getTaskById(id);
    const { dueDate, ...taskData } = sourceTask;
    return this.tasksRepository.createTask({
      ...taskData,
      title: `${taskData.title} (Copy)`,
      dueDate: dueDate ? (dueDate.toISOString() as any) : null,
    } as CreateTaskDto);
  }

  async assignOrphanedTasksToInbox(): Promise<{
    tasksAssigned: number;
    inboxProjectId: string;
    summary: string;
    tasks: Task[];
  }> {
    // Get the Inbox project
    const inboxProject = await this.getInboxProject();

    // Find all tasks without a project
    const orphanedTasks = await this.tasksRepository.getTasksWithoutProject();

    // Assign each task to the Inbox project
    const updatedTasks = await Promise.all(
      orphanedTasks.map(async (task) => {
        return this.tasksRepository.updateTask(task.id, {
          projectId: inboxProject.id,
        });
      }),
    );

    this.securityLogger.logSecurityEvent(
      'Assigned orphaned tasks to Inbox project',
      {
        tasksCount: orphanedTasks.length,
        inboxProjectId: inboxProject.id,
      },
    );

    return {
      tasksAssigned: orphanedTasks.length,
      inboxProjectId: inboxProject.id,
      summary: `Found and fixed ${orphanedTasks.length} task${
        orphanedTasks.length === 1 ? '' : 's'
      } that ${
        orphanedTasks.length === 1 ? 'was' : 'were'
      } not assigned to any project`,
      tasks: updatedTasks,
    };
  }
}
