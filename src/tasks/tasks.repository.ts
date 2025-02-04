// src/repositories/task.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Task, TaskStatus } from './tasks.entity';
import { CreateTaskDto, UpdateTaskDto, TaskFilterDto } from './tasks.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class TasksRepository extends Repository<Task> {
  constructor(dataSource: DataSource) {
    super(Task, dataSource.createEntityManager());
  }

  private getTasksQueryBuilder(): SelectQueryBuilder<Task> {
    return this.createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.tags', 'tags')
      .leftJoinAndSelect('task.focusSessions', 'focusSessions')
      .orderBy('task.createdAt', 'DESC');
  }

  async getTasks(filterDto: TaskFilterDto): Promise<Task[]> {
    const { status, search, priority, projectId, tagIds, dueDate } = filterDto;
    const query = this.getTasksQueryBuilder();

    if (!filterDto.includeArchived) {
      query.andWhere('task.isArchived = :isArchived', { isArchived: false });
    }

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    if (projectId) {
      query.andWhere('project.id = :projectId', { projectId });
    }

    if (tagIds && tagIds.length > 0) {
      query.andWhere('tags.id IN (:...tagIds)', { tagIds });
    }

    if (search) {
      query.andWhere(
        '(LOWER(task.title) LIKE LOWER(:search) OR LOWER(task.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (dueDate) {
      query.andWhere('task.dueDate >= :startDate AND task.dueDate < :endDate', {
        startDate: `${dueDate}T00:00:00.000Z`,
        endDate: `${dueDate}T23:59:59.999Z`,
      });
    }

    return await query.getMany();
  }

  async getTaskById(id: string): Promise<Task> {
    const task = await this.getTasksQueryBuilder()
      .where('task.id = :id', { id })
      .getOne();

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    return task;
  }

  async createTask(createTaskDto: CreateTaskDto): Promise<Task> {
    const { projectId, tagIds, ...taskData } = createTaskDto;
    const task = this.create({
      ...taskData,
      project: projectId ? { id: projectId } : null,
      tags: tagIds?.map((id) => ({ id })) || [],
    });
    await this.save(task);
    return this.getTaskById(task.id);
  }

  async updateTask(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const { projectId, tagIds, ...taskData } = updateTaskDto;
    const task = await this.getTaskById(id);

    Object.assign(task, {
      ...taskData,
      project: projectId ? { id: projectId } : task.project,
      tags: tagIds?.map((id) => ({ id })) || task.tags,
    });

    await this.save(task);
    return this.getTaskById(id);
  }

  async deleteTask(id: string): Promise<void> {
    const result = await this.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
  }

  async archiveTask(id: string): Promise<Task> {
    const task = await this.getTaskById(id);
    task.isArchived = true;
    await this.save(task);
    return task;
  }

  async getTodayTasks(): Promise<Task[]> {
    const query = this.getTasksQueryBuilder()
      .where('task.isArchived = :isArchived', { isArchived: false })
      .andWhere(
        '(DATE(task.dueDate) = CURRENT_DATE OR task.status = :inProgress)',
        { inProgress: TaskStatus.IN_PROGRESS },
      );

    return await query.getMany();
  }

  async getOverdueTasks(): Promise<Task[]> {
    const query = this.getTasksQueryBuilder()
      .where('task.isArchived = :isArchived', { isArchived: false })
      .andWhere('task.status != :completed', {
        completed: TaskStatus.COMPLETED,
      })
      .andWhere('task.dueDate < CURRENT_DATE');

    return await query.getMany();
  }

  async getUpcomingTasks(days: number = 7): Promise<Task[]> {
    const query = this.getTasksQueryBuilder()
      .where('task.isArchived = :isArchived', { isArchived: false })
      .andWhere('task.status != :completed', {
        completed: TaskStatus.COMPLETED,
      })
      .andWhere(
        'task.dueDate BETWEEN CURRENT_DATE AND (CURRENT_DATE + :days)',
        { days },
      );

    return await query.getMany();
  }

  async assignToProject(taskId: string, projectId: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    task.project = { id: projectId } as any; // Type assertion for brevity
    await this.save(task);
    return this.getTaskById(taskId);
  }

  async addTags(taskId: string, tagIds: string[]): Promise<Task> {
    const task = await this.getTaskById(taskId);
    task.tags = tagIds.map((id) => ({ id }) as any); // Type assertion for brevity
    await this.save(task);
    return this.getTaskById(taskId);
  }

  async addFocusSession(taskId: string, sessionId: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task.focusSessions) {
      task.focusSessions = [];
    }
    task.focusSessions.push({ id: sessionId } as any); // Type assertion for brevity
    await this.save(task);
    return this.getTaskById(taskId);
  }
}
