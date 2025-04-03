// src/repositories/task.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Task, TaskStatus } from './tasks.entity';
import { CreateTaskDto, UpdateTaskDto, TaskFilterDto } from './tasks.dto';
import { NotFoundException } from '@nestjs/common';
import { Project, ProjectType } from '../projects/projects.entity';
import { Tag } from '../tags/tags.entity';
import { In } from 'typeorm';
import { Logger } from '@nestjs/common';

@Injectable()
export class TasksRepository extends Repository<Task> {
  private readonly logger = new Logger(TasksRepository.name);

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
    const {
      status,
      priority,
      projectId,
      tagIds,
      search,
      dueDate,
      includeArchived,
      isRecurring,
    } = filterDto;

    const query = this.getTasksQueryBuilder();

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    if (projectId) {
      query.andWhere('task.projectId = :projectId', { projectId });
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
      const startOfDay = new Date(dueDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dueDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.andWhere('task.dueDate BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      });
    }

    if (!includeArchived) {
      query.andWhere('task.isArchived = :isArchived', { isArchived: false });
    }

    if (isRecurring !== undefined) {
      query.andWhere('task.isRecurring = :isRecurring', { isRecurring });
    }

    return query.getMany();
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

    // Create the base task
    const task = this.create(taskData);

    // Handle project assignment
    if (projectId) {
      const project = await this.manager.findOne(Project, {
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundException(`Project with ID "${projectId}" not found`);
      }
      task.project = project;
    } else {
      // If no project specified, assign to the system inbox project
      const inboxProject = await this.manager.findOne(Project, {
        where: {
          isSystem: true,
          type: ProjectType.INBOX,
        },
      });

      if (inboxProject) {
        task.project = inboxProject;
      } else {
        this.logger.warn(
          'System inbox project not found. Task created without project assignment.',
        );
      }
    }

    // Handle tags
    if (tagIds?.length > 0) {
      const tags = await this.manager.findBy(Tag, {
        id: In(tagIds),
      });
      task.tags = tags;
    } else {
      task.tags = [];
    }

    await this.save(task);
    return this.getTaskById(task.id);
  }

  async updateTask(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const { projectId, tagIds, ...taskData } = updateTaskDto;

    // Get existing task with relations
    const task = await this.getTaskById(id);

    // Handle project assignment
    if (projectId !== undefined) {
      if (projectId) {
        // Find the project
        const project = await this.manager.findOne(Project, {
          where: { id: projectId },
        });

        if (!project) {
          throw new NotFoundException(
            `Project with ID "${projectId}" not found`,
          );
        }

        // Update using direct query to set project
        await this.createQueryBuilder()
          .update(Task)
          .set({ project })
          .where('id = :id', { id: task.id })
          .execute();

        // Update the task instance
        task.project = project;
      } else {
        // Remove project association
        await this.createQueryBuilder()
          .update(Task)
          .set({ project: null })
          .where('id = :id', { id: task.id })
          .execute();

        task.project = null;
      }
    }

    // Handle tags if provided
    if (tagIds !== undefined) {
      if (tagIds.length > 0) {
        const tags = await this.manager.findBy(Tag, {
          id: In(tagIds),
        });
        task.tags = tags;
      } else {
        task.tags = [];
      }
      await this.save(task);
    }

    // Update other task data if any
    if (Object.keys(taskData).length > 0) {
      Object.assign(task, taskData);
      await this.save(task);
    }

    // Get fresh task with all relations
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
        "task.dueDate BETWEEN CURRENT_DATE AND (CURRENT_DATE + :days * INTERVAL '1 day')",
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

  async getTasksWithoutProject(): Promise<Task[]> {
    return this.find({
      where: { project: null, isArchived: false },
    });
  }

  /**
   * Count tasks based on filter criteria
   * @param filterDto Task filter criteria
   * @returns Number of tasks matching the filters
   */
  async countTasks(filterDto: TaskFilterDto): Promise<number> {
    const {
      status,
      priority,
      projectId,
      tagIds,
      search,
      dueDate,
      includeArchived,
      isRecurring,
    } = filterDto;

    const query = this.getTasksQueryBuilder();

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    if (projectId) {
      query.andWhere('task.projectId = :projectId', { projectId });
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
      const startOfDay = new Date(dueDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dueDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.andWhere('task.dueDate BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      });
    }

    if (!includeArchived) {
      query.andWhere('task.isArchived = :isArchived', { isArchived: false });
    }

    if (isRecurring !== undefined) {
      query.andWhere('task.isRecurring = :isRecurring', { isRecurring });
    }

    return query.getCount();
  }
}
