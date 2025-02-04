import { Injectable } from '@nestjs/common';
import { DataSource, TreeRepository } from 'typeorm';
import { Project } from './projects.entity';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilterDto,
} from './projects.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Task, TaskStatus } from '../tasks/tasks.entity';

@Injectable()
export class ProjectsRepository extends TreeRepository<Project> {
  constructor(private dataSource: DataSource) {
    super(Project, dataSource.createEntityManager());
  }

  async getProjects(filterDto: ProjectFilterDto): Promise<Project[]> {
    const { search, includeArchived, includeSystem, parentId } = filterDto;

    console.log('Filter DTO:', filterDto);
    console.log('includeSystem:', includeSystem);
    console.log('Type of includeSystem:', typeof includeSystem);

    let query = this.createQueryBuilder('project')
      .leftJoinAndSelect('project.parent', 'parent')
      .leftJoinAndSelect('project.children', 'children')
      .leftJoinAndSelect('project.tasks', 'tasks')
      .orderBy('project.order', 'ASC')
      .addOrderBy('project.createdAt', 'DESC');

    // Start with base conditions
    let hasWhereClause = false;

    if (!includeArchived) {
      query = query.where('project.isArchived = :isArchived', {
        isArchived: false,
      });
      hasWhereClause = true;
    }

    // Handle system projects filter
    if (includeSystem === false) {
      if (hasWhereClause) {
        query = query.andWhere('project.isSystem = :isSystem', {
          isSystem: false,
        });
      } else {
        query = query.where('project.isSystem = :isSystem', {
          isSystem: false,
        });
        hasWhereClause = true;
      }
    }

    if (parentId) {
      if (hasWhereClause) {
        query = query.andWhere('parent.id = :parentId', { parentId });
      } else {
        query = query.where('parent.id = :parentId', { parentId });
        hasWhereClause = true;
      }
    } else if (parentId === null) {
      if (hasWhereClause) {
        query = query.andWhere('project.parent IS NULL');
      } else {
        query = query.where('project.parent IS NULL');
        hasWhereClause = true;
      }
    }

    if (search) {
      if (hasWhereClause) {
        query = query.andWhere(
          '(LOWER(project.name) LIKE LOWER(:search) OR LOWER(project.description) LIKE LOWER(:search))',
          { search: `%${search}%` },
        );
      } else {
        query = query.where(
          '(LOWER(project.name) LIKE LOWER(:search) OR LOWER(project.description) LIKE LOWER(:search))',
          { search: `%${search}%` },
        );
      }
    }

    const projects = await query.getMany();

    // Calculate task statistics for each project
    return projects.map((project) => ({
      ...project,
      tasksCount: project.tasks?.length || 0,
      completedTasksCount:
        project.tasks?.filter((task) => task.status === TaskStatus.COMPLETED)
          .length || 0,
      progress: project.tasks?.length
        ? (project.tasks.filter((task) => task.status === TaskStatus.COMPLETED)
            .length /
            project.tasks.length) *
          100
        : 0,
    }));
  }

  async getProjectById(id: string): Promise<Project> {
    const project = await this.createQueryBuilder('project')
      .leftJoinAndSelect('project.parent', 'parent')
      .leftJoinAndSelect('project.children', 'children')
      .leftJoinAndSelect('project.tasks', 'tasks')
      .where('project.id = :id', { id })
      .getOne();

    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }

    // Calculate statistics
    project.tasksCount = project.tasks?.length || 0;
    project.completedTasksCount =
      project.tasks?.filter((task) => task.status === TaskStatus.COMPLETED)
        .length || 0;
    project.progress = project.tasks?.length
      ? (project.completedTasksCount / project.tasksCount) * 100
      : 0;

