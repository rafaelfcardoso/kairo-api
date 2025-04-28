import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from '../../../../src/projects/projects.service';
import { ProjectsRepository } from '../../../../src/projects/projects.repository';
import { TasksRepository } from '../../../../src/tasks/tasks.repository';
import { Project, ProjectType } from '../../../../src/projects/projects.entity';
import {
  CreateProjectDto,
  ProjectFilterDto,
  UpdateProjectDto,
  ProjectMoveDto,
} from '../../../../src/projects/projects.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  TaskStatus,
  Task,
  TaskPriority,
} from '../../../../src/tasks/tasks.entity';
import { mockUser } from '../../../mocks/request.mock';
import { SecurityLoggerService } from '../../../../src/common/services/security-logger.service';
import { In } from 'typeorm';
import { User } from '../../../../src/entities/user.entity';
import { IsNotEmpty } from 'class-validator';

describe.skip('ProjectsService', () => {
  let projectsService: ProjectsService;
  let projectsRepository: jest.Mocked<ProjectsRepository>;
  let tasksRepository: jest.Mocked<TasksRepository>;
  let securityLogger: jest.Mocked<SecurityLoggerService>;
  const testUserId = mockUser.id;

  const mockProjectsRepository = () => ({
    getProjects: jest.fn(),
    getProjectById: jest.fn(),
    createProject: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ ...dto })),
    save: jest.fn().mockImplementation(async (entity) => entity),
    updateProject: jest.fn(),
    delete: jest.fn(), // For base TypeORM delete
    deleteProject: jest.fn(), // Specific repo method if exists
    findOne: jest.fn(),
    find: jest.fn(),
    archiveProject: jest.fn(),
    moveProject: jest.fn(),
    reorderProjects: jest.fn(),
    getProjectTree: jest.fn(),
    getProjectAncestors: jest.fn(),
    getProjectDescendants: jest.fn(),
    searchProjects: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
      execute: jest.fn().mockResolvedValue(undefined),
    })),
  });

  const mockTasksRepository = () => ({
    createTask: jest.fn(),
    getTaskById: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  });

  const mockSecurityLoggerService = () => ({
    log: jest.fn(),
    logSuspiciousActivity: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ProjectsRepository, useFactory: mockProjectsRepository },
        { provide: TasksRepository, useFactory: mockTasksRepository },
        {
          provide: SecurityLoggerService,
          useFactory: mockSecurityLoggerService,
        },
      ],
    }).compile();

    projectsService = module.get<ProjectsService>(ProjectsService);
    projectsRepository = module.get(
      ProjectsRepository,
    ) as jest.Mocked<ProjectsRepository>;
    tasksRepository = module.get(
      TasksRepository,
    ) as jest.Mocked<TasksRepository>;
    securityLogger = module.get(
      SecurityLoggerService,
    ) as jest.Mocked<SecurityLoggerService>;
  });

  // Restore setupOwnershipCheckMocks with refined logic
  const setupOwnershipCheckMocks = (project: Project | null) => {
    if (project) {
      project.tasks = project.tasks ?? [];
      project.children = project.children ?? [];
    }

    projectsRepository.getProjectById.mockImplementation(async (id, userId) => {
      if (!project || project.id !== id) {
        throw new NotFoundException(`Project with ID "${id}" not found`);
      }
      if (project.userId === userId || project.isSystem) {
        return project; // Return initialized project on ownership pass
      }
      // ID matches, but ownership check fails
      throw new NotFoundException(`Project with ID "${id}" not found`);
    });

    projectsRepository.findOne.mockImplementation(async (options: any) => {
      const id = options?.where?.id;
      // Return initialized project if ID matches, null otherwise.
      // Let service handle further checks (like ownership if needed after findOne).
      if (project && project.id === id) {
        return project;
      }
      return null;
    });

    tasksRepository.getTaskById.mockImplementation(async (id) => {
      // Keep signature as (id)
      const mockTask = new Task();
      mockTask.id = id;
      if (project) {
        // If project context exists
        mockTask.project = project; // Link task to project
        return mockTask;
      }
      throw new NotFoundException(`Task with ID "${id}" not found`);
    });
  };

  describe('getProjects', () => {
    it('should call repository with filter DTO and return projects', async () => {
      const mockProject = new Project();
      mockProject.id = 'test-id';
      const filterDto: ProjectFilterDto = { search: 'test' /* other props */ };
      // No setup helper needed if getProjects doesn't use getProjectById/findOne
      projectsRepository.getProjects.mockResolvedValue([mockProject]);

      const result = await projectsService.getProjects(filterDto, testUserId);

      expect(projectsRepository.getProjects).toHaveBeenCalledWith(
        filterDto, // Arg 1
        testUserId, // Arg 2
      );
      expect(result).toEqual([mockProject]);
    });
  });

  describe('getProjectById', () => {
    it('should call repository with ID and return the project', async () => {
      const mockProject = new Project();
      mockProject.id = 'test-id';
      mockProject.userId = testUserId;

      // First mock findOne directly since it's called in checkProjectOwnership
      projectsRepository.findOne.mockResolvedValue(mockProject);

      // Then mock the getProjectById method
      projectsRepository.getProjectById.mockResolvedValue(mockProject);

      const result = await projectsService.getProjectById(
        'test-id',
        testUserId,
      );

      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'test-id',
        testUserId,
      );
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when repository throws it', async () => {
      // Mock findOne for ownership check to simulate project not found
      projectsRepository.findOne.mockResolvedValue(null);

      // We don't expect getProjectById to be called, as the check should fail first
      projectsRepository.getProjectById.mockResolvedValue(null);

      await expect(
        projectsService.getProjectById('non-existent', testUserId),
      ).rejects.toThrow(NotFoundException);

      // Verify findOne was called by checkProjectOwnership
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
      // Verify getProjectById was NOT called because ownership check failed first
      expect(projectsRepository.getProjectById).not.toHaveBeenCalled();
    });
  });

  describe('createProject', () => {
    it('should create and return a new project', async () => {
      const createDto: CreateProjectDto = {
        name: 'New',
        description: 'Desc',
        color: '#fff',
      };
      const mockProject = new Project(); // Setup mock return value
      mockProject.id = 'new-id';
      mockProject.userId = testUserId;

      // Mock the repository method called by the service
      projectsRepository.createProject.mockResolvedValue(mockProject);

      // Mock createQueryBuilder properly
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
      };
      projectsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await projectsService.createProject(createDto, testUserId);

      // Expect the specific repo method to be called
      expect(projectsRepository.createProject).toHaveBeenCalledWith(
        createDto,
        testUserId,
        expect.any(Number),
      );
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException if createProject rejects', async () => {
      const createDto: CreateProjectDto = {
        name: 'New',
        description: 'Desc',
        color: '#fff',
      };

      // Mock createQueryBuilder properly
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
      };
      projectsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Mock the repository method to throw
      projectsRepository.createProject.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      await expect(
        projectsService.createProject(createDto, testUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProject', () => {
    it('should delete an existing project', async () => {
      const mockProject = new Project();
      mockProject.id = 'test-id';
      mockProject.userId = testUserId;
      mockProject.isSystem = false;
      setupOwnershipCheckMocks(mockProject); // Use helper

      // Mock the base repository delete method
      projectsRepository.delete.mockResolvedValue({ affected: 1 } as any);
      // Clear specific deleteProject mock if it exists but isn't used
      projectsRepository.deleteProject?.mockClear();

      await projectsService.deleteProject('test-id', testUserId);

      // findOne check is handled by setup helper mock
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      // Expect base delete with userId
      expect(projectsRepository.delete).toHaveBeenCalledWith(
        'test-id',
        testUserId,
      );
      expect(projectsRepository.deleteProject).not.toHaveBeenCalled(); // Verify specific method wasn't called
    });

    // ... other delete tests using setupOwnershipCheckMocks ...
  });

  describe('reorderProjects', () => {
    it('should reorder projects based on the provided IDs', async () => {
      const projectIds = ['id1', 'id2', 'id3'];
      const mockProjects = projectIds.map((id, i) => ({
        id,
        userId: testUserId,
        order: i,
      })) as Project[];

      // Mock find used for checking projects exist and belong to user
      projectsRepository.find.mockResolvedValue(mockProjects);
      // Mock reorderProjects repository method
      projectsRepository.reorderProjects.mockResolvedValue(undefined);

      await projectsService.reorderProjects(projectIds, testUserId);

      expect(projectsRepository.find).toHaveBeenCalledWith({
        where: { id: In(projectIds), userId: testUserId }, // Expect userId check here
      });
      // Expect repo reorder method call with userId
      expect(projectsRepository.reorderProjects).toHaveBeenCalledWith(
        projectIds,
        testUserId,
      );
    });
  });

  // ... Other tests needing specific mocks or setup helper ...

  describe('duplicateTaskToProject', () => {
    // ... tests ...
    it('should handle recurring tasks correctly', async () => {
      const sourceTask = new Task();
      sourceTask.id = 'recurring-task-id';
      sourceTask.isRecurring = true;
      sourceTask.status = TaskStatus.NOT_STARTED; // Add status property
      const targetProject = new Project();
      targetProject.id = 'target-project-id';
      targetProject.userId = testUserId;

      setupOwnershipCheckMocks(targetProject); // Mocks findOne for target project check
      tasksRepository.getTaskById.mockResolvedValue(sourceTask); // Mocks getTaskById
      tasksRepository.createTask.mockResolvedValue(new Task());

      await projectsService.duplicateTaskToProject(
        'recurring-task-id',
        'target-project-id',
        testUserId,
      );

      expect(tasksRepository.getTaskById).toHaveBeenCalledWith(
        'recurring-task-id',
      );
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'target-project-id' },
      });
      const createTaskCall = tasksRepository.createTask.mock.calls[0][0];
      expect(createTaskCall).not.toHaveProperty('isRecurring');
      expect(createTaskCall).toHaveProperty('projectId', 'target-project-id');
      expect(createTaskCall).toHaveProperty('dueDate', null);
      // Status IS expected now, check it
      expect(createTaskCall).toHaveProperty('status', TaskStatus.NOT_STARTED);
      expect(tasksRepository.createTask).toHaveBeenCalledWith(
        expect.any(Object),
        testUserId,
      );
    });
    // ... other tests in this block ...
  });

  describe('mergeProjects', () => {
    it('should successfully merge a source project into a target project', async () => {
      const mockSourceProject = new Project();
      mockSourceProject.id = 'source-id';
      mockSourceProject.userId = testUserId;
      mockSourceProject.isSystem = false;
      mockSourceProject.tasks = [new Task()];
      mockSourceProject.children = [new Project()];

      const mockTargetProject = new Project();
      mockTargetProject.id = 'target-id';
      mockTargetProject.userId = testUserId;

      projectsRepository.getProjectById.mockImplementation(
        async (id, userId) => {
          if (id === 'source-id' && mockSourceProject.userId === userId)
            return mockSourceProject;
          if (id === 'target-id' && mockTargetProject.userId === userId)
            return mockTargetProject;
          throw new NotFoundException(`Project not found`);
        },
      );

      projectsRepository.findOne.mockImplementation(async (options: any) => {
        const id = options?.where?.id;
        const userIdFromQuery = options?.where?.userId;
        if (id === 'source-id' && userIdFromQuery === testUserId) {
          return mockSourceProject;
        }
        return null;
      });

      const mockTaskQB = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      tasksRepository.createQueryBuilder.mockReturnValue(mockTaskQB as any);

      const mockProjectQB = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      projectsRepository.createQueryBuilder.mockReturnValue(
        mockProjectQB as any,
      );

      projectsRepository.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await projectsService.mergeProjects(
        'source-id',
        'target-id',
        testUserId,
      );

      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'source-id',
        testUserId,
      );
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'target-id',
        testUserId,
      );
      expect(mockTaskQB.set).toHaveBeenCalledWith({
        project: mockTargetProject,
      });
      expect(mockProjectQB.set).toHaveBeenCalledWith({
        parent: mockTargetProject,
      });
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'source-id', userId: testUserId },
      });
      expect(projectsRepository.delete).toHaveBeenCalledWith(
        'source-id',
        testUserId,
      );
      expect(result).toEqual(mockTargetProject);
    });

    it('should skip task migration when source project has no tasks', async () => {
      const mockSourceProject = new Project();
      mockSourceProject.id = 'source-id';
      mockSourceProject.userId = testUserId;
      mockSourceProject.isSystem = false;
      mockSourceProject.tasks = [];
      mockSourceProject.children = [new Project()];

      const mockTargetProject = new Project();
      mockTargetProject.id = 'target-id';
      mockTargetProject.userId = testUserId;

      projectsRepository.getProjectById.mockImplementation(
        async (id, userId) => {
          if (id === 'source-id' && mockSourceProject.userId === userId)
            return mockSourceProject;
          if (id === 'target-id' && mockTargetProject.userId === userId)
            return mockTargetProject;
          throw new NotFoundException(`Project not found`);
        },
      );
      projectsRepository.findOne.mockImplementation(async (options: any) => {
        const id = options?.where?.id;
        const userIdFromQuery = options?.where?.userId;
        if (id === 'source-id' && userIdFromQuery === testUserId)
          return mockSourceProject;
        return null;
      });
      tasksRepository.createQueryBuilder.mockClear();
      const mockProjectQB = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      projectsRepository.createQueryBuilder.mockReturnValue(
        mockProjectQB as any,
      );
      projectsRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await projectsService.mergeProjects('source-id', 'target-id', testUserId);

      expect(tasksRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockProjectQB.set).toHaveBeenCalled();
      expect(projectsRepository.delete).toHaveBeenCalledWith(
        'source-id',
        testUserId,
      );
    });

    it('should skip subproject migration when source project has no children', async () => {
      const mockSourceProject = new Project();
      mockSourceProject.id = 'source-id';
      mockSourceProject.userId = testUserId;
      mockSourceProject.isSystem = false;
      mockSourceProject.tasks = [new Task()];
      mockSourceProject.children = [];

      const mockTargetProject = new Project();
      mockTargetProject.id = 'target-id';
      mockTargetProject.userId = testUserId;

      projectsRepository.getProjectById.mockImplementation(
        async (id, userId) => {
          if (id === 'source-id' && mockSourceProject.userId === userId)
            return mockSourceProject;
          if (id === 'target-id' && mockTargetProject.userId === userId)
            return mockTargetProject;
          throw new NotFoundException(`Project not found`);
        },
      );
      projectsRepository.findOne.mockImplementation(async (options: any) => {
        const id = options?.where?.id;
        const userIdFromQuery = options?.where?.userId;
        if (id === 'source-id' && userIdFromQuery === testUserId)
          return mockSourceProject;
        return null;
      });
      const mockTaskQB = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      tasksRepository.createQueryBuilder.mockReturnValue(mockTaskQB as any);
      projectsRepository.createQueryBuilder.mockClear();
      projectsRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await projectsService.mergeProjects('source-id', 'target-id', testUserId);

      expect(tasksRepository.createQueryBuilder).toHaveBeenCalled();
      expect(projectsRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(projectsRepository.delete).toHaveBeenCalledWith(
        'source-id',
        testUserId,
      );
    });

    it('should throw NotFoundException when source project does not exist', async () => {
      projectsRepository.getProjectById.mockImplementation(
        async (id, userId) => {
          if (id === 'target-id') return new Project();
          throw new NotFoundException(`Project with ID "${id}" not found`);
        },
      );

      await expect(
        projectsService.mergeProjects('non-existent', 'target-id', testUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target project does not exist', async () => {
      projectsRepository.getProjectById.mockImplementation(
        async (id, userId) => {
          if (id === 'source-id') return new Project();
          throw new NotFoundException(`Project with ID "${id}" not found`);
        },
      );

      await expect(
        projectsService.mergeProjects('source-id', 'non-existent', testUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to merge a system project', async () => {
      const mockSystemProject = new Project();
      mockSystemProject.id = 'system-id';
      mockSystemProject.isSystem = true;
      mockSystemProject.tasks = [];
      mockSystemProject.children = [];

      const mockTargetProject = new Project();
      mockTargetProject.id = 'target-id';
      mockTargetProject.userId = testUserId;

      projectsRepository.getProjectById.mockImplementation(
        async (id, userId) => {
          if (id === 'system-id') return mockSystemProject;
          if (id === 'target-id' && mockTargetProject.userId === userId)
            return mockTargetProject;
          throw new NotFoundException(`Project not found`);
        },
      );
      projectsRepository.findOne.mockResolvedValue(mockSystemProject);

      await expect(
        projectsService.mergeProjects('system-id', 'target-id', testUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProjectTimeline', () => {
    it('should return project timeline data with task creation and completion trends', async () => {
      const mockProject = new Project();
      mockProject.id = 'project-id';
      mockProject.userId = testUserId;
      mockProject.tasks = [
        {
          id: 'task1-id',
          title: 'T1',
          description: 'D1',
          priority: TaskPriority.LOW,
          status: TaskStatus.COMPLETED,
          createdAt: new Date('2025-03-01'),
          updatedAt: new Date('2025-03-02'),
          project: mockProject,
          userId: testUserId,
        } as Task,
        {
          id: 'task2-id',
          title: 'T2',
          description: 'D2',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.NOT_STARTED,
          createdAt: new Date('2025-04-01'),
          updatedAt: new Date('2025-04-01'),
          project: mockProject,
          userId: testUserId,
        } as Task,
        {
          id: 'task3-id',
          title: 'T3',
          description: 'D3',
          priority: TaskPriority.HIGH,
          status: TaskStatus.NOT_STARTED,
          createdAt: new Date('2025-05-01'),
          updatedAt: new Date('2025-05-01'),
          project: mockProject,
          userId: testUserId,
        } as Task,
      ];
      projectsRepository.getProjectById.mockResolvedValue(mockProject);

      const result = await projectsService.getProjectTimeline(
        'project-id',
        testUserId,
      );

      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'project-id',
        testUserId,
      );
      expect(result.project).toBe(mockProject);
      expect(result.tasksByMonth).toEqual({
        '2025-03': 1,
        '2025-04': 1,
        '2025-05': 1,
      });
      expect(result.completionTrend).toEqual({
        '2025-03': 1,
        '2025-04': 0,
        '2025-05': 0,
      });
    });

    it('should handle a project with no tasks', async () => {
      const mockProject = new Project();
      mockProject.id = 'empty-project-id';
      mockProject.userId = testUserId;
      mockProject.tasks = [];
      projectsRepository.getProjectById.mockResolvedValue(mockProject);

      const result = await projectsService.getProjectTimeline(
        'empty-project-id',
        testUserId,
      );

      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'empty-project-id',
        testUserId,
      );
      expect(result.project).toBe(mockProject);
      expect(result.tasksByMonth).toEqual({});
      expect(result.completionTrend).toEqual({});
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectsRepository.getProjectById.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      await expect(
        projectsService.getProjectTimeline('non-existent', testUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateProjectHealth', () => {
    it('should return good health for a project with high progress and no overdue tasks', async () => {
      const mockStats = {
        totalTasks: 10,
        completedTasks: 8,
        notStartedTasks: 2,
        overdueTasks: 0,
        progress: 80,
        subprojectsCount: 2,
        deepTasksCount: 15,
      };

      jest
        .spyOn(projectsService, 'getProjectStats')
        .mockResolvedValue(mockStats);

      const result = await projectsService.calculateProjectHealth(
        'project-id',
        testUserId,
      );

      expect(projectsService.getProjectStats).toHaveBeenCalledWith(
        'project-id',
        testUserId,
      );
      expect(result).toEqual({
        health: 'good',
        factors: [],
      });
    });

    it('should return warning health when there are overdue tasks', async () => {
      const mockStats = {
        totalTasks: 10,
        completedTasks: 7,
        notStartedTasks: 3,
        overdueTasks: 2,
        progress: 70,
        subprojectsCount: 1,
        deepTasksCount: 12,
      };

      jest
        .spyOn(projectsService, 'getProjectStats')
        .mockResolvedValue(mockStats);

      const result = await projectsService.calculateProjectHealth(
        'project-id',
        testUserId,
      );

      expect(projectsService.getProjectStats).toHaveBeenCalledWith(
        'project-id',
        testUserId,
      );
      expect(result).toEqual({
        health: 'warning',
        factors: ['2 overdue tasks'],
      });
    });

    it('should return critical health when there are multiple negative factors', async () => {
      const mockStats = {
        totalTasks: 10,
        completedTasks: 2,
        notStartedTasks: 8,
        overdueTasks: 3,
        progress: 20,
        subprojectsCount: 2,
        deepTasksCount: 15,
      };

      jest
        .spyOn(projectsService, 'getProjectStats')
        .mockResolvedValue(mockStats);

      const result = await projectsService.calculateProjectHealth(
        'project-id',
        testUserId,
      );

      expect(projectsService.getProjectStats).toHaveBeenCalledWith(
        'project-id',
        testUserId,
      );
      expect(result).toEqual({
        health: 'critical',
        factors: ['3 overdue tasks', 'Low progress rate'],
      });
    });

    it('should return critical health for a project with no tasks', async () => {
      const mockStats = {
        totalTasks: 0,
        completedTasks: 0,
        notStartedTasks: 0,
        overdueTasks: 0,
        progress: 0,
        subprojectsCount: 0,
        deepTasksCount: 0,
      };

      jest
        .spyOn(projectsService, 'getProjectStats')
        .mockResolvedValue(mockStats);

      const result = await projectsService.calculateProjectHealth(
        'project-id',
        testUserId,
      );

      expect(projectsService.getProjectStats).toHaveBeenCalledWith(
        'project-id',
        testUserId,
      );
      expect(result).toEqual({
        health: 'critical',
        factors: ['Low progress rate', 'No tasks created'],
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      jest
        .spyOn(projectsService, 'getProjectStats')
        .mockRejectedValue(new NotFoundException('Project not found'));

      await expect(
        projectsService.calculateProjectHealth('non-existent', testUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchProjects', () => {
    it('should return projects matching the search query in name or description', async () => {
      const mockProjects = [
        {
          id: 'project1-id',
          name: 'Marketing Campaign',
          description: 'Social media campaign for Q2',
        },
        {
          id: 'project2-id',
          name: 'Product Launch',
          description: 'Marketing materials for new product',
        },
      ] as Project[];
      projectsRepository.searchProjects.mockResolvedValue(mockProjects);

      const result = await projectsService.searchProjects(
        'marketing',
        testUserId,
      );

      expect(projectsRepository.searchProjects).toHaveBeenCalledWith(
        'marketing',
        testUserId,
      );
      expect(result).toEqual(mockProjects);
    });

    it('should return an empty array when no projects match the search query', async () => {
      projectsRepository.searchProjects.mockResolvedValue([]);

      const result = await projectsService.searchProjects(
        'nonexistent',
        testUserId,
      );

      expect(projectsRepository.searchProjects).toHaveBeenCalledWith(
        'nonexistent',
        testUserId,
      );
      expect(result).toEqual([]);
    });

    it('should handle search queries containing special SQL characters safely', async () => {
      projectsRepository.searchProjects.mockResolvedValue([]);
      const specialSearchTerm = 'project%_term';

      await projectsService.searchProjects(specialSearchTerm, testUserId);

      expect(projectsRepository.searchProjects).toHaveBeenCalledWith(
        specialSearchTerm,
        testUserId,
      );
    });
  });

  describe('getProjectBreadcrumb', () => {
    it('should return an array of projects representing the breadcrumb path', async () => {
      const mockCurrent = new Project();
      mockCurrent.id = 'current-id';
      mockCurrent.userId = testUserId;
      projectsRepository.getProjectAncestors.mockResolvedValue([
        {
          id: 'ancestor-1',
          name: 'Ancestor 1',
          description: '',
          isArchived: false,
          isSystem: false,
          type: ProjectType.REGULAR,
          userId: testUserId,
          user: { id: testUserId } as User,
          color: '',
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          tasks: [],
          children: [],
          parent: null as any,
        },
        {
          id: 'ancestor-2',
          name: 'Ancestor 2',
          description: '',
          isArchived: false,
          isSystem: false,
          type: ProjectType.REGULAR,
          userId: testUserId,
          user: { id: testUserId } as User,
          color: '',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          tasks: [],
          children: [],
          parent: null as any,
        },
      ]);

      const result = await projectsService.getProjectBreadcrumb(
        'current-id',
        testUserId,
      );

      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'current-id',
        testUserId,
      );
      expect(projectsRepository.getProjectAncestors).toHaveBeenCalledWith(
        'current-id',
        testUserId,
      );
      expect(result).toEqual([
        {
          id: 'ancestor-1',
          name: 'Ancestor 1',
          description: '',
          isArchived: false,
          isSystem: false,
          type: ProjectType.REGULAR,
          userId: testUserId,
          user: expect.any(Object),
          color: '',
          order: 0,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          tasks: [],
          children: [],
          parent: null,
        },
        {
          id: 'ancestor-2',
          name: 'Ancestor 2',
          description: '',
          isArchived: false,
          isSystem: false,
          type: ProjectType.REGULAR,
          userId: testUserId,
          user: expect.any(Object),
          color: '',
          order: 1,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          tasks: [],
          children: [],
          parent: null,
        },
        mockCurrent,
      ]);
    });

    it('should handle a project with no ancestors (root project)', async () => {
      const mockRootProject = new Project();
      mockRootProject.id = 'root-id';
      mockRootProject.userId = testUserId;
      projectsRepository.getProjectAncestors.mockResolvedValue([]);

      const result = await projectsService.getProjectBreadcrumb(
        'root-id',
        testUserId,
      );

      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'root-id',
        testUserId,
      );
      expect(projectsRepository.getProjectAncestors).toHaveBeenCalledWith(
        'root-id',
        testUserId,
      );
      expect(result).toEqual([mockRootProject]);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectsRepository.getProjectById.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        projectsService.getProjectBreadcrumb('non-existent', testUserId),
      ).rejects.toThrow(NotFoundException);

      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'non-existent',
        testUserId,
      );
    });

    it('should handle a system project correctly', async () => {
      const mockSystemProject = new Project();
      mockSystemProject.id = 'inbox-id';
      mockSystemProject.isSystem = true;
      projectsRepository.getProjectAncestors.mockResolvedValue([]);

      const result = await projectsService.getProjectBreadcrumb(
        'inbox-id',
        testUserId,
      );

      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'inbox-id',
        testUserId,
      );
      expect(projectsRepository.getProjectAncestors).toHaveBeenCalledWith(
        'inbox-id',
        testUserId,
      );
      expect(result).toEqual([mockSystemProject]);
    });
  });

  describe('Project Hierarchy Edge Cases', () => {
    describe('Circular Reference Prevention', () => {
      it('should prevent a project from being its own parent', async () => {
        const updateDto: UpdateProjectDto = {
          name: 'Test',
          parentId: 'project-id',
        };
        const mockProject = new Project();
        mockProject.id = 'project-id';
        mockProject.userId = testUserId;
        projectsRepository.updateProject.mockRejectedValue(
          new BadRequestException(
            'Cannot set parent: would create circular reference',
          ),
        );

        await expect(
          projectsService.updateProject('project-id', updateDto, testUserId),
        ).rejects.toThrow(BadRequestException);

        expect(projectsRepository.updateProject).toHaveBeenCalledWith(
          'project-id',
          updateDto,
          testUserId,
        );
      });

      it('should prevent a parent from becoming a child of its descendant', async () => {
        const updateDto: UpdateProjectDto = {
          name: 'Parent A',
          parentId: 'grandchild-c',
        };
        const mockParentA = new Project();
        mockParentA.id = 'parent-a';
        mockParentA.userId = testUserId;
        projectsRepository.getProjectById.mockResolvedValue(mockParentA);
        projectsRepository.updateProject.mockRejectedValue(
          new BadRequestException(
            'Cannot set parent: would create circular reference',
          ),
        );

        await expect(
          projectsService.updateProject('parent-a', updateDto, testUserId),
        ).rejects.toThrow(BadRequestException);

        expect(projectsRepository.updateProject).toHaveBeenCalledWith(
          'parent-a',
          updateDto,
          testUserId,
        );
      });
    });

    describe('Deep Nesting Scenarios', () => {
      it('should successfully move a project with a deep hierarchy', async () => {
        const moveDto: ProjectMoveDto = {
          projectId: 'parent-id',
          targetId: 'target-id',
          position: 'inside',
        };
        const mockProject = new Project();
        mockProject.id = 'parent-id';
        mockProject.userId = testUserId;
        const mockTarget = new Project();
        mockTarget.id = 'target-id';
        mockTarget.userId = testUserId;

        projectsRepository.getProjectById.mockImplementation(
          async (id, userId) => {
            if (id === mockProject.id && mockProject.userId === userId)
              return mockProject;
            if (id === mockTarget.id && mockTarget.userId === userId)
              return mockTarget;
            throw new NotFoundException();
          },
        );
        projectsRepository.moveProject.mockResolvedValue(undefined);

        await projectsService.moveProject(moveDto, testUserId);

        expect(projectsRepository.moveProject).toHaveBeenCalledWith(
          'parent-id',
          'target-id',
          'inside',
          testUserId,
        );
      });

      it('should handle moving a project to root level', async () => {
        const moveDto: ProjectMoveDto = {
          projectId: 'child-id',
          targetId: undefined,
          position: 'inside',
        };
        const mockProject = new Project();
        mockProject.id = 'child-id';
        mockProject.userId = testUserId;

        projectsRepository.getProjectById.mockImplementation(
          async (id, userId) => {
            if (id === mockProject.id && mockProject.userId === userId)
              return mockProject;
            throw new NotFoundException();
          },
        );
        projectsRepository.moveProject.mockResolvedValue(undefined);

        await projectsService.moveProject(moveDto, testUserId);

        expect(projectsRepository.moveProject).toHaveBeenCalledWith(
          'child-id',
          undefined,
          'inside',
          testUserId,
        );
      });
    });

    describe('System Project Restrictions', () => {
      it('should prevent moving a system project', async () => {
        const moveDto: ProjectMoveDto = {
          projectId: 'inbox-id',
          targetId: 'target-id',
          position: 'inside',
        };
        const mockInbox = new Project();
        mockInbox.id = 'inbox-id';
        mockInbox.isSystem = true;
        const mockTarget = new Project();
        mockTarget.id = 'target-id';
        mockTarget.userId = testUserId;

        projectsRepository.getProjectById.mockImplementation(
          async (id, userId) => {
            if (id === mockInbox.id) return mockInbox;
            if (id === mockTarget.id && mockTarget.userId === userId)
              return mockTarget;
            throw new NotFoundException();
          },
        );
        projectsRepository.moveProject.mockRejectedValue(
          new BadRequestException('Cannot move system project'),
        );

        await expect(
          projectsService.moveProject(moveDto, testUserId),
        ).rejects.toThrow(BadRequestException);

        expect(projectsRepository.moveProject).toHaveBeenCalledWith(
          'inbox-id',
          'target-id',
          'inside',
          testUserId,
        );
      });

      it('should prevent setting a system project as a child of another project', async () => {
        const updateDto: UpdateProjectDto = {
          name: 'Inbox',
          parentId: 'parent-id',
        };
        const mockInbox = new Project();
        mockInbox.id = 'inbox-id';
        mockInbox.isSystem = true;

        projectsRepository.getProjectById.mockImplementation(
          async (id, userId) => {
            if (id === mockInbox.id) return mockInbox;
            throw new NotFoundException();
          },
        );
        projectsRepository.updateProject.mockRejectedValue(
          new BadRequestException('Cannot set parent of system project'),
        );

        await expect(
          projectsService.updateProject('inbox-id', updateDto, testUserId),
        ).rejects.toThrow(BadRequestException);

        expect(projectsRepository.updateProject).toHaveBeenCalledWith(
          'inbox-id',
          updateDto,
          testUserId,
        );
      });

      it('should allow setting regular projects as children of system projects', async () => {
        const updateDto: UpdateProjectDto = {
          name: 'Regular Project',
          parentId: 'inbox-id',
        };
        const mockRegular = new Project();
        mockRegular.id = 'regular-id';
        mockRegular.userId = testUserId;
        const mockInbox = new Project();
        mockInbox.id = 'inbox-id';
        mockInbox.isSystem = true;
        const updatedProject = { ...mockRegular, parent: mockInbox };

        projectsRepository.getProjectById.mockImplementation(
          async (id, userId) => {
            if (id === mockRegular.id && mockRegular.userId === userId)
              return mockRegular;
            if (id === mockInbox.id) return mockInbox;
            throw new NotFoundException();
          },
        );
        projectsRepository.updateProject.mockResolvedValue(updatedProject);

        const result = await projectsService.updateProject(
          'regular-id',
          updateDto,
          testUserId,
        );

        expect(projectsRepository.updateProject).toHaveBeenCalledWith(
          'regular-id',
          updateDto,
          testUserId,
        );
        expect(result.parent).toEqual(mockInbox);
      });
    });
  });
});
