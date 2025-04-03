import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinColumn,
  JoinTable,
  OneToMany,
  Tree,
  TreeParent,
  TreeChildren,
  TreeRepository,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Injectable } from '@nestjs/common';

// Create test version of Project entity for SQLite compatibility
@Entity()
@Tree('closure-table')
class ProjectTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ default: false })
  isSystem: boolean;

  @TreeParent()
  parent: ProjectTest;

  @TreeChildren()
  children: ProjectTest[];

  @OneToMany(() => TaskTest, (task) => task.project)
  tasks: TaskTest[];

  @Column({ nullable: true })
  color: string;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  tasksCount?: number;
  completedTasksCount?: number;
  progress?: number;
}

// Create test version of Tag entity without char type for SQLite compatibility
@Entity()
class TagTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  color: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isGoal: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => TaskTest, (task) => task.tags)
  tasks: TaskTest[];
}

// Create test version of Task entity for SQLite compatibility
@Entity()
class TaskTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => ProjectTest, { nullable: true })
  @JoinColumn({ name: 'projectId' })
  project: ProjectTest;

  @Column({ nullable: true })
  status: string;

  @ManyToMany(() => TagTest, (tag) => tag.tasks)
  @JoinTable()
  tags: TagTest[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Simple filter interface for testing
interface ProjectFilter {
  search?: string;
  parentId?: string;
  includeArchived?: boolean;
  includeSystem?: boolean;
}

// Test implementation of ProjectsRepository
@Injectable()
class ProjectsRepositoryTest extends TreeRepository<ProjectTest> {
  constructor(private dataSource: DataSource) {
    super(ProjectTest, dataSource.createEntityManager());
  }

  async getProjects(filterDto: ProjectFilter = {}): Promise<ProjectTest[]> {
    const {
      search,
      includeArchived = false,
      includeSystem = true,
      parentId,
    } = filterDto;

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

    return query.getMany();
  }

  async getProjectById(id: string): Promise<ProjectTest> {
    const project = await this.findOne({
      where: { id },
      relations: ['parent', 'children', 'tasks'],
    });

    if (!project) {
      return null;
    }

    return project;
  }

  async createProject(createProjectDto: any): Promise<ProjectTest> {
    const { parentId, ...projectData } = createProjectDto;

    let parent: ProjectTest | undefined;
    if (parentId) {
      parent = await this.findOne({ where: { id: parentId } });
    }

    const projectEntity = new ProjectTest();
    Object.assign(projectEntity, {
      ...projectData,
      parent,
    });

    const savedProject = await this.save(projectEntity);
    return this.getProjectById(savedProject.id);
  }

  async updateProject(id: string, updateProjectDto: any): Promise<ProjectTest> {
    const { parentId, ...projectData } = updateProjectDto;

    const project = await this.getProjectById(id);
    if (!project) {
      return null;
    }

    if (parentId !== undefined) {
      if (parentId === null) {
        project.parent = null;
      } else {
        const parent = await this.findOne({ where: { id: parentId } });
        if (parent) {
          project.parent = parent;
        }
      }
    }

    Object.assign(project, projectData);
    await this.save(project);
    return this.getProjectById(id);
  }

  async deleteProject(id: string): Promise<void> {
    const result = await this.delete(id);
    if (result.affected === 0) {
      throw new Error(`Project with ID "${id}" not found`);
    }
  }

  async archiveProject(id: string): Promise<ProjectTest> {
    const project = await this.getProjectById(id);
    if (!project) {
      return null;
    }

    project.isArchived = true;
    await this.save(project);

    return project;
  }

  async reorderProjects(projectIds: string[]): Promise<void> {
    await Promise.all(
      projectIds.map((id, index) => this.update(id, { order: index })),
    );
  }

  async getProjectAncestors(id: string): Promise<ProjectTest[]> {
    const project = await this.findOne({ where: { id } });
    if (!project) return [];

    return this.createAncestorsQueryBuilder(
      'project',
      'projectClosure',
      project,
    ).getMany();
  }

  async getProjectDescendants(id: string): Promise<ProjectTest[]> {
    const project = await this.findOne({ where: { id } });
    if (!project) return [];

    return this.createDescendantsQueryBuilder(
      'project',
      'projectClosure',
      project,
    ).getMany();
  }

  async moveProject(
    id: string,
    targetId: string,
    position: string = 'inside',
  ): Promise<void> {
    const project = await this.getProjectById(id);
    if (!project) return;

    const target = await this.getProjectById(targetId);
    if (!target) return;

    if (position === 'inside') {
      project.parent = target;
    }

    await this.save(project);
  }
}

describe('ProjectsRepository Integration Tests', () => {
  let dataSource: DataSource;
  let projectsRepository: ProjectsRepositoryTest;
  let projectRepo: Repository<ProjectTest>;
  let taskRepo: Repository<TaskTest>;
  let tagRepo: Repository<TagTest>;

  beforeAll(async () => {
    // Create an in-memory SQLite database for testing
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [ProjectTest, TaskTest, TagTest],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();

    projectsRepository = new ProjectsRepositoryTest(dataSource);
    projectRepo = dataSource.getRepository(ProjectTest);
    taskRepo = dataSource.getRepository(TaskTest);
    tagRepo = dataSource.getRepository(TagTest);

    await seedDatabase();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // Clear the database tables before each test
    await taskRepo.clear();
    await tagRepo.clear();
    await projectRepo.clear();

    // Reseed the database for each test
    await seedDatabase();
  });

  async function seedDatabase() {
    // Create some tags
    const tag1 = tagRepo.create({
      name: 'Work',
      color: '#FF0000',
    });

    const tag2 = tagRepo.create({
      name: 'Personal',
      color: '#00FF00',
    });

    await tagRepo.save([tag1, tag2]);

    // Create some projects
    const parentProject = projectRepo.create({
      name: 'Parent Project',
      description: 'A parent project',
      isArchived: false,
      order: 1,
      isSystem: false,
    });

    await projectRepo.save(parentProject);

    const childProject1 = projectRepo.create({
      name: 'Child Project 1',
      description: 'A child project',
      isArchived: false,
      order: 1,
      parent: parentProject,
      isSystem: false,
    });

    const childProject2 = projectRepo.create({
      name: 'Child Project 2',
      description: 'Another child project',
      isArchived: false,
      order: 2,
      parent: parentProject,
      isSystem: false,
    });

    const archivedProject = projectRepo.create({
      name: 'Archived Project',
      description: 'An archived project',
      isArchived: true,
      order: 3,
      isSystem: false,
    });

    const systemProject = projectRepo.create({
      name: 'Inbox',
      description: 'System project - Inbox',
      isArchived: false,
      order: 0,
      isSystem: true,
    });

    await projectRepo.save([
      childProject1,
      childProject2,
      archivedProject,
      systemProject,
    ]);

    // Create some tasks associated with projects
    const task1 = taskRepo.create({
      title: 'Task 1',
      description: 'Task in parent project',
      project: parentProject,
      status: 'NOT_STARTED',
      tags: [tag1],
    });

    const task2 = taskRepo.create({
      title: 'Task 2',
      description: 'Task in child project',
      project: childProject1,
      status: 'NOT_STARTED',
      tags: [tag1, tag2],
    });

    await taskRepo.save([task1, task2]);
  }

  // Test suite for CRUD operations
  describe('CRUD Operations', () => {
    it('should retrieve all projects without filters', async () => {
      const result = await projectsRepository.getProjects();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((p) => p.name === 'Parent Project')).toBe(true);
    });

    it('should filter projects by search term', async () => {
      const searchDto = { search: 'Child' };
      const result = await projectsRepository.getProjects(searchDto);
      expect(result.length).toBe(2);
      expect(result.every((p) => p.name.includes('Child'))).toBe(true);
    });

    it('should filter projects by parent ID', async () => {
      const parentProject = await projectRepo.findOne({
        where: { name: 'Parent Project' },
      });
      const searchDto = { parentId: parentProject.id };
      const result = await projectsRepository.getProjects(searchDto);
      expect(result.length).toBe(2);
      expect(
        result.every((p) => p.parent && p.parent.id === parentProject.id),
      ).toBe(true);
    });

    it('should retrieve project by ID', async () => {
      const parentProject = await projectRepo.findOne({
        where: { name: 'Parent Project' },
      });
      const result = await projectsRepository.getProjectById(parentProject.id);
      expect(result).toBeDefined();
      expect(result.name).toBe('Parent Project');
    });

    it('should return null for non-existent project ID', async () => {
      const result = await projectsRepository.getProjectById(uuid());
      expect(result).toBeNull();
    });

    it('should create a new project', async () => {
      const newProject = {
        name: 'New Project',
        description: 'A new project created in test',
      };

      const result = await projectsRepository.createProject(newProject);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('New Project');

      // Verify in database
      const savedProject = await projectRepo.findOne({
        where: { id: result.id },
      });
      expect(savedProject).toBeDefined();
      expect(savedProject.name).toBe('New Project');
    });

    it('should create a child project', async () => {
      const parentProject = await projectRepo.findOne({
        where: { name: 'Parent Project' },
      });

      const newChildProject = {
        name: 'New Child Project',
        description: 'A new child project',
        parentId: parentProject.id,
      };

      const result = await projectsRepository.createProject(newChildProject);
      expect(result).toBeDefined();
      expect(result.parent).toBeDefined();

      // Verify in database
      const savedProject = await projectRepo.findOne({
        where: { id: result.id },
        relations: ['parent'],
      });
      expect(savedProject).toBeDefined();
      expect(savedProject.parent.id).toBe(parentProject.id);
    });

    it('should update a project', async () => {
      const projectToUpdate = await projectRepo.findOne({
        where: { name: 'Child Project 1' },
      });

      const updateData = {
        name: 'Updated Child Project',
        description: 'Updated description',
      };

      const result = await projectsRepository.updateProject(
        projectToUpdate.id,
        updateData,
      );
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Child Project');

      // Verify in database
      const updatedProject = await projectRepo.findOne({
        where: { id: projectToUpdate.id },
      });
      expect(updatedProject.name).toBe('Updated Child Project');
      expect(updatedProject.description).toBe('Updated description');
    });

    it('should delete a project', async () => {
      const projectToDelete = await projectRepo.findOne({
        where: { name: 'Child Project 2' },
      });

      await projectsRepository.deleteProject(projectToDelete.id);

      // Verify it's deleted
      const deletedProject = await projectRepo.findOne({
        where: { id: projectToDelete.id },
      });
      expect(deletedProject).toBeNull();
    });

    it('should throw an error when deleting a non-existent project', async () => {
      await expect(projectsRepository.deleteProject(uuid())).rejects.toThrow();
    });
  });

  // Test suite for tree operations
  describe('Tree Operations', () => {
    it('should retrieve project ancestors', async () => {
      const childProject = await projectRepo.findOne({
        where: { name: 'Child Project 1' },
      });

      const ancestors = await projectsRepository.getProjectAncestors(
        childProject.id,
      );
      expect(ancestors.length).toBe(2);
      expect(ancestors.some((p) => p.name === 'Parent Project')).toBe(true);
    });

    it('should retrieve project descendants', async () => {
      const parentProject = await projectRepo.findOne({
        where: { name: 'Parent Project' },
      });

      const descendants = await projectsRepository.getProjectDescendants(
        parentProject.id,
      );
      expect(descendants.length).toBe(3);
      expect(descendants.some((p) => p.name === 'Child Project 1')).toBe(true);
      expect(descendants.some((p) => p.name === 'Child Project 2')).toBe(true);
    });

    it('should move a project to a new parent', async () => {
      const childProject1 = await projectRepo.findOne({
        where: { name: 'Child Project 1' },
      });
      const childProject2 = await projectRepo.findOne({
        where: { name: 'Child Project 2' },
      });

      await projectsRepository.moveProject(
        childProject2.id,
        childProject1.id,
        'inside',
      );

      // Verify the move
      const movedProject = await projectRepo.findOne({
        where: { id: childProject2.id },
        relations: ['parent'],
      });

      expect(movedProject.parent.id).toBe(childProject1.id);
    });
  });

  describe('Project Archiving', () => {
    it('should archive a project', async () => {
      const projectToArchive = await projectRepo.findOne({
        where: { name: 'Child Project 1' },
      });

      await projectsRepository.archiveProject(projectToArchive.id);

      // Verify it's archived
      const archivedProject = await projectRepo.findOne({
        where: { id: projectToArchive.id },
      });
      expect(archivedProject.isArchived).toBe(true);
    });

    it('should unarchive a project', async () => {
      const archivedProject = await projectRepo.findOne({
        where: { name: 'Archived Project' },
      });

      // Manual unarchive
      archivedProject.isArchived = false;
      await projectRepo.save(archivedProject);

      // Verify it's unarchived
      const unarchivedProject = await projectRepo.findOne({
        where: { id: archivedProject.id },
      });
      expect(unarchivedProject.isArchived).toBe(false);
    });
  });

  describe('Project Reordering', () => {
    it('should reorder projects', async () => {
      const childProject1 = await projectRepo.findOne({
        where: { name: 'Child Project 1' },
      });
      const childProject2 = await projectRepo.findOne({
        where: { name: 'Child Project 2' },
      });

      // Swap the order using project IDs
      await projectsRepository.reorderProjects([
        childProject1.id,
        childProject2.id,
      ]);

      // Verify the new order
      const updatedChild1 = await projectRepo.findOne({
        where: { id: childProject1.id },
      });
      const updatedChild2 = await projectRepo.findOne({
        where: { id: childProject2.id },
      });

      expect(updatedChild1.order).toBe(0);
      expect(updatedChild2.order).toBe(1);
    });
  });
});
