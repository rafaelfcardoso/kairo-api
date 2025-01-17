// src/services/project.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectsRepository } from './projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { Project } from './projects.entity';
import { 
  CreateProjectDto, 
  UpdateProjectDto, 
  ProjectFilterDto, 
  ProjectMoveDto 
} from './projects.dto';
import { TaskStatus } from '../tasks/tasks.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectsRepository)
    private projectRepository: ProjectsRepository,
    @InjectRepository(TasksRepository)
    private taskRepository: TasksRepository,
  ) {}

  async getProjects(filterDto: ProjectFilterDto): Promise<Project[]> {
    return this.projectRepository.getProjects(filterDto);
  }

  async getProjectById(id: string): Promise<Project> {
    return this.projectRepository.getProjectById(id);
  }

  async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectRepository.createProject(createProjectDto);
  }

  async updateProject(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    return this.projectRepository.updateProject(id, updateProjectDto);
  }

  async deleteProject(id: string): Promise<void> {
    await this.projectRepository.deleteProject(id);
  }

  async archiveProject(id: string): Promise<Project> {
    return this.projectRepository.archiveProject(id);
  }

  async moveProject(moveDto: ProjectMoveDto): Promise<void> {
    const { projectId, targetId, position } = moveDto;
    await this.projectRepository.moveProject(projectId, targetId, position);
  }

  async reorderProjects(projectIds: string[]): Promise<void> {
    await this.projectRepository.reorderProjects(projectIds);
  }

  async getProjectTree(rootId?: string): Promise<Project[]> {
    return this.projectRepository.getProjectTree(rootId);
  }

  async getProjectWithAncestors(id: string): Promise<{
    project: Project;
    ancestors: Project[];
  }> {
    const [project, ancestors] = await Promise.all([
      this.getProjectById(id),
      this.projectRepository.getProjectAncestors(id)
    ]);

    return { project, ancestors };
  }

  async getProjectStats(id: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    progress: number;
    subprojectsCount: number;
    deepTasksCount: number; // Including tasks from subprojects
  }> {
    const project = await this.getProjectById(id);
    const descendants = await this.projectRepository.getProjectDescendants(id);
    
    // Get all tasks from this project and its subprojects
    const allProjectIds = [id, ...descendants.map(d => d.id)];
    const allTasks = await this.taskRepository.createQueryBuilder('task')
      .where('task.projectId IN (:...projectIds)', { projectIds: allProjectIds })
      .getMany();

    const stats = {
      totalTasks: project.tasks.length,
      completedTasks: project.tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      pendingTasks: project.tasks.filter(t => t.status === TaskStatus.PENDING).length,
      overdueTasks: project.tasks.filter(t => t.status === TaskStatus.PENDING && t.dueDate < new Date()).length,
      progress: project.tasks.length > 0 
        ? (project.tasks.filter(t => t.status === TaskStatus.COMPLETED).length / project.tasks.length) * 100 
        : 0,
      subprojectsCount: descendants.length,
      deepTasksCount: allTasks.length,
    };

    return stats;
  }

  async duplicateProject(id: string, options: {
    includeSubprojects?: boolean;
    includeTasks?: boolean;
  } = {}): Promise<Project> {
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
          dueDate: task.dueDate,
          priority: task.priority,
          status: task.status,
          projectId: newProject.id,
        };
        return this.taskRepository.createTask(newTaskData);
      });
      await Promise.all(taskPromises);
    }

    if (includeSubprojects) {
      // Recursively duplicate subprojects
      const subprojectPromises = sourceProject.children.map(child =>
        this.duplicateProject(child.id, options)
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
      await this.taskRepository.createQueryBuilder()
        .update()
        .set({ project: targetProject })
        .where('projectId = :sourceId', { sourceId })
        .execute();
    }

    // Move all subprojects from source to target
    if (sourceProject.children.length > 0) {
      await this.projectRepository.createQueryBuilder()
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
      .filter(task => task.status === TaskStatus.COMPLETED)
      .reduce((acc, task) => {
        const month = task.updatedAt.toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

    return { project, tasksByMonth, completionTrend };
  }

  async searchProjects(query: string): Promise<Project[]> {
    return this.projectRepository.createQueryBuilder('project')
      .leftJoinAndSelect('project.parent', 'parent')
      .leftJoinAndSelect('project.children', 'children')
      .where('LOWER(project.name) LIKE LOWER(:query)', { query: `%${query}%` })
      .orWhere('LOWER(project.description) LIKE LOWER(:query)', { query: `%${query}%` })
      .getMany();
  }

  async getProjectBreadcrumb(id: string): Promise<Project[]> {
    const ancestors = await this.projectRepository.getProjectAncestors(id);
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
}