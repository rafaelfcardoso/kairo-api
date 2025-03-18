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
      search,
      priority,
      projectId,
      tagIds,
      dueDate,
      recurring,
      dueSoon,
    } = filterDto;
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

    // Filter for tasks due today or in the past
    if (dueSoon) {
      const now = new Date();
      now.setHours(23, 59, 59, 999); // End of today
      query.andWhere('task.dueDate <= :now', { now });
    }

    // Filter for recurring tasks
    if (recurring) {
      query.andWhere('task.recurrenceRule IS NOT NULL');
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
      search,
      priority,
      projectId,
      tagIds,
      dueDate,
      recurring,
      dueSoon,
    } = filterDto;
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
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (dueDate) {
      // Handle different due date formats and criteria
      if (dueDate === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        query.andWhere('task.dueDate >= :today AND task.dueDate < :tomorrow', {
          today,
          tomorrow,
        });
      } else if (dueDate === 'overdue') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        query.andWhere('task.dueDate < :today AND task.status != :completed', {
          today,
          completed: TaskStatus.COMPLETED,
        });
      } else if (dueDate === 'upcoming') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        query.andWhere('task.dueDate >= :today AND task.dueDate <= :nextWeek', {
          today,
          nextWeek,
        });
      } else {
        // Treat as specific date
        const specificDate = new Date(dueDate);
        const nextDay = new Date(specificDate);
        nextDay.setDate(nextDay.getDate() + 1);

        query.andWhere(
          'task.dueDate >= :specificDate AND task.dueDate < :nextDay',
          { specificDate, nextDay },
        );
      }
    }

    if (recurring !== undefined) {
      query.andWhere('task.isRecurring = :recurring', { recurring });
    }

    return query.getCount();
  }
}
