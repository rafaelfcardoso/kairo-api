// src/services/task.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TasksRepository } from './tasks.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { TagsRepository } from '../tags/tags.repository';
import { Task, TaskStatus, TaskPriority } from './tasks.entity';
import { CreateTaskDto, UpdateTaskDto, TaskFilterDto } from './tasks.dto';

@Injectable()
export class TaskService {
  constructor(
    private tasksRepository: TasksRepository,
    private projectsRepository: ProjectsRepository,
    private tagsRepository: TagsRepository,
  ) {}

  async getTasks(filterDto: TaskFilterDto): Promise<Task[]> {
    return this.tasksRepository.getTasks(filterDto);
  }

  async getTaskById(id: string): Promise<Task> {
    return this.tasksRepository.getTaskById(id);
  }

  async createTask(createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksRepository.createTask(createTaskDto);
  }

  async updateTask(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    return this.tasksRepository.updateTask(id, updateTaskDto);
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
    return this.tasksRepository.updateTask(id, { ...task, status });
  }

  async updateTaskPriority(id: string, priority: TaskPriority): Promise<Task> {
    const task = await this.getTaskById(id);
    return this.tasksRepository.updateTask(id, { ...task, priority });
  }
  async assignToProject(taskId: string, projectId: string): Promise<Task> {
    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
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
    // const { id: sourceId, createdAt, updatedAt, ...taskData } = sourceTask; // Renamed id to sourceId
    const { ...taskData } = sourceTask;

    // Create new task with same data but append "(Copy)" to title
    return this.tasksRepository.createTask({
      ...taskData,
      title: `${taskData.title} (Copy)`,
    });
  }
}
