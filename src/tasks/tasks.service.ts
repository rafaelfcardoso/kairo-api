// src/services/task.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TasksRepository } from './tasks.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { TagsRepository } from '../tags/tags.repository';
import { Task, TaskStatus, TaskPriority } from './tasks.entity';
import { Project, ProjectType } from '../projects/projects.entity';
import { CreateTaskDto, UpdateTaskDto, TaskFilterDto } from './tasks.dto';
import { Repository } from 'typeorm';

@Injectable()
export class TaskService {
  constructor(
    private tasksRepository: TasksRepository,
    private projectsRepository: ProjectsRepository,
    private tagsRepository: TagsRepository,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  private validateDueDate(dueDate: string | null): void {
    if (!dueDate) return;

    const dueDateObj = new Date(dueDate);
    const now = new Date();

    // Check if date is valid
    if (isNaN(dueDateObj.getTime())) {
      throw new BadRequestException('Invalid due date format');
    }

    // Check if date has timezone information
    if (!dueDate.includes('Z') && !dueDate.includes('+')) {
      throw new BadRequestException('Due date must include timezone information');
    }

    // Optional: Enforce business rules about minimum/maximum dates
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 5); // Max 5 years in future
    
    if (dueDateObj > maxDate) {
      throw new BadRequestException('Due date cannot be more than 5 years in the future');
    }
  }

  async getTasks(filterDto: TaskFilterDto): Promise<Task[]> {
    return this.tasksRepository.getTasks(filterDto);
  }

  async getTaskById(id: string): Promise<Task> {
    return this.tasksRepository.getTaskById(id);
  }

  async createTask(createTaskDto: CreateTaskDto): Promise<Task> {
    // Validate due date if provided
    this.validateDueDate(createTaskDto.dueDate);

    const { projectId, ...taskData } = createTaskDto;

    // Always ensure a project is assigned
    const project = projectId 
      ? await this.projectsRepository.findOne({ where: { id: projectId } })
      : await this.getInboxProject();

    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    const task = this.taskRepository.create({
      ...taskData,
      project,
      status: TaskStatus.TODO,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return this.taskRepository.save(task);
  }

  async updateTask(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    // Validate due date if provided
    this.validateDueDate(updateTaskDto.dueDate);

    const { projectId, ...taskData } = updateTaskDto;

    const task = await this.getTaskById(id);
    
    // If project is being changed
    if (projectId !== undefined) {
      const project = projectId 
        ? await this.projectsRepository.findOne({ where: { id: projectId } })
        : await this.getInboxProject();

      if (!project) {
        throw new NotFoundException(`Project with ID "${projectId}" not found`);
      }

      task.project = project;
    }
    
    // Update the task
    Object.assign(task, {
      ...taskData,
      updatedAt: new Date().toISOString(),
    });

    return this.taskRepository.save(task);
  }

  private async getInboxProject(): Promise<Project> {
    const inboxProject = await this.projectsRepository.findOne({
      where: { type: ProjectType.INBOX }
    });

    if (!inboxProject) {
      throw new Error('Inbox project not found. This is a system configuration error.');
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

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.getTaskById(id);
    const { dueDate, ...taskData } = task;
    return this.tasksRepository.updateTask(id, {
      ...taskData,
      status,
      dueDate: dueDate ? (dueDate.toISOString() as any) : null,
    });
  }

  async updateTaskPriority(id: string, priority: TaskPriority): Promise<Task> {
    const task = await this.getTaskById(id);
    const { dueDate, ...taskData } = task;
    return this.tasksRepository.updateTask(id, {
      ...taskData,
      priority,
      dueDate: dueDate ? (dueDate.toISOString() as any) : null,
    });
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
}
