import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, DeepPartial } from 'typeorm';
import { ProjectsRepository } from '../../../../src/projects/projects.repository';
import { Project, ProjectType } from '../../../../src/projects/projects.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilterDto,
} from '../../../../src/projects/projects.dto';
import { Task, TaskStatus } from '../../../../src/tasks/tasks.entity';

// Mock repository types
type MockRepository<T = any> = {
  findOne: jest.Mock<any, any>;
  find: jest.Mock<any, any>;
  findBy: jest.Mock<any, any>;
  create: jest.Mock<any, any>;
  save: jest.Mock<any, any>;
  update: jest.Mock<any, any>;
  delete: jest.Mock<any, any>;
  count: jest.Mock<any, any>;
  createQueryBuilder: jest.Mock<any, any>;
  findTrees: jest.Mock<any, any>;
  createAncestorsQueryBuilder: jest.Mock<any, any>;
  createDescendantsQueryBuilder: jest.Mock<any, any>;
};

describe('ProjectsRepository', () => {
  let repository: ProjectsRepository;
  let mockDataSource;
  let mockQueryBuilder;
  let mockRawQueryResult;

  beforeEach(async () => {
    // Setup mock query builder
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getCount: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };

    // Setup mock raw query result
    mockRawQueryResult = {
      maxOrder: 5,
    };

    // Setup mock data source
    mockDataSource = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      createEntityManager: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        find: jest.fn(),
        findBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
      }),
      manager: {
        findOne: jest.fn(),
        find: jest.fn(),
        findBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProjectsRepository,
          useFactory: () => {
            const repo = new ProjectsRepository(mockDataSource);
            return repo;
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<ProjectsRepository>(ProjectsRepository);

    // Mock repository methods
    jest
      .spyOn(repository, 'createQueryBuilder')
      .mockImplementation(() => mockQueryBuilder);
    jest.spyOn(repository, 'findOne').mockImplementation(jest.fn());
    jest.spyOn(repository, 'find').mockImplementation(jest.fn());
    jest
      .spyOn(repository, 'save')
      .mockImplementation((entity) => Promise.resolve(entity as Project));
    jest.spyOn(repository, 'delete').mockImplementation(jest.fn());
    jest.spyOn(repository, 'create').mockImplementation(jest.fn());
    jest.spyOn(repository, 'findTrees').mockImplementation(jest.fn());
    jest
      .spyOn(repository, 'createAncestorsQueryBuilder')
      .mockImplementation(jest.fn());
    jest
      .spyOn(repository, 'createDescendantsQueryBuilder')
      .mockImplementation(jest.fn());
  });

  // Helper method to create a mock Project
  const createMockProject = (
    id: string,
    name: string,
    isSystem = false,
  ): Project => {
    const project = new Project();
    project.id = id;
    project.name = name;
    project.description = 'Test project';
    project.isArchived = false;
    project.isSystem = isSystem;
    project.type = ProjectType.REGULAR;
    project.parent = null;
    project.children = [];
    project.tasks = [];
    project.color = '#000000';
    project.order = 1;
    project.createdAt = new Date();
    project.updatedAt = new Date();
    project.tasksCount = 0;
    project.completedTasksCount = 0;
    project.progress = 0;
    return project;
  };

  // Helper method to create a mock Task within a Project
  const createMockTask = (
    id: string,
    title: string,
    status: TaskStatus,
  ): Task => {
    const task = new Task();
    task.id = id;
    task.title = title;
    task.status = status;
    return task;
  };

  describe('getProjects', () => {
    it('should return projects based on filter criteria', async () => {
      // Arrange
      const filterDto: ProjectFilterDto = {
        search: 'test',
        includeArchived: false,
        includeSystem: false,
        parentId: null,
      };

      const mockProjects = [
        createMockProject('proj-1', 'Test Project 1'),
        createMockProject('proj-2', 'Test Project 2'),
      ];

      // Add tasks to test projects
      mockProjects[0].tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.COMPLETED),
        createMockTask('task-2', 'Task 2', TaskStatus.NOT_STARTED),
      ];
      mockProjects[1].tasks = [
        createMockTask('task-3', 'Task 3', TaskStatus.IN_PROGRESS),
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockProjects);

      // Act
      const result = await repository.getProjects(filterDto);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].tasksCount).toBe(2);
      expect(result[0].completedTasksCount).toBe(1);
      expect(result[0].progress).toBe(50);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'project.isArchived = :isArchived',
        { isArchived: false },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.isSystem = :isSystem',
        { isSystem: false },
      );
    });

    it('should filter by parent ID when specified', async () => {
      // Arrange
      const filterDto: ProjectFilterDto = {
        search: '',
        includeArchived: false,
        includeSystem: true,
        parentId: 'parent-id',
      };

      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await repository.getProjects(filterDto);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'parent.id = :parentId',
        { parentId: 'parent-id' },
      );
    });

    it('should filter root projects when parentId is null', async () => {
      // Arrange
      const filterDto: ProjectFilterDto = {
        search: '',
        includeArchived: true,
        includeSystem: true,
        parentId: null,
      };

      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await repository.getProjects(filterDto);

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'project.parent IS NULL',
      );
    });
  });

  describe('getProjectById', () => {
    it('should return a project by ID with statistics', async () => {
      // Arrange
      const projectId = 'proj-1';
      const mockProject = createMockProject(projectId, 'Test Project');
      mockProject.tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.COMPLETED),
        createMockTask('task-2', 'Task 2', TaskStatus.NOT_STARTED),
      ];

      mockQueryBuilder.getOne.mockResolvedValue(mockProject);

      // Act
      const result = await repository.getProjectById(projectId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(projectId);
      expect(result.tasksCount).toBe(2);
      expect(result.completedTasksCount).toBe(1);
      expect(result.progress).toBe(50);
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.getProjectById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createProject', () => {
    it('should create a project without parent', async () => {
      // Arrange
      const createProjectDto: CreateProjectDto = {
        name: 'New Project',
        description: 'Test description',
      };

      const mockProject = createMockProject('new-proj-id', 'New Project');
      mockProject.order = 6;
      jest.spyOn(repository, 'create').mockReturnValue(mockProject);
      jest.spyOn(repository, 'save').mockResolvedValue(mockProject);
      jest.spyOn(repository, 'getProjectById').mockResolvedValue(mockProject);

      mockQueryBuilder.getRawOne.mockResolvedValue({ maxOrder: 5 });

      // Act
      const result = await repository.createProject(createProjectDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('New Project');
      expect(result.order).toBe(6);
    });

    it('should create a project with parent', async () => {
      // Arrange
      const parentId = 'parent-id';
      const createProjectDto: CreateProjectDto = {
        name: 'Child Project',
        description: 'Child description',
        parentId,
      };

      const parentProject = createMockProject(parentId, 'Parent Project');
      const childProject = createMockProject('child-id', 'Child Project');
      childProject.parent = parentProject;
      childProject.order = 4;

      jest.spyOn(repository, 'findOne').mockResolvedValue(parentProject);
      jest.spyOn(repository, 'create').mockReturnValue(childProject);
      jest.spyOn(repository, 'save').mockResolvedValue(childProject);
      jest.spyOn(repository, 'getProjectById').mockResolvedValue(childProject);

      mockQueryBuilder.getRawOne.mockResolvedValue({ maxOrder: 3 });

      // Act
      const result = await repository.createProject(createProjectDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('Child Project');
      expect(result.parent).toBeDefined();
      expect(result.parent.id).toBe(parentId);
      expect(result.order).toBe(4);
    });

    it('should throw NotFoundException when parent project not found', async () => {
      // Arrange
      const createProjectDto: CreateProjectDto = {
        name: 'Invalid Child',
        description: 'Test',
        parentId: 'non-existent-parent',
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(repository.createProject(createProjectDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProject', () => {
    it('should update project properties', async () => {
      // Arrange
      const projectId = 'proj-1';
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated description',
      };

      const mockProject = createMockProject(projectId, 'Test Project');
      const updatedProject = createMockProject(projectId, 'Updated Project');
      updatedProject.description = 'Updated description';

      jest
        .spyOn(repository, 'getProjectById')
        .mockResolvedValueOnce(mockProject);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedProject);
      jest
        .spyOn(repository, 'getProjectById')
        .mockResolvedValueOnce(updatedProject);

      // Act
      const result = await repository.updateProject(
        projectId,
        updateProjectDto,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Project');
      expect(result.description).toBe('Updated description');
    });

    it('should update project parent', async () => {
      // Arrange
      const projectId = 'proj-1';
      const newParentId = 'parent-id';
      const updateProjectDto: UpdateProjectDto = {
        name: 'Test Project',
        parentId: newParentId,
      };

      const mockProject = createMockProject(projectId, 'Test Project');
      const parentProject = createMockProject(newParentId, 'Parent Project');
      const updatedProject = createMockProject(projectId, 'Test Project');
      updatedProject.parent = parentProject;

      jest
        .spyOn(repository, 'getProjectById')
        .mockResolvedValueOnce(mockProject);
      jest
        .spyOn(repository, 'wouldCreateCircularReference' as any)
        .mockResolvedValue(false);
      jest.spyOn(repository, 'findOne').mockResolvedValue(parentProject);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedProject);
      jest
        .spyOn(repository, 'getProjectById')
        .mockResolvedValueOnce(updatedProject);

      // Act
      const result = await repository.updateProject(
        projectId,
        updateProjectDto,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.parent).toBeDefined();
      expect(result.parent.id).toBe(newParentId);
    });

    it('should prevent circular references when updating parent', async () => {
      // Arrange
      const projectId = 'proj-1';
      const childId = 'child-id';
      const updateProjectDto: UpdateProjectDto = {
        name: 'Test Project',
        parentId: childId,
      };

      const mockProject = createMockProject(projectId, 'Test Project');

      jest.spyOn(repository, 'getProjectById').mockResolvedValue(mockProject);
      jest
        .spyOn(repository, 'wouldCreateCircularReference' as any)
        .mockResolvedValue(true);

      // Act & Assert
      await expect(
        repository.updateProject(projectId, updateProjectDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      // Arrange
      const projectId = 'proj-1';
      const mockProject = createMockProject(projectId, 'Test Project');
      mockProject.children = [];
      mockProject.tasks = [];

      jest.spyOn(repository, 'getProjectById').mockResolvedValue(mockProject);
      jest
        .spyOn(repository, 'delete')
        .mockResolvedValue({ affected: 1, raw: {} });

      // Act
      await repository.deleteProject(projectId);

      // Assert
      expect(repository.delete).toHaveBeenCalledWith(projectId);
    });

    it('should prevent deletion of system projects', async () => {
      // Arrange
      const projectId = 'system-proj';
      const mockProject = createMockProject(projectId, 'System Project', true);

      jest.spyOn(repository, 'getProjectById').mockResolvedValue(mockProject);

      // Act & Assert
      await expect(repository.deleteProject(projectId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should prevent deletion of projects with children', async () => {
      // Arrange
      const projectId = 'parent-proj';
      const mockProject = createMockProject(projectId, 'Parent Project');
      mockProject.children = [createMockProject('child-id', 'Child Project')];

      jest.spyOn(repository, 'getProjectById').mockResolvedValue(mockProject);

      // Act & Assert
      await expect(repository.deleteProject(projectId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should prevent deletion of projects with tasks', async () => {
      // Arrange
      const projectId = 'proj-with-tasks';
      const mockProject = createMockProject(projectId, 'Project With Tasks');
      mockProject.tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.NOT_STARTED),
      ];

      jest.spyOn(repository, 'getProjectById').mockResolvedValue(mockProject);

      // Act & Assert
      await expect(repository.deleteProject(projectId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProjectTree', () => {
    it('should return all project trees when no rootId is provided', async () => {
      // Arrange
      const mockProjects = [
        createMockProject('proj-1', 'Project 1'),
        createMockProject('proj-2', 'Project 2'),
      ];

      jest.spyOn(repository, 'findTrees').mockResolvedValue(mockProjects);

      // Act
      const result = await repository.getProjectTree();

      // Assert
      expect(result).toHaveLength(2);
      expect(repository.findTrees).toHaveBeenCalledWith({
        relations: ['tasks'],
      });
    });

    it('should filter by rootId when provided', async () => {
      // Arrange
      const rootId = 'proj-1';
      const mockProjects = [
        createMockProject(rootId, 'Project 1'),
        createMockProject('proj-2', 'Project 2'),
      ];

      jest.spyOn(repository, 'findTrees').mockResolvedValue(mockProjects);

      // Act
      const result = await repository.getProjectTree(rootId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(rootId);
    });
  });

  describe('getProjectAncestors', () => {
    it('should return project ancestors', async () => {
      // Arrange
      const projectId = 'proj-1';
      const mockProject = createMockProject(projectId, 'Test Project');
      const mockAncestors = [
        createMockProject('parent-1', 'Parent 1'),
        createMockProject('parent-2', 'Parent 2'),
      ];

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(repository, 'createAncestorsQueryBuilder').mockReturnValue({
        getMany: jest.fn().mockResolvedValue(mockAncestors),
      } as any);

      // Act
      const result = await repository.getProjectAncestors(projectId);

      // Assert
      expect(result).toHaveLength(2);
      expect(repository.createAncestorsQueryBuilder).toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        repository.getProjectAncestors('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProjectDescendants', () => {
    it('should return project descendants', async () => {
      // Arrange
      const projectId = 'proj-1';
      const mockProject = createMockProject(projectId, 'Test Project');
      const mockDescendants = [
        createMockProject('child-1', 'Child 1'),
        createMockProject('child-2', 'Child 2'),
      ];

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(repository, 'createDescendantsQueryBuilder').mockReturnValue({
        getMany: jest.fn().mockResolvedValue(mockDescendants),
      } as any);

      // Act
      const result = await repository.getProjectDescendants(projectId);

      // Assert
      expect(result).toHaveLength(2);
      expect(repository.createDescendantsQueryBuilder).toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        repository.getProjectDescendants('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('moveProject', () => {
    it('should move project before target', async () => {
      // Arrange
      const projectId = 'proj-1';
      const targetId = 'target-1';
      const position = 'before';

      const mockProject = createMockProject(projectId, 'Project');
      const mockTarget = createMockProject(targetId, 'Target');
      mockTarget.order = 3;

      jest
        .spyOn(repository, 'getProjectById')
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockTarget);

      jest.spyOn(repository, 'save').mockResolvedValue(mockProject);
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      // Act
      await repository.moveProject(projectId, targetId, position);

      // Assert
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'order >= :targetOrder',
        { targetOrder: 3 },
      );
    });

    it('should move project after target', async () => {
      // Arrange
      const projectId = 'proj-1';
      const targetId = 'target-1';
      const position = 'after';

      const mockProject = createMockProject(projectId, 'Project');
      const mockTarget = createMockProject(targetId, 'Target');
      mockTarget.order = 3;

      jest
        .spyOn(repository, 'getProjectById')
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockTarget);

      jest.spyOn(repository, 'save').mockResolvedValue(mockProject);
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      // Act
      await repository.moveProject(projectId, targetId, position);

      // Assert
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'order > :targetOrder',
        { targetOrder: 3 },
      );
    });

    it('should move project inside target', async () => {
      // Arrange
      const projectId = 'proj-1';
      const targetId = 'target-1';
      const position = 'inside';

      const mockProject = createMockProject(projectId, 'Project');
      const mockTarget = createMockProject(targetId, 'Target');

      jest
        .spyOn(repository, 'getProjectById')
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockTarget);

      jest.spyOn(repository, 'save').mockResolvedValue(mockProject);
      mockQueryBuilder.getRawOne.mockResolvedValue({ maxOrder: 5 });

      // Act
      await repository.moveProject(projectId, targetId, position);

      // Assert
      expect(mockProject.parent).toBe(mockTarget);
      expect(mockProject.order).toBe(6);
    });

    it('should move project to root level', async () => {
      // Arrange
      const projectId = 'proj-1';

      const mockProject = createMockProject(projectId, 'Project');
      mockProject.parent = createMockProject('parent-id', 'Parent');

      jest.spyOn(repository, 'getProjectById').mockResolvedValue(mockProject);
      jest.spyOn(repository, 'save').mockResolvedValue(mockProject);
      mockQueryBuilder.getRawOne.mockResolvedValue({ maxOrder: 10 });

      // Act
      await repository.moveProject(projectId, null, 'inside');

      // Assert
      expect(mockProject.parent).toBeNull();
      expect(mockProject.order).toBe(11);
    });
  });

  describe('archiveProject', () => {
    it('should archive a project and return the updated project', async () => {
      // Arrange
      const projectId = 'proj-1';
      const mockProject = createMockProject(projectId, 'Test Project');
      const archivedProject = createMockProject(projectId, 'Test Project');
      archivedProject.isArchived = true;

      jest
        .spyOn(repository, 'getProjectById')
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(archivedProject);
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      // Act
      const result = await repository.archiveProject(projectId);

      // Assert
      expect(result).toBeDefined();
      expect(result.isArchived).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ isArchived: true });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: projectId,
      });
      expect(mockQueryBuilder.orWhere).toHaveBeenCalledWith('parent = :id', {
        id: projectId,
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      // Arrange
      jest
        .spyOn(repository, 'getProjectById')
        .mockRejectedValue(
          new NotFoundException(`Project with ID "non-existent" not found`),
        );

      // Act & Assert
      await expect(repository.archiveProject('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorderProjects', () => {
    it('should update the order of multiple projects', async () => {
      // Arrange
      const projectIds = ['proj-1', 'proj-2', 'proj-3'];
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      // Act
      await repository.reorderProjects(projectIds);

      // Assert
      expect(mockQueryBuilder.update).toHaveBeenCalledTimes(3);
      expect(mockQueryBuilder.set).toHaveBeenCalledTimes(3);
      expect(mockQueryBuilder.where).toHaveBeenCalledTimes(3);

      // Verify each project was ordered correctly
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ order: 0 });
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ order: 1 });
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ order: 2 });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'proj-1',
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'proj-2',
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'proj-3',
      });
    });
  });
});