    return project;
  }

  async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
    const { parentId, ...projectData } = createProjectDto;

    let parent: Project | undefined;
    if (parentId) {
      parent = await this.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException(
          `Parent project with ID "${parentId}" not found`,
        );
      }
    }

    // Get max order number for siblings
    const maxOrderQuery = this.createQueryBuilder('project').select(
      'MAX(project.order)',
      'maxOrder',
    );

    if (parentId) {
      maxOrderQuery.where('project.parent = :parentId', { parentId });
    } else {
      maxOrderQuery.where('project.parent IS NULL');
    }

    const { maxOrder } = await maxOrderQuery.getRawOne();

    const project = this.create({
      ...projectData,
      parent,
      order: (maxOrder || 0) + 1,
    });

    await this.save(project);
    return this.getProjectById(project.id);
  }

  async updateProject(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const { parentId, ...projectData } = updateProjectDto;

    const project = await this.getProjectById(id);

    if (parentId) {
      // Prevent circular references
      if (await this.wouldCreateCircularReference(id, parentId)) {
        throw new BadRequestException(
          'Cannot set parent: would create circular reference',
        );
      }

      const parent = await this.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException(
          `Parent project with ID "${parentId}" not found`,
        );
      }
      project.parent = parent;
    } else if (parentId === null) {
      project.parent = null;
    }

    Object.assign(project, projectData);
    await this.save(project);
    return this.getProjectById(id);
  }

  async deleteProject(id: string): Promise<void> {
    const project = await this.getProjectById(id);

    // Check if project has children
    if (project.children?.length > 0) {
      throw new BadRequestException('Cannot delete project with sub-projects');
    }

    // Check if project has tasks
    if (project.tasks?.length > 0) {
      throw new BadRequestException('Cannot delete project with tasks');
    }

    const result = await this.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }
  }

  async archiveProject(id: string): Promise<Project> {
    const project = await this.getProjectById(id);

    // Archive project and all sub-projects
    await this.createQueryBuilder()
      .update(Project)
      .set({ isArchived: true })
      .where('id = :id', { id })
      .orWhere('parent = :id', { id })
      .execute();

    return this.getProjectById(id);
  }

  async reorderProjects(projectIds: string[]): Promise<void> {
    await Promise.all(
      projectIds.map((id, index) =>
        this.createQueryBuilder()
          .update(Project)
          .set({ order: index })
          .where('id = :id', { id })
          .execute(),
      ),
    );
  }

  private async wouldCreateCircularReference(
    projectId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId = newParentId;
    const seen = new Set<string>();

    while (currentId) {
      if (currentId === projectId) return true;
      if (seen.has(currentId)) return true;

      seen.add(currentId);
      const current = await this.findOne({
        where: { id: currentId },
        relations: ['parent'],
      });
      currentId = current?.parent?.id;
    }

    return false;
  }

  async getProjectTree(rootId?: string): Promise<Project[]> {
    const trees = await this.findTrees({
      relations: ['tasks'],
    });
    return rootId ? trees.filter((tree) => tree.id === rootId) : trees;
  }

  async getProjectAncestors(id: string): Promise<Project[]> {
    const project = await this.findOne({ where: { id } });
    if (!project)
      throw new NotFoundException(`Project with ID "${id}" not found`);
    return this.createAncestorsQueryBuilder(
      'project',
      'projectClosure',
      project,
    ).getMany();
  }

  async getProjectDescendants(id: string): Promise<Project[]> {
    const project = await this.findOne({ where: { id } });
    if (!project)
      throw new NotFoundException(`Project with ID "${id}" not found`);
    return this.createDescendantsQueryBuilder(
      'project',
      'projectClosure',
      project,
    ).getMany();
  }

  async moveProject(
    id: string,
    targetId: string | null,
    position: 'before' | 'after' | 'inside',
  ): Promise<void> {
    const project = await this.getProjectById(id);

    if (targetId) {
      const target = await this.getProjectById(targetId);

      switch (position) {
        case 'before':
        case 'after':
          project.parent = target.parent;
          break;
        case 'inside':
          project.parent = target;
          break;
      }

      // Update order of affected projects
      if (position === 'before') {
        await this.createQueryBuilder()
          .update(Project)
          .set({ order: () => 'order + 1' })
          .where('order >= :targetOrder', { targetOrder: target.order })
          .execute();

        project.order = target.order;
      } else if (position === 'after') {
        await this.createQueryBuilder()
          .update(Project)
          .set({ order: () => 'order + 1' })
          .where('order > :targetOrder', { targetOrder: target.order })
          .execute();

        project.order = target.order + 1;
      } else {
        // Inside: append to end of children
        const maxOrder = await this.createQueryBuilder('project')
          .where('parent = :parentId', { parentId: target.id })
          .select('MAX(order)', 'maxOrder')
          .getRawOne();

        project.order = (maxOrder?.maxOrder || 0) + 1;
      }
    } else {
      // Moving to root level
      project.parent = null;
      const maxOrder = await this.createQueryBuilder('project')
        .where('parent IS NULL')
        .select('MAX(order)', 'maxOrder')
        .getRawOne();

      project.order = (maxOrder?.maxOrder || 0) + 1;
    }

    await this.save(project);
  }
}
