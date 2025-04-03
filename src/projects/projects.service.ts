// src/services/project.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { Project } from './projects.entity';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilterDto,
  ProjectMoveDto,
} from './projects.dto';
import { TaskStatus } from '../tasks/tasks.entity';
import { Task } from '../tasks/tasks.entity';

@Injectable()
export class ProjectsService {
  constructor(
    private projectsRepository: ProjectsRepository,
    private tasksRepository: TasksRepository,
  ) {}

  async getProjects(filterDto: ProjectFilterDto): Promise<Project[]> {
    return this.projectsRepository.getProjects(filterDto);
  }

  async getProjectById(id: string): Promise<Project> {
    return this.projectsRepository.getProjectById(id);
  }

  async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectsRepository.createProject(createProjectDto);
  }

  async updateProject(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectsRepository.updateProject(id, updateProjectDto);
  }

  async deleteProject(id: string): Promise<void> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }
    if (project.isSystem) {
      throw new BadRequestException(
        `Cannot delete system project "${project.name}"`,
      );
    }
    await this.projectsRepository.delete(id);
  }

  async archiveProject(id: string): Promise<Project> {
    return this.projectsRepository.archiveProject(id);
  }

  async moveProject(moveDto: ProjectMoveDto): Promise<void> {
    const { projectId, targetId, position } = moveDto;
    await this.projectsRepository.moveProject(projectId, targetId, position);
  }

  async reorderProjects(projectIds: string[]): Promise<void> {
    await this.projectsRepository.reorderProjects(projectIds);
  }

  async getProjectTree(rootId?: string): Promise<Project[]> {
    return this.projectsRepository.getProjectTree(rootId);
  }

  async getProjectWithAncestors(id: string): Promise<{
    project: Project;
    ancestors: Project[];
  }> {
    const [project, ancestors] = await Promise.all([
      this.getProjectById(id),
      this.projectsRepository.getProjectAncestors(id),
    ]);

    return { project, ancestors };
  }

  async getProjectStats(id: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    notStartedTasks: number;
    overdueTasks: number;
    progress: number;
    subprojectsCount: number;
    deepTasksCount: number; // Including tasks from subprojects
  }> {
    const project = await this.getProjectById(id);
    const descendants = await this.projectsRepository.getProjectDescendants(id);

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
    options: {
      includeSubprojects?: boolean;
      includeTasks?: boolean;
    } = {},
  ): Promise<Project> {
    const { includeSubprojects = true, includeTasks = true } = options;
    const sourceProject = await this.getProjectById(id);

    // Create new project with same basic data
    const newProjectData = {
      name: `${sourceProject.name} (Copy)`,
      description: sourceProject.description,
      color: sourceProject.color,
      parent: sourceProject.parent,
    };

    const newProject = await this.createProject(newProjectData);

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
        return this.tasksRepository.createTask(newTaskData);
      });
      await Promise.all(taskPromises);
    }

    if (includeSubprojects) {
      // Recursively duplicate subprojects
      const subprojectPromises = sourceProject.children.map((child) =>
        this.duplicateProject(child.id, options),
      );
      await Promise.all(subprojectPromises);
    }

    return this.getProjectById(newProject.id);
  }

  async mergeProjects(sourceId: string, targetId: string): Promise<Project> {
    const [sourceProject, targetProject] = await Promise.all([
      this.getProjectById(sourceId),
      this.getProjectById(targetId),
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
    await this.deleteProject(sourceId);

    return this.getProjectById(targetId);
  }

  async getProjectTimeline(id: string): Promise<{
    project: Project;
    tasksByMonth: Record<string, number>;
    completionTrend: Record<string, number>;
  }> {
    const project = await this.getProjectById(id);
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

  async searchProjects(query: string): Promise<Project[]> {
    return this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.parent', 'parent')
      .leftJoinAndSelect('project.children', 'children')
      .where('LOWER(project.name) LIKE LOWER(:query)', { query: `%${query}%` })
      .orWhere('LOWER(project.description) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .getMany();
  }

  async getProjectBreadcrumb(id: string): Promise<Project[]> {
    const ancestors = await this.projectsRepository.getProjectAncestors(id);
    const current = await this.getProjectById(id);
    return [...ancestors, current];
  }

  async calculateProjectHealth(id: string): Promise<{
    health: 'good' | 'warning' | 'critical';
    factors: string[];
  }> {
    const stats = await this.getProjectStats(id);
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

    return this.tasksRepository.createTask(newTaskData);
  }

  async createTaskWithProject(projectId: string, task: Task): Promise<Task> {
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

    return this.tasksRepository.createTask(newTaskData);
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
