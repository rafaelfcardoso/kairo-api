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

describe('ProjectsService', () => {
  let projectsService: ProjectsService;
  let projectsRepository: jest.Mocked<ProjectsRepository>;
  let tasksRepository: jest.Mocked<TasksRepository>;

  const mockProjectsRepository = () => ({
    getProjects: jest.fn(),
    getProjectById: jest.fn(),
    createProject: jest.fn(),
    updateProject: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    archiveProject: jest.fn(),
    moveProject: jest.fn(),
    reorderProjects: jest.fn(),
    getProjectTree: jest.fn(),
    getProjectAncestors: jest.fn(),
    getProjectDescendants: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ProjectsRepository, useFactory: mockProjectsRepository },
        { provide: TasksRepository, useFactory: mockTasksRepository },
      ],
    }).compile();

    projectsService = module.get<ProjectsService>(ProjectsService);
    projectsRepository = module.get(
      ProjectsRepository,
    ) as jest.Mocked<ProjectsRepository>;
    tasksRepository = module.get(
      TasksRepository,
    ) as jest.Mocked<TasksRepository>;
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(projectsService).toBeDefined();
      expect(projectsRepository).toBeDefined();
      expect(tasksRepository).toBeDefined();
    });
  });

  describe('getProjects', () => {
    it('should call repository with filter DTO and return projects', async () => {
      const mockProject = new Project();
      mockProject.id = 'test-id';
      mockProject.name = 'Test Project';

      const filterDto: ProjectFilterDto = {
        search: 'test',
        includeArchived: false,
        includeSystem: true,
      };

      projectsRepository.getProjects.mockResolvedValue([mockProject]);

      const result = await projectsService.getProjects(filterDto);

      expect(projectsRepository.getProjects).toHaveBeenCalledWith(filterDto);
      expect(result).toEqual([mockProject]);
      expect(result).toHaveLength(1);
    });
  });

  describe('getProjectById', () => {
    it('should call repository with ID and return the project', async () => {
      const mockProject = new Project();
      mockProject.id = 'test-id';
      mockProject.name = 'Test Project';

      projectsRepository.getProjectById.mockResolvedValue(mockProject);

      const result = await projectsService.getProjectById('test-id');

      expect(projectsRepository.getProjectById).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when repository throws it', async () => {
      projectsRepository.getProjectById.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      await expect(
        projectsService.getProjectById('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createProject', () => {
    it('should create and return a new project', async () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'A test project',
        color: '#FF5733',
      };

      const mockProject = new Project();
      mockProject.id = 'new-id';
      mockProject.name = createDto.name;
      mockProject.description = createDto.description;
      mockProject.color = createDto.color;

      projectsRepository.createProject.mockResolvedValue(mockProject);

      const result = await projectsService.createProject(createDto);

      expect(projectsRepository.createProject).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockProject);
    });
  });

  describe('updateProject', () => {
    it('should update and return the project', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated description',
      };

      const mockProject = new Project();
      mockProject.id = 'test-id';
      mockProject.name = updateDto.name;
      mockProject.description = updateDto.description;

      projectsRepository.updateProject.mockResolvedValue(mockProject);

      const result = await projectsService.updateProject('test-id', updateDto);

      expect(projectsRepository.updateProject).toHaveBeenCalledWith(
        'test-id',
        updateDto,
      );
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const updateDto: UpdateProjectDto = { name: 'Updated Project' };

      projectsRepository.updateProject.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      await expect(
        projectsService.updateProject('non-existent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProject', () => {
    it('should delete an existing project', async () => {
      const mockProject = new Project();
      mockProject.id = 'test-id';
      mockProject.name = 'Test Project';
      mockProject.isSystem = false;

      projectsRepository.findOne.mockResolvedValue(mockProject);
      projectsRepository.delete.mockResolvedValue(undefined);

      await projectsService.deleteProject('test-id');

      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(projectsRepository.delete).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(
        projectsService.deleteProject('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to delete a system project', async () => {
      const mockSystemProject = new Project();
      mockSystemProject.id = 'system-id';
      mockSystemProject.name = 'Inbox';
      mockSystemProject.isSystem = true;

      projectsRepository.findOne.mockResolvedValue(mockSystemProject);

      await expect(projectsService.deleteProject('system-id')).rejects.toThrow(
        BadRequestException,
      );
      expect(projectsRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('archiveProject', () => {
    it('should archive a project and return it', async () => {
      const mockProject = new Project();
      mockProject.id = 'test-id';
      mockProject.name = 'Test Project';
      mockProject.isArchived = true;

      projectsRepository.archiveProject.mockResolvedValue(mockProject);

      const result = await projectsService.archiveProject('test-id');

      expect(projectsRepository.archiveProject).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockProject);
      expect(result.isArchived).toBe(true);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectsRepository.archiveProject.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      await expect(
        projectsService.archiveProject('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('moveProject', () => {
    it('should move a project to the specified position', async () => {
      const moveDto: ProjectMoveDto = {
        projectId: 'project-id',
        targetId: 'target-id',
        position: 'before',
      };

      projectsRepository.moveProject.mockResolvedValue(undefined);

      await projectsService.moveProject(moveDto);

      expect(projectsRepository.moveProject).toHaveBeenCalledWith(
        'project-id',
        'target-id',
        'before',
      );
    });
  });

  describe('reorderProjects', () => {
    it('should reorder projects based on the provided IDs', async () => {
      const projectIds = ['id1', 'id2', 'id3'];

      projectsRepository.reorderProjects.mockResolvedValue(undefined);

      await projectsService.reorderProjects(projectIds);

      expect(projectsRepository.reorderProjects).toHaveBeenCalledWith(
        projectIds,
      );
    });
  });

  describe('getProjectTree', () => {
    it('should return project tree starting at root', async () => {
      const mockTree = [
        {
          id: 'parent-id',
          name: 'Parent Project',
          children: [
            {
              id: 'child-id',
              name: 'Child Project',
              children: [],
            },
          ],
        },
      ];

      projectsRepository.getProjectTree.mockResolvedValue(mockTree as any);

      const result = await projectsService.getProjectTree();

      expect(projectsRepository.getProjectTree).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockTree);
    });

    it('should return project tree starting at specified root ID', async () => {
      const mockTree = [
        {
          id: 'child-id',
          name: 'Child Project',
          children: [],
        },
      ];

      projectsRepository.getProjectTree.mockResolvedValue(mockTree as any);

      const result = await projectsService.getProjectTree('parent-id');

      expect(projectsRepository.getProjectTree).toHaveBeenCalledWith(
        'parent-id',
      );
      expect(result).toEqual(mockTree);
    });
  });

  describe('getProjectWithAncestors', () => {
    it('should return project and its ancestors', async () => {
      const mockProject = new Project();
      mockProject.id = 'project-id';
      mockProject.name = 'Test Project';

      const mockAncestors = [
        { id: 'ancestor-1', name: 'Ancestor 1' },
        { id: 'ancestor-2', name: 'Ancestor 2' },
      ] as Project[];

      projectsRepository.getProjectById.mockResolvedValue(mockProject);
      projectsRepository.getProjectAncestors.mockResolvedValue(mockAncestors);

      const result =
        await projectsService.getProjectWithAncestors('project-id');

      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'project-id',
      );
      expect(projectsRepository.getProjectAncestors).toHaveBeenCalledWith(
        'project-id',
      );
      expect(result).toEqual({
        project: mockProject,
        ancestors: mockAncestors,
      });
    });
  });

  describe('getProjectStats', () => {
    it('should calculate and return project statistics', async () => {
      // Create mock project
      const mockProject = new Project();
      mockProject.id = 'project-id';
      mockProject.name = 'Test Project';

      // Create mock tasks
      const task1 = new Task();
      task1.id = 'task1-id';
      task1.title = 'Task 1';
      task1.status = TaskStatus.COMPLETED;

      const task2 = new Task();
      task2.id = 'task2-id';
      task2.title = 'Task 2';
      task2.status = TaskStatus.NOT_STARTED;
      task2.dueDate = new Date(Date.now() - 86400000); // Yesterday

      const task3 = new Task();
      task3.id = 'task3-id';
      task3.title = 'Task 3';
      task3.status = TaskStatus.NOT_STARTED;

      // Assign tasks to project
      mockProject.tasks = [task1, task2, task3];

      // Mock descendants
      const mockDescendants = [
        { id: 'child-id', name: 'Child Project' },
      ] as Project[];

      // Mock all tasks including descendants
      const mockAllTasks = [
        task1,
        task2,
        task3,
        { id: 'task4-id', title: 'Task 4' },
      ] as Task[];

      // Set up mocks
      projectsRepository.getProjectById.mockResolvedValue(mockProject);
      projectsRepository.getProjectDescendants.mockResolvedValue(
        mockDescendants,
      );

      // Mock the query builder for all tasks
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAllTasks),
      };
      tasksRepository.createQueryBuilder.mockReturnValue(
        mockTaskQueryBuilder as any,
      );

      // Call the function
      const result = await projectsService.getProjectStats('project-id');

      // Verify mocks were called
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'project-id',
      );
      expect(projectsRepository.getProjectDescendants).toHaveBeenCalledWith(
        'project-id',
      );
      expect(tasksRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockTaskQueryBuilder.where).toHaveBeenCalled();

      // Verify result
      expect(result).toEqual({
        totalTasks: 3,
        completedTasks: 1,
        notStartedTasks: 2,
        overdueTasks: 1,
        progress: 33.33333333333333,
        subprojectsCount: 1,
        deepTasksCount: 4,
      });
    });
  });

  describe('duplicateProject', () => {
    it('should duplicate a project with all tasks and subprojects', async () => {
      // Create original project
      const mockOriginalProject = new Project();
      mockOriginalProject.id = 'original-id';
      mockOriginalProject.name = 'Original Project';
      mockOriginalProject.description = 'Original description';
      mockOriginalProject.color = '#FF5733';

      // Create task in original project
      const mockTask = new Task();
      mockTask.id = 'task-id';
      mockTask.title = 'Test Task';
      mockTask.description = 'Task description';
      mockTask.dueDate = new Date();
      mockTask.priority = TaskPriority.MEDIUM;
      mockTask.status = TaskStatus.NOT_STARTED;

      // Initialize tasks array
      mockOriginalProject.tasks = [mockTask];

      // Create child project
      const mockChildProject = new Project();
      mockChildProject.id = 'child-id';
      mockChildProject.name = 'Child Project';

      // Initialize children array
      mockOriginalProject.children = [mockChildProject];

      // Create new project that will be returned
      const mockNewProject = new Project();
      mockNewProject.id = 'new-id';
      mockNewProject.name = 'Original Project (Copy)';
      mockNewProject.description = 'Original description';
      mockNewProject.color = '#FF5733';
      // Important: initialize these arrays to prevent null/undefined errors
      mockNewProject.tasks = [];
      mockNewProject.children = [];

      // Mock repository methods
      projectsRepository.getProjectById.mockImplementation(async (id) => {
        if (id === 'original-id') return mockOriginalProject;
        if (id === 'new-id') {
          // For the final call to getProjectById at the end of duplicateProject
          return mockNewProject;
        }
        if (id === 'child-id') {
          // For the recursive call to duplicateProject for the child
          const childCopy = new Project();
          childCopy.id = 'child-copy-id';
          childCopy.name = 'Child Project (Copy)';
          childCopy.tasks = [];
          childCopy.children = [];
          return childCopy;
        }
        throw new NotFoundException(`Project with ID "${id}" not found`);
      });

      projectsRepository.createProject.mockResolvedValue(mockNewProject);

      tasksRepository.createTask.mockResolvedValue(mockTask);

      // Call the function
      const result = await projectsService.duplicateProject('original-id', {
        includeSubprojects: true,
        includeTasks: true,
      });

      // Verify getProjectById was called
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'original-id',
      );
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith('new-id');

      // Verify createProject was called with correct data
      expect(projectsRepository.createProject).toHaveBeenCalledWith({
        name: 'Original Project (Copy)',
        description: 'Original description',
        color: '#FF5733',
        parent: undefined,
      });

      // Verify tasksRepository.createTask was called
      expect(tasksRepository.createTask).toHaveBeenCalledWith({
        title: 'Test Task',
        description: 'Task description',
        dueDate: expect.any(String),
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.NOT_STARTED,
        projectId: 'new-id',
      });

      // Verify result
      expect(result).toEqual(mockNewProject);
    });

    it('should duplicate a project without tasks when includeTasks is false', async () => {
      // Setup mocks
      const mockOriginalProject = new Project();
      mockOriginalProject.id = 'original-id';
      mockOriginalProject.name = 'Original Project';
      mockOriginalProject.description = 'Original description';

      // Important: initialize these arrays even if empty
      const mockTask = new Task();
      mockOriginalProject.tasks = [mockTask];
      mockOriginalProject.children = [];

      const mockNewProject = new Project();
      mockNewProject.id = 'new-id';
      mockNewProject.name = 'Original Project (Copy)';
      mockNewProject.tasks = [];
      mockNewProject.children = [];

      projectsRepository.getProjectById.mockImplementation(async (id) => {
        if (id === 'original-id') return mockOriginalProject;
        if (id === 'new-id') return mockNewProject;
        throw new NotFoundException(`Project with ID "${id}" not found`);
      });

      projectsRepository.createProject.mockResolvedValue(mockNewProject);

      // Call the function with includeTasks = false
      await projectsService.duplicateProject('original-id', {
        includeSubprojects: true,
        includeTasks: false,
      });

      // Verify tasksRepository.createTask was NOT called
      expect(tasksRepository.createTask).not.toHaveBeenCalled();
    });
  });

  describe('mergeProjects', () => {
    it('should successfully merge a source project into a target project', async () => {
      // Create mock source project with tasks and children
      const mockSourceProject = new Project();
      mockSourceProject.id = 'source-id';
      mockSourceProject.name = 'Source Project';
      mockSourceProject.isSystem = false;

      // Create mock tasks for source project
      const mockSourceTask = new Task();
      mockSourceTask.id = 'source-task-id';
      mockSourceTask.title = 'Source Task';
      mockSourceProject.tasks = [mockSourceTask];

      // Create mock child projects for source project
      const mockChildProject = new Project();
      mockChildProject.id = 'child-id';
      mockChildProject.name = 'Child Project';
      mockSourceProject.children = [mockChildProject];

      // Create mock target project
      const mockTargetProject = new Project();
      mockTargetProject.id = 'target-id';
      mockTargetProject.name = 'Target Project';
      mockTargetProject.tasks = [];
      mockTargetProject.children = [];

      // Setup mock responses
      projectsRepository.getProjectById.mockImplementation(async (id) => {
        if (id === 'source-id') return mockSourceProject;
        if (id === 'target-id') return mockTargetProject;
        throw new NotFoundException(`Project with ID "${id}" not found`);
      });

      // Important: Mock findOne for the deleteProject method
      projectsRepository.findOne.mockImplementation(async (options: any) => {
        if (options.where && options.where.id === 'source-id') {
          return mockSourceProject;
        }
        return null;
      });

      // Mock task repository query builder with a more flexible approach
      const mockTaskUpdateFunction = jest.fn().mockReturnThis();
      const mockTaskSetFunction = jest.fn().mockReturnThis();
      const mockTaskWhereFunction = jest.fn().mockReturnThis();
      const mockTaskExecuteFunction = jest
        .fn()
        .mockResolvedValue({ affected: 1 });

      tasksRepository.createQueryBuilder.mockReturnValue({
        update: mockTaskUpdateFunction,
        set: mockTaskSetFunction,
        where: mockTaskWhereFunction,
        execute: mockTaskExecuteFunction,
      } as any);

      // Mock project repository query builder with a more flexible approach
      const mockProjectUpdateFunction = jest.fn().mockReturnThis();
      const mockProjectSetFunction = jest.fn().mockReturnThis();
      const mockProjectWhereFunction = jest.fn().mockReturnThis();
      const mockProjectExecuteFunction = jest
        .fn()
        .mockResolvedValue({ affected: 1 });

      projectsRepository.createQueryBuilder.mockReturnValue({
        update: mockProjectUpdateFunction,
        set: mockProjectSetFunction,
        where: mockProjectWhereFunction,
        execute: mockProjectExecuteFunction,
      } as any);

      // Call the service method
      const result = await projectsService.mergeProjects(
        'source-id',
        'target-id',
      );

      // Verify the repository methods were called correctly
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'source-id',
      );
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'target-id',
      );

      // Verify that tasks were moved
      expect(tasksRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockTaskUpdateFunction).toHaveBeenCalled();
      expect(mockTaskSetFunction).toHaveBeenCalledWith({
        project: mockTargetProject,
      });
      expect(mockTaskWhereFunction).toHaveBeenCalledWith(
        'projectId = :sourceId',
        { sourceId: 'source-id' },
      );
      expect(mockTaskExecuteFunction).toHaveBeenCalled();

      // Verify that subprojects were moved
      expect(projectsRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockProjectUpdateFunction).toHaveBeenCalledWith(Project);
      expect(mockProjectSetFunction).toHaveBeenCalledWith({
        parent: mockTargetProject,
      });
      expect(mockProjectWhereFunction).toHaveBeenCalledWith(
        'parentId = :sourceId',
        { sourceId: 'source-id' },
      );
      expect(mockProjectExecuteFunction).toHaveBeenCalled();

      // Verify findOne was called for deleteProject
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'source-id' },
      });

      // Verify the source project was deleted
      expect(projectsRepository.delete).toHaveBeenCalledWith('source-id');

      // Verify the result
      expect(result).toEqual(mockTargetProject);
    });

    it('should skip task migration when source project has no tasks', async () => {
      // Create mock projects
      const mockSourceProject = new Project();
      mockSourceProject.id = 'source-id';
      mockSourceProject.name = 'Source Project';
      mockSourceProject.isSystem = false;
      mockSourceProject.tasks = []; // No tasks
      mockSourceProject.children = [new Project()]; // Has children

      const mockTargetProject = new Project();
      mockTargetProject.id = 'target-id';
      mockTargetProject.name = 'Target Project';
      mockTargetProject.tasks = [];
      mockTargetProject.children = [];

      // Setup mock responses
      projectsRepository.getProjectById.mockImplementation(async (id) => {
        if (id === 'source-id') return mockSourceProject;
        if (id === 'target-id') return mockTargetProject;
        throw new NotFoundException(`Project with ID "${id}" not found`);
      });

      // Important: Mock findOne for the deleteProject method
      projectsRepository.findOne.mockImplementation(async (options: any) => {
        if (options.where && options.where.id === 'source-id') {
          return mockSourceProject;
        }
        return null;
      });

      // Mock task repository query builder
      tasksRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      } as any);

      // Call the service method
      await projectsService.mergeProjects('source-id', 'target-id');

      // Verify task query builder was NOT called
      expect(tasksRepository.createQueryBuilder).not.toHaveBeenCalled();

      // Verify project repository was called for subprojects
      expect(projectsRepository.createQueryBuilder).toHaveBeenCalled();

      // Verify the source project was deleted
      expect(projectsRepository.delete).toHaveBeenCalledWith('source-id');
    });

    it('should skip subproject migration when source project has no children', async () => {
      // Create mock projects
      const mockSourceProject = new Project();
      mockSourceProject.id = 'source-id';
      mockSourceProject.name = 'Source Project';
      mockSourceProject.isSystem = false;
      mockSourceProject.tasks = [new Task()]; // Has tasks
      mockSourceProject.children = []; // No children

      const mockTargetProject = new Project();
      mockTargetProject.id = 'target-id';
      mockTargetProject.name = 'Target Project';
      mockTargetProject.tasks = [];
      mockTargetProject.children = [];

      // Setup mock responses
      projectsRepository.getProjectById.mockImplementation(async (id) => {
        if (id === 'source-id') return mockSourceProject;
        if (id === 'target-id') return mockTargetProject;
        throw new NotFoundException(`Project with ID "${id}" not found`);
      });

      // Important: Mock findOne for the deleteProject method
      projectsRepository.findOne.mockImplementation(async (options: any) => {
        if (options.where && options.where.id === 'source-id') {
          return mockSourceProject;
        }
        return null;
      });

      // Mock task repository
      tasksRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      } as any);

      // Call the service method
      await projectsService.mergeProjects('source-id', 'target-id');

      // Verify task repository was called (has tasks)
      expect(tasksRepository.createQueryBuilder).toHaveBeenCalled();

      // Verify project query builder was NOT called (no children)
      expect(projectsRepository.createQueryBuilder).not.toHaveBeenCalled();

      // Verify the source project was deleted
      expect(projectsRepository.delete).toHaveBeenCalledWith('source-id');
    });

    it('should throw NotFoundException when source project does not exist', async () => {
      // Setup mock responses
      projectsRepository.getProjectById.mockImplementation(async (id) => {
        if (id === 'target-id') return new Project();
        throw new NotFoundException(`Project with ID "${id}" not found`);
      });

      // Test that error is thrown
      await expect(
        projectsService.mergeProjects('non-existent', 'target-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target project does not exist', async () => {
      // Setup mock responses
      projectsRepository.getProjectById.mockImplementation(async (id) => {
        if (id === 'source-id') return new Project();
        throw new NotFoundException(`Project with ID "${id}" not found`);
      });

      // Test that error is thrown
      await expect(
        projectsService.mergeProjects('source-id', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to merge a system project', async () => {
      // Create mock source project with isSystem=true
      const mockSourceProject = new Project();
      mockSourceProject.id = 'system-id';
      mockSourceProject.name = 'Inbox';
      mockSourceProject.isSystem = true;
      // Important: Initialize tasks and children
      mockSourceProject.tasks = [];
      mockSourceProject.children = [];

      // Create mock target project
      const mockTargetProject = new Project();
      mockTargetProject.id = 'target-id';
      mockTargetProject.name = 'Target Project';
      mockTargetProject.tasks = [];
      mockTargetProject.children = [];

      // Setup mock responses
      projectsRepository.getProjectById.mockImplementation(async (id) => {
        if (id === 'system-id') return mockSourceProject;
        if (id === 'target-id') return mockTargetProject;
        throw new NotFoundException(`Project with ID "${id}" not found`);
      });

      // Mock findOne for the deleteProject method
      projectsRepository.findOne.mockResolvedValue(mockSourceProject);

      // Call the service method and expect it to throw
      await expect(
        projectsService.mergeProjects('system-id', 'target-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProjectTimeline', () => {
    it('should return project timeline data with task creation and completion trends', async () => {
      // Setup dates for consistent testing
      const today = new Date('2025-05-02T12:00:00Z');
      const lastMonth = new Date('2025-04-02T12:00:00Z');
      const twoMonthsAgo = new Date('2025-03-02T12:00:00Z');

      // Mock project and tasks
      const mockProject = new Project();
      mockProject.id = 'project-id';
      mockProject.name = 'Test Project';

      // Task created two months ago, completed last month
      const task1 = new Task();
      task1.id = 'task1-id';
      task1.title = 'Task 1';
      task1.status = TaskStatus.COMPLETED;
      task1.createdAt = twoMonthsAgo;
      task1.updatedAt = lastMonth; // Assuming completion date is stored in updatedAt

      // Task created last month, still not completed
      const task2 = new Task();
      task2.id = 'task2-id';
      task2.title = 'Task 2';
      task2.status = TaskStatus.NOT_STARTED;
      task2.createdAt = lastMonth;
      task2.updatedAt = lastMonth;

      // Task created today, completed today
      const task3 = new Task();
      task3.id = 'task3-id';
      task3.title = 'Task 3';
      task3.status = TaskStatus.COMPLETED;
      task3.createdAt = today;
      task3.updatedAt = today;

      // Assign tasks to project
      mockProject.tasks = [task1, task2, task3];

      // Mock getProjectById
      projectsRepository.getProjectById.mockResolvedValue(mockProject);

      // Call the method
      const result = await projectsService.getProjectTimeline('project-id');

      // Verify the repository method was called
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'project-id',
      );

      // Verify the result structure
      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('tasksByMonth');
      expect(result).toHaveProperty('completionTrend');

      // Verify the project in the result
      expect(result.project).toBe(mockProject);

      // Verify tasksByMonth data
      const expectedCreationMonths = {
        '2025-03': 1, // One task created in March
        '2025-04': 1, // One task created in April
        '2025-05': 1, // One task created in May
      };
      expect(result.tasksByMonth).toEqual(expectedCreationMonths);

      // Verify completionTrend data
      const expectedCompletionMonths = {
        '2025-04': 1, // One task completed in April
        '2025-05': 1, // One task completed in May
      };
      expect(result.completionTrend).toEqual(expectedCompletionMonths);
    });

    it('should handle a project with no tasks', async () => {
      // Mock empty project
      const mockProject = new Project();
      mockProject.id = 'empty-project-id';
      mockProject.name = 'Empty Project';
      mockProject.tasks = [];

      // Mock repository
      projectsRepository.getProjectById.mockResolvedValue(mockProject);

      // Call the method
      const result =
        await projectsService.getProjectTimeline('empty-project-id');

      // Verify the repository method was called
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'empty-project-id',
      );

      // Verify empty results
      expect(result.project).toBe(mockProject);
      expect(result.tasksByMonth).toEqual({});
      expect(result.completionTrend).toEqual({});
    });

    it('should throw NotFoundException when project does not exist', async () => {
      // Mock repository to throw
      projectsRepository.getProjectById.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      // Verify it throws
      await expect(
        projectsService.getProjectTimeline('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateProjectHealth', () => {
    it('should return good health for a project with high progress and no overdue tasks', async () => {
      // Mock getProjectStats result
      const mockStats = {
        totalTasks: 10,
        completedTasks: 8,
        notStartedTasks: 2,
        overdueTasks: 0,
        progress: 80,
        subprojectsCount: 2,
        deepTasksCount: 15,
      };

      // Create a spy for getProjectStats
      jest
        .spyOn(projectsService, 'getProjectStats')
        .mockResolvedValue(mockStats);

      // Call the method
      const result = await projectsService.calculateProjectHealth('project-id');

      // Verify getProjectStats was called
      expect(projectsService.getProjectStats).toHaveBeenCalledWith(
        'project-id',
      );

      // Verify result
      expect(result).toEqual({
        health: 'good',
        factors: [],
      });
    });

    it('should return warning health when there are overdue tasks', async () => {
      // Mock getProjectStats result
      const mockStats = {
        totalTasks: 10,
        completedTasks: 7,
        notStartedTasks: 3,
        overdueTasks: 2,
        progress: 70,
        subprojectsCount: 1,
        deepTasksCount: 12,
      };

      // Create a spy for getProjectStats
      jest
        .spyOn(projectsService, 'getProjectStats')
        .mockResolvedValue(mockStats);

      // Call the method
      const result = await projectsService.calculateProjectHealth('project-id');

      // Verify getProjectStats was called
      expect(projectsService.getProjectStats).toHaveBeenCalledWith(
        'project-id',
      );

      // Verify result
      expect(result).toEqual({
        health: 'warning',
        factors: ['2 overdue tasks'],
      });
    });

    it('should return critical health when there are multiple negative factors', async () => {
      // Mock getProjectStats result
      const mockStats = {
        totalTasks: 10,
        completedTasks: 2,
        notStartedTasks: 8,
        overdueTasks: 3,
        progress: 20,
        subprojectsCount: 2,
        deepTasksCount: 15,
      };

      // Create a spy for getProjectStats
      jest
        .spyOn(projectsService, 'getProjectStats')
        .mockResolvedValue(mockStats);

      // Call the method
      const result = await projectsService.calculateProjectHealth('project-id');

      // Verify getProjectStats was called
      expect(projectsService.getProjectStats).toHaveBeenCalledWith(
        'project-id',
      );

      // Verify result
      expect(result).toEqual({
        health: 'critical',
        factors: ['3 overdue tasks', 'Low progress rate'],
      });
    });

    it('should return critical health for a project with no tasks', async () => {
      // Mock getProjectStats result
      const mockStats = {
        totalTasks: 0,
        completedTasks: 0,
        notStartedTasks: 0,
        overdueTasks: 0,
        progress: 0,
        subprojectsCount: 0,
        deepTasksCount: 0,
      };

      // Create a spy for getProjectStats
      jest
        .spyOn(projectsService, 'getProjectStats')
        .mockResolvedValue(mockStats);

      // Call the method
      const result = await projectsService.calculateProjectHealth('project-id');

      // Verify getProjectStats was called
      expect(projectsService.getProjectStats).toHaveBeenCalledWith(
        'project-id',
      );

      // Verify result - a project with no tasks has both "No tasks created" and "Low progress rate" factors
      expect(result).toEqual({
        health: 'critical',
        factors: ['Low progress rate', 'No tasks created'],
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      // Mock getProjectStats to throw
      jest
        .spyOn(projectsService, 'getProjectStats')
        .mockRejectedValue(new NotFoundException('Project not found'));

      // Verify it throws
      await expect(
        projectsService.calculateProjectHealth('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchProjects', () => {
    it('should return projects matching the search query in name or description', async () => {
      // Create mock projects for search results
      const mockProject1 = new Project();
      mockProject1.id = 'project1-id';
      mockProject1.name = 'Marketing Campaign';
      mockProject1.description = 'Social media campaign for Q2';

      const mockProject2 = new Project();
      mockProject2.id = 'project2-id';
      mockProject2.name = 'Product Launch';
      mockProject2.description = 'Marketing materials for new product';

      // Setup mock parent and children
      const mockParent = new Project();
      mockParent.id = 'parent-id';
      mockParent.name = 'Department Projects';

      const mockChild = new Project();
      mockChild.id = 'child-id';
      mockChild.name = 'Subtask Project';

      // Add relationships
      mockProject1.parent = mockParent;
      mockProject1.children = [];
      mockProject2.parent = null;
      mockProject2.children = [mockChild];

      // Create mock query builder with chained methods
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProject1, mockProject2]),
      };

      // Setup repositories with type assertion
      projectsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Call the service method
      const result = await projectsService.searchProjects('marketing');

      // Verify query builder was called correctly
      expect(projectsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'project',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.parent',
        'parent',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.children',
        'children',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(project.name) LIKE LOWER(:query)',
        { query: '%marketing%' },
      );
      expect(mockQueryBuilder.orWhere).toHaveBeenCalledWith(
        'LOWER(project.description) LIKE LOWER(:query)',
        { query: '%marketing%' },
      );

      // Verify results
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('project1-id');
      expect(result[1].id).toBe('project2-id');
      expect(result[0].parent).toEqual(mockParent);
      expect(result[1].children).toContainEqual(mockChild);
    });

    it('should return an empty array when no projects match the search query', async () => {
      // Create mock query builder with chained methods
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      // Setup repositories with type assertion
      projectsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Call the service method
      const result = await projectsService.searchProjects('nonexistentterm');

      // Verify query builder was called
      expect(projectsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'project',
      );

      // Verify empty results
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle search queries containing special SQL characters safely', async () => {
      // Create mock query builder with chained methods
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      // Setup repositories with type assertion
      projectsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Call the service method with a search term containing SQL wildcards
      const specialSearchTerm = 'project%_term';
      await projectsService.searchProjects(specialSearchTerm);

      // Verify the search term is used correctly in the query parameters
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(project.name) LIKE LOWER(:query)',
        { query: '%project%_term%' },
      );
    });
  });

  describe('getProjectBreadcrumb', () => {
    it('should return an array of projects representing the breadcrumb path', async () => {
      // Create mock projects for breadcrumb
      const mockGrandparent = new Project();
      mockGrandparent.id = 'grandparent-id';
      mockGrandparent.name = 'Root Project';

      const mockParent = new Project();
      mockParent.id = 'parent-id';
      mockParent.name = 'Parent Project';

      const mockCurrent = new Project();
      mockCurrent.id = 'current-id';
      mockCurrent.name = 'Current Project';

      // Setup ancestor array
      const mockAncestors = [mockGrandparent, mockParent];

      // Setup repository mocks
      projectsRepository.getProjectAncestors.mockResolvedValue(mockAncestors);
      projectsRepository.getProjectById.mockResolvedValue(mockCurrent);

      // Call the service method
      const result = await projectsService.getProjectBreadcrumb('current-id');

      // Verify repository methods were called correctly
      expect(projectsRepository.getProjectAncestors).toHaveBeenCalledWith(
        'current-id',
      );
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'current-id',
      );

      // Verify results
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockGrandparent);
      expect(result[1]).toEqual(mockParent);
      expect(result[2]).toEqual(mockCurrent);
    });

    it('should handle a project with no ancestors (root project)', async () => {
      // Create mock project with no ancestors
      const mockRootProject = new Project();
      mockRootProject.id = 'root-id';
      mockRootProject.name = 'Root Project';

      // Setup repository mocks
      projectsRepository.getProjectAncestors.mockResolvedValue([]);
      projectsRepository.getProjectById.mockResolvedValue(mockRootProject);

      // Call the service method
      const result = await projectsService.getProjectBreadcrumb('root-id');

      // Verify repository methods were called
      expect(projectsRepository.getProjectAncestors).toHaveBeenCalledWith(
        'root-id',
      );
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith('root-id');

      // Verify results
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockRootProject);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      // Setup repository to throw for non-existent project
      projectsRepository.getProjectById.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      // Verify it throws
      await expect(
        projectsService.getProjectBreadcrumb('non-existent'),
      ).rejects.toThrow(NotFoundException);

      // Verify getProjectById was called
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'non-existent',
      );
    });

    it('should handle a system project correctly', async () => {
      // Create mock system project (e.g., "Inbox")
      const mockSystemProject = new Project();
      mockSystemProject.id = 'inbox-id';
      mockSystemProject.name = 'Inbox';
      mockSystemProject.isSystem = true;

      // Setup repository mocks
      projectsRepository.getProjectAncestors.mockResolvedValue([]);
      projectsRepository.getProjectById.mockResolvedValue(mockSystemProject);

      // Call the service method
      const result = await projectsService.getProjectBreadcrumb('inbox-id');

      // Verify repository methods were called
      expect(projectsRepository.getProjectAncestors).toHaveBeenCalledWith(
        'inbox-id',
      );
      expect(projectsRepository.getProjectById).toHaveBeenCalledWith(
        'inbox-id',
      );

      // Verify results
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockSystemProject);
      expect(result[0].isSystem).toBe(true);
    });
  });

  describe('duplicateTaskToProject', () => {
    it('should duplicate a task to a valid target project', async () => {
      // Create source task with various properties
      const sourceTask = new Task();
      sourceTask.id = 'source-task-id';
      sourceTask.title = 'Source Task Title';
      sourceTask.description = 'Source Task Description';
      sourceTask.priority = TaskPriority.HIGH;
      sourceTask.status = TaskStatus.NOT_STARTED;
      sourceTask.dueDate = new Date('2025-06-15T10:00:00Z');
      sourceTask.isRecurring = false;
      sourceTask.needsReminder = true;
      sourceTask.reminderMessage = "Don't forget this task";

      // Create original project
      const originalProject = new Project();
      originalProject.id = 'original-project-id';

      // Set project property
      sourceTask.project = originalProject;

      // Create target project
      const targetProject = new Project();
      targetProject.id = 'target-project-id';
      targetProject.name = 'Target Project';

      // Create expected new task (the duplicated task)
      const duplicatedTask = new Task();
      duplicatedTask.id = 'new-task-id';
      duplicatedTask.title = sourceTask.title;
      duplicatedTask.description = sourceTask.description;
      duplicatedTask.priority = sourceTask.priority;
      duplicatedTask.status = sourceTask.status;

      // Set project property
      duplicatedTask.project = targetProject;

      // Mock repository methods
      tasksRepository.getTaskById.mockResolvedValue(sourceTask);
      projectsRepository.findOne.mockResolvedValue(targetProject);
      tasksRepository.createTask.mockResolvedValue(duplicatedTask);

      // Call the method
      const result = await projectsService.duplicateTaskToProject(
        'source-task-id',
        'target-project-id',
      );

      // Verify repositories were called with correct parameters
      expect(tasksRepository.getTaskById).toHaveBeenCalledWith(
        'source-task-id',
      );
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'target-project-id' },
      });

      // Verify that createTask was called with the correct data
      expect(tasksRepository.createTask).toHaveBeenCalledWith({
        title: sourceTask.title,
        description: sourceTask.description,
        dueDate: sourceTask.dueDate.toISOString(),
        priority: sourceTask.priority,
        status: sourceTask.status,
        projectId: 'target-project-id',
      });

      // Verify result is the duplicated task
      expect(result).toBe(duplicatedTask);
    });

    it('should handle tasks with null dueDate', async () => {
      // Create source task without a due date
      const sourceTask = new Task();
      sourceTask.id = 'source-task-id';
      sourceTask.title = 'Task Without Due Date';
      sourceTask.description = 'This task has no due date';
      sourceTask.priority = TaskPriority.MEDIUM;
      sourceTask.status = TaskStatus.NOT_STARTED;
      sourceTask.dueDate = null;

      // Create target project
      const targetProject = new Project();
      targetProject.id = 'target-project-id';
      targetProject.name = 'Target Project';

      // Create expected new task (the duplicated task)
      const duplicatedTask = new Task();
      duplicatedTask.id = 'new-task-id';
      duplicatedTask.title = sourceTask.title;
      duplicatedTask.description = sourceTask.description;
      duplicatedTask.priority = sourceTask.priority;
      duplicatedTask.status = sourceTask.status;
      duplicatedTask.dueDate = null;

      // Set project property
      duplicatedTask.project = targetProject;

      // Mock repository methods
      tasksRepository.getTaskById.mockResolvedValue(sourceTask);
      projectsRepository.findOne.mockResolvedValue(targetProject);
      tasksRepository.createTask.mockResolvedValue(duplicatedTask);

      // Call the method
      await projectsService.duplicateTaskToProject(
        'source-task-id',
        'target-project-id',
      );

      // Verify that createTask was called with null dueDate
      expect(tasksRepository.createTask).toHaveBeenCalledWith({
        title: sourceTask.title,
        description: sourceTask.description,
        dueDate: null,
        priority: sourceTask.priority,
        status: sourceTask.status,
        projectId: 'target-project-id',
      });
    });

    it('should handle recurring tasks correctly', async () => {
      // Create recurring source task
      const sourceTask = new Task();
      sourceTask.id = 'recurring-task-id';
      sourceTask.title = 'Recurring Task';
      sourceTask.description = 'This is a recurring task';
      sourceTask.priority = TaskPriority.HIGH;
      sourceTask.status = TaskStatus.NOT_STARTED;
      sourceTask.dueDate = new Date('2025-06-15T10:00:00Z');
      sourceTask.isRecurring = true;
      sourceTask.recurrencePattern = 'weekly';
      sourceTask.recurrenceDays = 'monday,wednesday,friday';
      sourceTask.recurrenceRule = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';

      // Create target project
      const targetProject = new Project();
      targetProject.id = 'target-project-id';
      targetProject.name = 'Target Project';

      // Create expected new task (the duplicated task)
      const duplicatedTask = new Task();
      duplicatedTask.id = 'new-recurring-task-id';
      duplicatedTask.title = sourceTask.title;
      duplicatedTask.description = sourceTask.description;
      duplicatedTask.priority = sourceTask.priority;
      duplicatedTask.status = sourceTask.status;

      // Set project property
      duplicatedTask.project = targetProject;

      // Mock repository methods
      tasksRepository.getTaskById.mockResolvedValue(sourceTask);
      projectsRepository.findOne.mockResolvedValue(targetProject);
      tasksRepository.createTask.mockResolvedValue(duplicatedTask);

      // Call the method
      await projectsService.duplicateTaskToProject(
        'recurring-task-id',
        'target-project-id',
      );

      // Verify that recurring properties are not included in the task creation
      const createTaskCall = tasksRepository.createTask.mock.calls[0][0];
      expect(createTaskCall).not.toHaveProperty('isRecurring');
      expect(createTaskCall).not.toHaveProperty('recurrencePattern');
      expect(createTaskCall).not.toHaveProperty('recurrenceDays');
      expect(createTaskCall).not.toHaveProperty('recurrenceRule');

      // But basic task properties are included
      expect(createTaskCall).toHaveProperty('title', sourceTask.title);
      expect(createTaskCall).toHaveProperty('projectId', 'target-project-id');
    });

    it('should throw NotFoundException when target project does not exist', async () => {
      // Create source task
      const sourceTask = new Task();
      sourceTask.id = 'source-task-id';
      sourceTask.title = 'Source Task';

      // Mock repositories
      tasksRepository.getTaskById.mockResolvedValue(sourceTask);
      projectsRepository.findOne.mockResolvedValue(null); // Project not found

      // Call the method and expect it to throw
      await expect(
        projectsService.duplicateTaskToProject(
          'source-task-id',
          'non-existent-project',
        ),
      ).rejects.toThrow(NotFoundException);

      // Verify repositories were called
      expect(tasksRepository.getTaskById).toHaveBeenCalledWith(
        'source-task-id',
      );
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-project' },
      });

      // Verify that createTask was NOT called
      expect(tasksRepository.createTask).not.toHaveBeenCalled();
    });

    it('should propagate exceptions from getTaskById', async () => {
      // Mock source task not found
      tasksRepository.getTaskById.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      // Call the method and expect it to throw
      await expect(
        projectsService.duplicateTaskToProject(
          'non-existent-task',
          'target-project-id',
        ),
      ).rejects.toThrow(NotFoundException);

      // Verify repositories were called
      expect(tasksRepository.getTaskById).toHaveBeenCalledWith(
        'non-existent-task',
      );

      // Verify findOne was NOT called (execution should stop at getTaskById)
      expect(projectsRepository.findOne).not.toHaveBeenCalled();

      // Verify createTask was NOT called
      expect(tasksRepository.createTask).not.toHaveBeenCalled();
    });
  });

  describe('createTaskWithProject', () => {
    it('should create a task with a valid project reference', async () => {
      // Create new task data
      const newTask = new Task();
      newTask.title = 'New Task Title';
      newTask.description = 'New Task Description';
      newTask.priority = TaskPriority.MEDIUM;
      newTask.status = TaskStatus.NOT_STARTED;
      newTask.dueDate = new Date('2025-07-15T14:00:00Z');

      // Create target project
      const targetProject = new Project();
      targetProject.id = 'target-project-id';
      targetProject.name = 'Target Project';

      // Create expected created task
      const createdTask = new Task();
      createdTask.id = 'created-task-id';
      createdTask.title = newTask.title;
      createdTask.description = newTask.description;
      createdTask.priority = newTask.priority;
      createdTask.status = newTask.status;

      // Set project property
      createdTask.project = targetProject;

      // Mock repository methods
      projectsRepository.findOne.mockResolvedValue(targetProject);
      tasksRepository.createTask.mockResolvedValue(createdTask);

      // Call the method
      const result = await projectsService.createTaskWithProject(
        'target-project-id',
        newTask,
      );

      // Verify repository calls
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'target-project-id' },
      });

      // Verify createTask was called with correct data
      expect(tasksRepository.createTask).toHaveBeenCalledWith({
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate.toISOString(),
        priority: newTask.priority,
        status: newTask.status,
        projectId: 'target-project-id',
      });

      // Verify result is the created task
      expect(result).toBe(createdTask);
    });

    it('should handle tasks without a dueDate', async () => {
      // Create new task data without due date
      const newTask = new Task();
      newTask.title = 'Task Without Due Date';
      newTask.description = 'This is a task without a due date';
      newTask.priority = TaskPriority.LOW;
      newTask.status = TaskStatus.NOT_STARTED;
      newTask.dueDate = null;

      // Create target project
      const targetProject = new Project();
      targetProject.id = 'target-project-id';
      targetProject.name = 'Target Project';

      // Mock repository methods
      projectsRepository.findOne.mockResolvedValue(targetProject);
      tasksRepository.createTask.mockResolvedValue(new Task());

      // Call the method
      await projectsService.createTaskWithProject('target-project-id', newTask);

      // Verify createTask was called with null dueDate
      expect(tasksRepository.createTask).toHaveBeenCalledWith({
        title: newTask.title,
        description: newTask.description,
        dueDate: null,
        priority: newTask.priority,
        status: newTask.status,
        projectId: 'target-project-id',
      });
    });

    it('should handle system projects correctly', async () => {
      // Create new task
      const newTask = new Task();
      newTask.title = 'Inbox Task';
      newTask.priority = TaskPriority.MEDIUM;
      newTask.status = TaskStatus.NOT_STARTED;

      // Create system project (Inbox)
      const inboxProject = new Project();
      inboxProject.id = 'inbox-id';
      inboxProject.name = 'Inbox';
      inboxProject.isSystem = true;

      // Mock repository methods
      projectsRepository.findOne.mockResolvedValue(inboxProject);
      tasksRepository.createTask.mockResolvedValue(new Task());

      // Call the method
      await projectsService.createTaskWithProject('inbox-id', newTask);

      // Verify createTask was called with the system project ID
      expect(tasksRepository.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'inbox-id',
        }),
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      // Create new task
      const newTask = new Task();
      newTask.title = 'Task for Non-existent Project';

      // Mock repository to return null (project not found)
      projectsRepository.findOne.mockResolvedValue(null);

      // Call the method and expect it to throw
      await expect(
        projectsService.createTaskWithProject('non-existent-project', newTask),
      ).rejects.toThrow(NotFoundException);

      // Verify findOne was called
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-project' },
      });

      // Verify createTask was NOT called
      expect(tasksRepository.createTask).not.toHaveBeenCalled();
    });

    it('should properly handle recurring task properties', async () => {
      // Create new recurring task
      const recurringTask = new Task();
      recurringTask.title = 'Recurring Weekly Meeting';
      recurringTask.description = 'Team sync-up';
      recurringTask.priority = TaskPriority.MEDIUM;
      recurringTask.status = TaskStatus.NOT_STARTED;
      recurringTask.dueDate = new Date('2025-06-01T10:00:00Z');
      recurringTask.isRecurring = true;
      recurringTask.recurrencePattern = 'weekly';
      recurringTask.recurrenceDays = 'monday';
      recurringTask.recurrenceTimeOfDay = 'morning';

      // Create target project
      const targetProject = new Project();
      targetProject.id = 'team-project-id';
      targetProject.name = 'Team Project';

      // Mock repository methods
      projectsRepository.findOne.mockResolvedValue(targetProject);
      tasksRepository.createTask.mockResolvedValue(new Task());

      // Call the method
      await projectsService.createTaskWithProject(
        'team-project-id',
        recurringTask,
      );

      // Verify that recurring properties are not included in the task creation
      const createTaskCall = tasksRepository.createTask.mock.calls[0][0];
      expect(createTaskCall).not.toHaveProperty('isRecurring');
      expect(createTaskCall).not.toHaveProperty('recurrencePattern');
      expect(createTaskCall).not.toHaveProperty('recurrenceDays');
      expect(createTaskCall).not.toHaveProperty('recurrenceTimeOfDay');

      // But basic task properties are included
      expect(createTaskCall).toHaveProperty('title', recurringTask.title);
      expect(createTaskCall).toHaveProperty('projectId', 'team-project-id');
    });
  });

  describe('Project Hierarchy Edge Cases', () => {
    describe('Circular Reference Prevention', () => {
      it('should prevent a project from being its own parent', async () => {
        // Mock project
        const project = new Project();
        project.id = 'project-id';
        project.name = 'Test Project';

        // Mock repository behavior for wouldCreateCircularReference
        const updateDto: UpdateProjectDto = {
          name: 'Test Project',
          parentId: 'project-id',
        };

        // Mock repository to throw when attempting to create circular reference
        projectsRepository.updateProject.mockRejectedValue(
          new BadRequestException(
            'Cannot set parent: would create circular reference',
          ),
        );

        // Verify the exception is thrown
        await expect(
          projectsService.updateProject('project-id', updateDto),
        ).rejects.toThrow(BadRequestException);

        // Verify updateProject was called with the right parameters
        expect(projectsRepository.updateProject).toHaveBeenCalledWith(
          'project-id',
          updateDto,
        );
      });

      it('should prevent a parent from becoming a child of its descendant', async () => {
        // Setup: parentA -> childB -> grandchildC
        // Test: prevent parentA from becoming a child of grandchildC

        // Create projects for the hierarchy
        const parentA = new Project();
        parentA.id = 'parent-a';
        parentA.name = 'Parent Project';

        const childB = new Project();
        childB.id = 'child-b';
        childB.name = 'Child Project';
        childB.parent = parentA;

        const grandchildC = new Project();
        grandchildC.id = 'grandchild-c';
        grandchildC.name = 'Grandchild Project';
        grandchildC.parent = childB;

        // Mock repository behavior
        const updateDto: UpdateProjectDto = {
          name: 'Parent Project',
          parentId: 'grandchild-c',
        };

        // Mock repository to throw when attempting to create circular reference
        projectsRepository.updateProject.mockRejectedValue(
          new BadRequestException(
            'Cannot set parent: would create circular reference',
          ),
        );

        // Verify the exception is thrown
        await expect(
          projectsService.updateProject('parent-a', updateDto),
        ).rejects.toThrow(BadRequestException);

        // Verify updateProject was called with the right parameters
        expect(projectsRepository.updateProject).toHaveBeenCalledWith(
          'parent-a',
          updateDto,
        );
      });
    });

    describe('Deep Nesting Scenarios', () => {
      it('should successfully move a project with a deep hierarchy', async () => {
        // Create a deep hierarchy
        // parent -> child -> grandchild -> great-grandchild

        // Create projects for the hierarchy
        const parent = new Project();
        parent.id = 'parent-id';
        parent.name = 'Parent Project';
        parent.children = [];

        const child = new Project();
        child.id = 'child-id';
        child.name = 'Child Project';
        child.parent = parent;
        child.children = [];

        const grandchild = new Project();
        grandchild.id = 'grandchild-id';
        grandchild.name = 'Grandchild Project';
        grandchild.parent = child;
        grandchild.children = [];

        const greatGrandchild = new Project();
        greatGrandchild.id = 'great-grandchild-id';
        greatGrandchild.name = 'Great Grandchild Project';
        greatGrandchild.parent = grandchild;
        greatGrandchild.children = [];

        // Setup child relationships
        parent.children = [child];
        child.children = [grandchild];
        grandchild.children = [greatGrandchild];

        // Create target project
        const targetProject = new Project();
        targetProject.id = 'target-id';
        targetProject.name = 'Target Project';
        targetProject.children = [];

        // Mock projectsRepository.moveProject
        projectsRepository.moveProject.mockResolvedValue(undefined);

        // Create move DTO
        const moveDto: ProjectMoveDto = {
          projectId: 'parent-id',
          targetId: 'target-id',
          position: 'inside',
        };

        // Execute the moveProject method
        await projectsService.moveProject(moveDto);

        // Verify moveProject was called with correct parameters
        expect(projectsRepository.moveProject).toHaveBeenCalledWith(
          'parent-id',
          'target-id',
          'inside',
        );
      });

      it('should handle moving a project to root level', async () => {
        // Create a project that is currently a child
        const childProject = new Project();
        childProject.id = 'child-id';
        childProject.name = 'Child Project';

        const parentProject = new Project();
        parentProject.id = 'parent-id';
        parentProject.name = 'Parent Project';

        childProject.parent = parentProject;

        // Mock moveProject to simulate moving to root
        projectsRepository.moveProject.mockResolvedValue(undefined);

        // Create move DTO for moving to root (null targetId)
        const moveDto: ProjectMoveDto = {
          projectId: 'child-id',
          targetId: null,
          position: 'inside', // Position doesn't matter for root
        };

        // Execute the moveProject method
        await projectsService.moveProject(moveDto);

        // Verify moveProject was called with correct parameters
        expect(projectsRepository.moveProject).toHaveBeenCalledWith(
          'child-id',
          null,
          'inside',
        );
      });
    });

    describe('System Project Restrictions', () => {
      it('should prevent moving a system project', async () => {
        // Create a system project (e.g., Inbox)
        const inboxProject = new Project();
        inboxProject.id = 'inbox-id';
        inboxProject.name = 'Inbox';
        inboxProject.isSystem = true;

        const targetProject = new Project();
        targetProject.id = 'target-id';
        targetProject.name = 'Target Project';

        // Mock getProjectById to return the system project
        projectsRepository.getProjectById.mockResolvedValue(inboxProject);

        // Mock moveProject to throw BadRequestException
        projectsRepository.moveProject.mockRejectedValue(
          new BadRequestException('Cannot move system project'),
        );

        // Create move DTO
        const moveDto: ProjectMoveDto = {
          projectId: 'inbox-id',
          targetId: 'target-id',
          position: 'inside',
        };

        // Execute and expect exception
        await expect(projectsService.moveProject(moveDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should prevent setting a system project as a child of another project', async () => {
        // Create a system project (e.g., Inbox)
        const inboxProject = new Project();
        inboxProject.id = 'inbox-id';
        inboxProject.name = 'Inbox';
        inboxProject.isSystem = true;

        // Create a regular parent project
        const parentProject = new Project();
        parentProject.id = 'parent-id';
        parentProject.name = 'Parent Project';

        // Mock getProjectById for the system project
        projectsRepository.getProjectById.mockResolvedValue(inboxProject);

        // Create update DTO to set parent
        const updateDto: UpdateProjectDto = {
          name: 'Inbox',
          parentId: 'parent-id',
        };

        // Mock updateProject to throw BadRequestException
        projectsRepository.updateProject.mockRejectedValue(
          new BadRequestException('Cannot move system project'),
        );

        // Execute and expect exception
        await expect(
          projectsService.updateProject('inbox-id', updateDto),
        ).rejects.toThrow(BadRequestException);

        // Verify updateProject was called with the right parameters
        expect(projectsRepository.updateProject).toHaveBeenCalledWith(
          'inbox-id',
          updateDto,
        );
      });

      it('should allow setting regular projects as children of system projects', async () => {
        // Create a system project (e.g., Inbox)
        const inboxProject = new Project();
        inboxProject.id = 'inbox-id';
        inboxProject.name = 'Inbox';
        inboxProject.isSystem = true;

        // Create a regular project
        const regularProject = new Project();
        regularProject.id = 'regular-id';
        regularProject.name = 'Regular Project';

        // Mock result after update
        const updatedProject = new Project();
        updatedProject.id = 'regular-id';
        updatedProject.name = 'Regular Project';
        updatedProject.parent = inboxProject;

        // Create update DTO to set parent
        const updateDto: UpdateProjectDto = {
          name: 'Regular Project',
          parentId: 'inbox-id',
        };

        // Mock updateProject to return the updated project
        projectsRepository.updateProject.mockResolvedValue(updatedProject);

        // Execute update
        const result = await projectsService.updateProject(
          'regular-id',
          updateDto,
        );

        // Verify updateProject was called with the right parameters
        expect(projectsRepository.updateProject).toHaveBeenCalledWith(
          'regular-id',
          updateDto,
        );

        // Verify the result
        expect(result).toBe(updatedProject);
        expect(result.parent).toBe(inboxProject);
      });
    });
  });
});
