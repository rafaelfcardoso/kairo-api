import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from '../../../../src/projects/projects.controller';
import { ProjectsService } from '../../../../src/projects/projects.service';
import { NotFoundException } from '@nestjs/common';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilterDto,
  ProjectMoveDto,
} from '../../../../src/projects/projects.dto';
import { Project, ProjectType } from '../../../../src/projects/projects.entity';
import { v4 as uuidv4 } from 'uuid';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: ProjectsService;

  const mockProjectsService = {
    getProjects: jest.fn(),
    getProjectTree: jest.fn(),
    searchProjects: jest.fn(),
    getProjectById: jest.fn(),
    getProjectWithAncestors: jest.fn(),
    getProjectBreadcrumb: jest.fn(),
    getProjectStats: jest.fn(),
    getProjectTimeline: jest.fn(),
    calculateProjectHealth: jest.fn(),
    createProject: jest.fn(),
    duplicateProject: jest.fn(),
    updateProject: jest.fn(),
    moveProject: jest.fn(),
    reorderProjects: jest.fn(),
    archiveProject: jest.fn(),
    mergeProjects: jest.fn(),
    deleteProject: jest.fn(),
  };

  const mockProject: Project = {
    id: uuidv4(),
    name: 'Test Project',
    description: 'Test Description',
    isArchived: false,
    isSystem: false,
    type: ProjectType.REGULAR,
    parent: null,
    children: [],
    tasks: [],
    color: '#4A90E2',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get<ProjectsService>(ProjectsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProjects', () => {
    it('should return all projects with filters', async () => {
      const filterDto: ProjectFilterDto = {
        search: 'test',
        includeArchived: false,
        includeSystem: false,
      };

      mockProjectsService.getProjects.mockResolvedValue([mockProject]);

      const result = await controller.getProjects(filterDto);

      expect(result).toEqual([mockProject]);
      expect(projectsService.getProjects).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('getProjectTree', () => {
    it('should return project tree', async () => {
      const rootId = 'root-id';
      const projectTree = [
        {
          ...mockProject,
          children: [{ ...mockProject, id: 'child-id' }],
        },
      ];

      mockProjectsService.getProjectTree.mockResolvedValue(projectTree);

      const result = await controller.getProjectTree(rootId);

      expect(result).toEqual(projectTree);
      expect(projectsService.getProjectTree).toHaveBeenCalledWith(rootId);
    });
  });

  describe('searchProjects', () => {
    it('should return search results', async () => {
      const query = 'test';

      mockProjectsService.searchProjects.mockResolvedValue([mockProject]);

      const result = await controller.searchProjects(query);

      expect(result).toEqual([mockProject]);
      expect(projectsService.searchProjects).toHaveBeenCalledWith(query);
    });
  });

  describe('getProjectById', () => {
    it('should return a project by id', async () => {
      mockProjectsService.getProjectById.mockResolvedValue(mockProject);

      const result = await controller.getProjectById(mockProject.id);

      expect(result).toEqual(mockProject);
      expect(projectsService.getProjectById).toHaveBeenCalledWith(
        mockProject.id,
      );
    });

    it('should throw NotFoundException when project is not found', async () => {
      const id = 'non-existent-id';
      mockProjectsService.getProjectById.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.getProjectById(id)).rejects.toThrow(
        NotFoundException,
      );
      expect(projectsService.getProjectById).toHaveBeenCalledWith(id);
    });
  });

  describe('getProjectWithAncestors', () => {
    it('should return project with ancestors', async () => {
      const projectWithAncestors = {
        ...mockProject,
        ancestors: [{ ...mockProject, id: 'ancestor-id' }],
      };

      mockProjectsService.getProjectWithAncestors.mockResolvedValue(
        projectWithAncestors,
      );

      const result = await controller.getProjectWithAncestors(mockProject.id);

      expect(result).toEqual(projectWithAncestors);
      expect(projectsService.getProjectWithAncestors).toHaveBeenCalledWith(
        mockProject.id,
      );
    });
  });

  describe('getProjectBreadcrumb', () => {
    it('should return project breadcrumb trail', async () => {
      const breadcrumb = [{ ...mockProject, id: 'ancestor-id' }, mockProject];

      mockProjectsService.getProjectBreadcrumb.mockResolvedValue(breadcrumb);

      const result = await controller.getProjectBreadcrumb(mockProject.id);

      expect(result).toEqual(breadcrumb);
      expect(projectsService.getProjectBreadcrumb).toHaveBeenCalledWith(
        mockProject.id,
      );
    });
  });

  describe('getProjectStats', () => {
    it('should return project statistics', async () => {
      const stats = {
        tasksCount: 10,
        completedTasksCount: 5,
        progress: 50,
      };

      mockProjectsService.getProjectStats.mockResolvedValue(stats);

      const result = await controller.getProjectStats(mockProject.id);

      expect(result).toEqual(stats);
      expect(projectsService.getProjectStats).toHaveBeenCalledWith(
        mockProject.id,
      );
    });
  });

  describe('getProjectTimeline', () => {
    it('should return project timeline', async () => {
      const timeline = [
        {
          date: new Date(),
          tasks: [{ id: 'task-id', title: 'Task 1' }],
        },
      ];

      mockProjectsService.getProjectTimeline.mockResolvedValue(timeline);

      const result = await controller.getProjectTimeline(mockProject.id);

      expect(result).toEqual(timeline);
      expect(projectsService.getProjectTimeline).toHaveBeenCalledWith(
        mockProject.id,
      );
    });
  });

  describe('getProjectHealth', () => {
    it('should return project health status', async () => {
      const health = {
        status: 'good',
        score: 85,
        factors: {
          taskCompletion: 90,
          deadlinesMet: 80,
        },
      };

      mockProjectsService.calculateProjectHealth.mockResolvedValue(health);

      const result = await controller.getProjectHealth(mockProject.id);

      expect(result).toEqual(health);
      expect(projectsService.calculateProjectHealth).toHaveBeenCalledWith(
        mockProject.id,
      );
    });
  });

  describe('createProject', () => {
    it('should create a project', async () => {
      const createDto: CreateProjectDto = {
        name: 'New Project',
        description: 'New Description',
        color: '#FF5733',
      };

      mockProjectsService.createProject.mockResolvedValue({
        ...mockProject,
        name: createDto.name,
        description: createDto.description,
        color: createDto.color,
      });

      const result = await controller.createProject(createDto);

      expect(result).toEqual({
        ...mockProject,
        name: createDto.name,
        description: createDto.description,
        color: createDto.color,
      });
      expect(projectsService.createProject).toHaveBeenCalledWith(createDto);
    });
  });

  describe('duplicateProject', () => {
    it('should duplicate a project', async () => {
      const duplicatedProject = {
        ...mockProject,
        id: 'duplicate-id',
        name: 'Test Project (Copy)',
      };

      mockProjectsService.duplicateProject.mockResolvedValue(duplicatedProject);

      const result = await controller.duplicateProject(
        mockProject.id,
        true,
        true,
      );

      expect(result).toEqual(duplicatedProject);
      expect(projectsService.duplicateProject).toHaveBeenCalledWith(
        mockProject.id,
        {
          includeSubprojects: true,
          includeTasks: true,
        },
      );
    });
  });

  describe('updateProject', () => {
    it('should update a project', async () => {
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      };

      const updatedProject = {
        ...mockProject,
        name: updateDto.name,
        description: updateDto.description,
      };

      mockProjectsService.updateProject.mockResolvedValue(updatedProject);

      const result = await controller.updateProject(mockProject.id, updateDto);

      expect(result).toEqual(updatedProject);
      expect(projectsService.updateProject).toHaveBeenCalledWith(
        mockProject.id,
        updateDto,
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const id = 'non-existent-id';
      const updateDto: UpdateProjectDto = {
        name: 'Updated Project',
      };

      mockProjectsService.updateProject.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.updateProject(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(projectsService.updateProject).toHaveBeenCalledWith(id, updateDto);
    });
  });

  describe('moveProject', () => {
    it('should move a project', async () => {
      const moveDto: ProjectMoveDto = {
        projectId: mockProject.id,
        targetId: 'target-project-id',
        position: 'after',
      };

      mockProjectsService.moveProject.mockResolvedValue(undefined);

      await controller.moveProject(moveDto);

      expect(projectsService.moveProject).toHaveBeenCalledWith(moveDto);
    });
  });

  describe('reorderProjects', () => {
    it('should reorder projects', async () => {
      const projectIds = ['id1', 'id2', 'id3'];

      mockProjectsService.reorderProjects.mockResolvedValue(undefined);

      await controller.reorderProjects(projectIds);

      expect(projectsService.reorderProjects).toHaveBeenCalledWith(projectIds);
    });
  });

  describe('archiveProject', () => {
    it('should archive a project', async () => {
      const archivedProject = {
        ...mockProject,
        isArchived: true,
      };

      mockProjectsService.archiveProject.mockResolvedValue(archivedProject);

      const result = await controller.archiveProject(mockProject.id);

      expect(result).toEqual(archivedProject);
      expect(projectsService.archiveProject).toHaveBeenCalledWith(
        mockProject.id,
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const id = 'non-existent-id';

      mockProjectsService.archiveProject.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.archiveProject(id)).rejects.toThrow(
        NotFoundException,
      );
      expect(projectsService.archiveProject).toHaveBeenCalledWith(id);
    });
  });

  describe('mergeProjects', () => {
    it('should merge projects', async () => {
      const sourceId = 'source-id';
      const targetId = 'target-id';
      const mergedProject = {
        ...mockProject,
        id: targetId,
        tasksCount: 15,
      };

      mockProjectsService.mergeProjects.mockResolvedValue(mergedProject);

      const result = await controller.mergeProjects(sourceId, targetId);

      expect(result).toEqual(mergedProject);
      expect(projectsService.mergeProjects).toHaveBeenCalledWith(
        sourceId,
        targetId,
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      mockProjectsService.deleteProject.mockResolvedValue(undefined);

      await controller.deleteProject(mockProject.id);

      expect(projectsService.deleteProject).toHaveBeenCalledWith(
        mockProject.id,
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const id = 'non-existent-id';

      mockProjectsService.deleteProject.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.deleteProject(id)).rejects.toThrow(
        NotFoundException,
      );
      expect(projectsService.deleteProject).toHaveBeenCalledWith(id);
    });
  });
});
