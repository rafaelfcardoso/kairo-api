// src/services/project.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { Project, ProjectType } from './projects.entity';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilterDto,
  ProjectMoveDto,
} from './projects.dto';
import { TaskStatus } from '../tasks/tasks.entity';
import { Task } from '../tasks/tasks.entity';
import { User } from '../entities/user.entity';
import { SecurityLoggerService } from '../common/services/security-logger.service';
import { In } from 'typeorm';

@Injectable()
export class ProjectsService {
  constructor(
    private projectsRepository: ProjectsRepository,
    private tasksRepository: TasksRepository,
    private securityLogger: SecurityLoggerService,
  ) {}

  private async checkProjectOwnership(
    projectId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }
    if (project.userId !== userId && !project.isSystem) {
      this.securityLogger.logSuspiciousActivity(
        'Project ownership check failed',
        'HIGH',
        { projectId, attemptedByUserId: userId, ownerUserId: project.userId },
      );
      throw new ForbiddenException('You do not own this project');
    }
    return project;
  }

  async getProjects(
    filterDto: ProjectFilterDto,
    userId: string,
  ): Promise<Project[]> {
    return this.projectsRepository.getProjects({ ...filterDto, userId });
  }

  async getProjectById(id: string, userId: string): Promise<Project> {
    return this.checkProjectOwnership(id, userId);
  }

  async createProject(
    createProjectDto: CreateProjectDto,
    userId: string,
  ): Promise<Project> {
    const result = await this.projectsRepository
      .createQueryBuilder('project')
      .select('MAX(project.order)', 'maxOrder')
      .where('project."parentId" IS NULL')
      .andWhere('project."userId" = :userId', { userId })
      .getRawOne();

    const nextOrder = (result?.maxOrder ?? -1) + 1;

    const project = this.projectsRepository.create({
      ...createProjectDto,
      userId: userId,
      order: nextOrder,
    });

    try {
      await this.projectsRepository.save(project);
      return project;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'Project name already exists for this user',
        );
      }
      this.securityLogger.logSuspiciousActivity(
        'Project creation failed',
        'MEDIUM',
        {
          error: error.message,
          userId: userId,
          dto: createProjectDto,
        },
      );
      throw new InternalServerErrorException();
    }
  }

  async updateProject(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    await this.checkProjectOwnership(id, userId);
    return this.projectsRepository.updateProject(id, updateProjectDto, userId);
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    const project = await this.checkProjectOwnership(id, userId);

    if (project.isSystem) {
      throw new BadRequestException(
        `Cannot delete system project "${project.name}"`,
      );
    }

    const projectWithRelations =
      await this.projectsRepository.getProjectById(id);
    if (projectWithRelations.children?.length > 0) {
      throw new BadRequestException(
        'Cannot delete project with sub-projects. Move or delete them first.',
      );
    }
    if (projectWithRelations.tasks?.length > 0) {
      throw new BadRequestException(
        'Cannot delete project with tasks. Move or delete them first.',
      );
    }

    await this.projectsRepository.deleteProject(id, userId);
  }

  async archiveProject(id: string, userId: string): Promise<Project> {
    await this.checkProjectOwnership(id, userId);
    return this.projectsRepository.archiveProject(id, userId);
  }

  async moveProject(moveDto: ProjectMoveDto, userId: string): Promise<void> {
    const { projectId, targetId } = moveDto;
    await this.checkProjectOwnership(projectId, userId);
    if (targetId) {
      await this.checkProjectOwnership(targetId, userId);
    }
    await this.projectsRepository.moveProject(
      projectId,
      targetId,
      moveDto.position,
    );
  }

  async reorderProjects(projectIds: string[], userId: string): Promise<void> {
    const projects = await this.projectsRepository.find({
      where: { id: In(projectIds) },
    });
    if (projects.length !== projectIds.length) {
      throw new NotFoundException('One or more projects not found.');
    }
    for (const project of projects) {
      if (project.userId !== userId && !project.isSystem) {
        throw new ForbiddenException(
          `You do not own project with ID ${project.id}`,
        );
      }
    }
    await this.projectsRepository.reorderProjects(projectIds);
  }

  async getProjectTree(userId: string, rootId?: string): Promise<Project[]> {
    return this.projectsRepository.getProjectTree(userId, rootId);
  }

  async getProjectWithAncestors(
    id: string,
    userId: string,
  ): Promise<{
    project: Project;
    ancestors: Project[];
  }> {
    const [project, ancestors] = await Promise.all([
      this.getProjectById(id, userId),
      this.projectsRepository.getProjectAncestors(id, userId),
    ]);

    return { project, ancestors };
  }

  async getProjectDescendantsFromService(
    id: string,
    userId: string,
  ): Promise<Project[]> {
    const project = await this.checkProjectOwnership(id, userId);
    return this.projectsRepository.getProjectDescendants(id, userId);
  }

  async getProjectStats(
    id: string,
    userId: string,
  ): Promise<{
    totalTasks: number;
    completedTasks: number;
    notStartedTasks: number;
    overdueTasks: number;
    progress: number;
    subprojectsCount: number;
    deepTasksCount: number; // Including tasks from subprojects
  }> {
    const project = await this.getProjectById(id, userId);
    const descendants = await this.projectsRepository.getProjectDescendants(
      id,
      userId,
    );

    // Get all tasks from this project and its subprojects
    const allProjectIds = [id, ...descendants.map((d) => d.id)];
    const allTasks = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.projectId IN (:...projectIds)', {
        projectIds: allProjectIds,
      })
      .getMany();

    const stats = {
      totalTasks: project.tasks.length,
      completedTasks: project.tasks.filter(
        (t) => t.status === TaskStatus.COMPLETED,
      ).length,
      notStartedTasks: project.tasks.filter(
        (t) => t.status === TaskStatus.NOT_STARTED,
      ).length,
      overdueTasks: project.tasks.filter(
        (t) => t.status === TaskStatus.NOT_STARTED && t.dueDate < new Date(),
      ).length,
      progress:
        project.tasks.length > 0
          ? (project.tasks.filter((t) => t.status === TaskStatus.COMPLETED)
              .length /
              project.tasks.length) *
            100
          : 0,
      subprojectsCount: descendants.length,
      deepTasksCount: allTasks.length,
    };

    return stats;
  }

  async duplicateProject(
    id: string,
    userId: string,
    options: {
      includeSubprojects?: boolean;
      includeTasks?: boolean;
    } = {},
  ): Promise<Project> {
    const { includeSubprojects = true, includeTasks = true } = options;
    const sourceProject = await this.getProjectById(id, userId);

    // Create new project with same basic data
    const newProjectData = {
      name: `${sourceProject.name} (Copy)`,
      description: sourceProject.description,
      color: sourceProject.color,
      parent: sourceProject.parent,
    };

    const newProject = await this.createProject(newProjectData, userId);

    if (includeTasks) {
      // Duplicate tasks
      const taskPromises = sourceProject.tasks.map(async (task) => {
        const newTaskData = {
          title: task.title,
          description: task.description,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          priority: task.priority,
          status: task.status,
          projectId: newProject.id,
        };
        return this.tasksRepository.createTask(newTaskData, userId);
      });
      await Promise.all(taskPromises);
    }

    if (includeSubprojects) {
      // Recursively duplicate subprojects
      const subprojectPromises = sourceProject.children.map((child) =>
        this.duplicateProject(child.id, userId, options),
      );
      await Promise.all(subprojectPromises);
    }

    return this.getProjectById(newProject.id, userId);
  }

  async mergeProjects(
    sourceId: string,
    targetId: string,
    userId: string,
  ): Promise<Project> {
    const [sourceProject, targetProject] = await Promise.all([
      this.checkProjectOwnership(sourceId, userId),
      this.checkProjectOwnership(targetId, userId),
    ]);

    // Move all tasks from source to target
    if (sourceProject.tasks.length > 0) {
      await this.tasksRepository
        .createQueryBuilder()
        .update()
        .set({ project: targetProject })
        .where('projectId = :sourceId', { sourceId })
        .execute();
    }

    // Move all subprojects from source to target
    if (sourceProject.children.length > 0) {
      await this.projectsRepository
        .createQueryBuilder()
        .update(Project)
        .set({ parent: targetProject })
        .where('parentId = :sourceId', { sourceId })
        .execute();
    }

    // Delete the source project
    await this.deleteProject(sourceId, userId);

    return this.getProjectById(targetId, userId);
  }

  async getProjectTimeline(
    id: string,
    userId: string,
  ): Promise<{
    project: Project;
    tasksByMonth: Record<string, number>;
    completionTrend: Record<string, number>;
  }> {
    const project = await this.getProjectById(id, userId);
    const tasks = project.tasks;

    // Group tasks by month
    const tasksByMonth = tasks.reduce((acc, task) => {
      const month = task.createdAt.toISOString().slice(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    // Calculate completion trend
    const completionTrend = tasks
      .filter((task) => task.status === TaskStatus.COMPLETED)
      .reduce((acc, task) => {
        const month = task.updatedAt.toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

    return { project, tasksByMonth, completionTrend };
  }

  async searchProjects(query: string, userId: string): Promise<Project[]> {
    return this.projectsRepository.searchProjects(query, userId);
  }

  async getProjectBreadcrumb(id: string, userId: string): Promise<Project[]> {
    const ancestors = await this.projectsRepository.getProjectAncestors(
      id,
      userId,
    );
    const current = await this.getProjectById(id, userId);
    return [...ancestors, current];
  }

  async calculateProjectHealth(
    id: string,
    userId: string,
  ): Promise<{
    health: 'good' | 'warning' | 'critical';
    factors: string[];
  }> {
    const stats = await this.getProjectStats(id, userId);
    const factors: string[] = [];

    // Define health check criteria
    if (stats.overdueTasks > 0) {
      factors.push(`${stats.overdueTasks} overdue tasks`);
    }

    if (stats.progress < 30) {
      factors.push('Low progress rate');
    }

    if (stats.totalTasks === 0) {
      factors.push('No tasks created');
    }

    // Determine overall health
    let health: 'good' | 'warning' | 'critical' = 'good';
    if (factors.length >= 2) {
      health = 'critical';
    } else if (factors.length === 1) {
      health = 'warning';
    }

    return { health, factors };
  }

  async duplicateTaskToProject(
    taskId: string,
    projectId: string,
    userId: string,
  ): Promise<Task> {
    const task = await this.tasksRepository.getTaskById(taskId);
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    const { dueDate, ...taskData } = task;
    const newTaskData = {
      title: task.title,
      description: task.description,
      dueDate: dueDate ? dueDate.toISOString() : null,
      priority: task.priority,
      status: task.status,
      projectId,
    };

    return this.tasksRepository.createTask(newTaskData, userId);
  }

  async createTaskWithProject(
    projectId: string,
    task: Task,
    userId: string,
  ): Promise<Task> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    const { dueDate, ...taskData } = task;
    const newTaskData = {
      title: task.title,
      description: task.description,
      dueDate: dueDate ? dueDate.toISOString() : null,
      priority: task.priority,
      status: task.status,
      projectId,
    };

    return this.tasksRepository.createTask(newTaskData, userId);
  }

  /**
   * Count projects based on filter criteria
   * @param filters Object with filter criteria
   * @returns Number of projects matching the filters
   */
  async countProjects(filters: Record<string, any>): Promise<number> {
    const query = this.projectsRepository.createQueryBuilder('project');

    // Apply filters if provided
    if (filters.name) {
      query.andWhere('project.name LIKE :name', { name: `%${filters.name}%` });
    }

    if (filters.type) {
      query.andWhere('project.type = :type', { type: filters.type });
    }

    if (filters.isActive !== undefined) {
      query.andWhere('project.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    return query.getCount();
  }
}
