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
import { mockRequest, mockUser } from '../../../mocks/request.mock';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectService: jest.Mocked<ProjectsService>;

  const mockProject: Project = {
    id: 'project-123',
    name: 'Test Project',
    description: 'Test Description',
    parent: null,
    children: [],
    tasks: [],
    user: mockUser,
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    isArchived: false,
    isSystem: false,
    type: ProjectType.REGULAR,
    color: '#000000',
    order: 0,
  };

  const mockStats = {
    totalTasks: 5,
    completedTasks: 2,
    notStartedTasks: 3,
    overdueTasks: 1,
    progress: 0.4,
    subprojectsCount: 0,
    deepTasksCount: 5,
  };

  const mockTimeline = {
    project: mockProject,
    tasksByMonth: { '2025-01': 5 },
    completionTrend: { '2025-01': 2 },
  };

  beforeEach(async () => {
    const mockProjectsService = {
      getProjects: jest.fn(),
      getProjectById: jest.fn(),
      searchProjects: jest.fn(),
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      archiveProject: jest.fn(),
      getProjectTree: jest.fn(),
      getProjectWithAncestors: jest.fn(),
      getProjectBreadcrumb: jest.fn(),
      getProjectStats: jest.fn(),
      getProjectTimeline: jest.fn(),
      duplicateProject: jest.fn(),
      moveProject: jest.fn(),
      reorderProjects: jest.fn(),
      mergeProjects: jest.fn(),
    };

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
    projectService = module.get(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProjects', () => {
    it('should return an array of projects', async () => {
      const filterDto = {
        search: 'test',
        includeArchived: false,
        includeSystem: false,
        parentId: null,
      };

      projectService.getProjects.mockResolvedValue([mockProject]);

      const result = await controller.getProjects(filterDto, mockRequest);
      expect(result).toEqual([mockProject]);
      expect(projectService.getProjects).toHaveBeenCalledWith(
        filterDto,
        mockUser.id,
      );
    });
  });

  describe('searchProjects', () => {
    it('should return search results', async () => {
      const query = 'test';
      projectService.searchProjects.mockResolvedValue([mockProject]);

      const result = await controller.searchProjects(query, mockRequest);
      expect(result).toEqual([mockProject]);
      expect(projectService.searchProjects).toHaveBeenCalledWith(
        query,
        mockUser.id,
      );
    });
  });

  describe('getProjectById', () => {
    it('should return a project by id', async () => {
      projectService.getProjectById.mockResolvedValue(mockProject);

      const result = await controller.getProjectById(
        mockProject.id,
        mockRequest,
      );

      expect(result).toEqual(mockProject);
      expect(projectService.getProjectById).toHaveBeenCalledWith(
        mockProject.id,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when project is not found', async () => {
      projectService.getProjectById.mockResolvedValue(null);

      await expect(
        controller.getProjectById('non-existent-id', mockRequest),
      ).rejects.toThrow(NotFoundException);
      expect(projectService.getProjectById).toHaveBeenCalledWith(
        'non-existent-id',
        mockUser.id,
      );
    });
  });

  describe('getProjectWithAncestors', () => {
    it('should return project with ancestors', async () => {
      const id = 'project-123';
      projectService.getProjectWithAncestors.mockResolvedValue({
        project: mockProject,
        ancestors: [mockProject],
      });

      const result = await controller.getProjectWithAncestors(id, mockRequest);
      expect(result).toEqual({
        project: mockProject,
        ancestors: [mockProject],
      });
      expect(projectService.getProjectWithAncestors).toHaveBeenCalledWith(
        id,
        mockUser.id,
      );
    });
  });

  describe('getProjectBreadcrumb', () => {
    it('should return project breadcrumb', async () => {
      const id = 'project-123';
      projectService.getProjectBreadcrumb.mockResolvedValue([mockProject]);

      const result = await controller.getProjectBreadcrumb(id, mockRequest);
      expect(result).toEqual([mockProject]);
      expect(projectService.getProjectBreadcrumb).toHaveBeenCalledWith(
        id,
        mockUser.id,
      );
    });
  });

  describe('getProjectStats', () => {
    it('should return project stats', async () => {
      const id = 'project-123';
      projectService.getProjectStats.mockResolvedValue(mockStats);

      const result = await controller.getProjectStats(id, mockRequest);
      expect(result).toEqual(mockStats);
      expect(projectService.getProjectStats).toHaveBeenCalledWith(
        id,
        mockUser.id,
      );
    });
  });

  describe('getProjectTimeline', () => {
    it('should return project timeline', async () => {
      const id = 'project-123';
      projectService.getProjectTimeline.mockResolvedValue(mockTimeline);

      const result = await controller.getProjectTimeline(id, mockRequest);
      expect(result).toEqual(mockTimeline);
      expect(projectService.getProjectTimeline).toHaveBeenCalledWith(
        id,
        mockUser.id,
      );
    });
  });

  describe('createProject', () => {
    it('should create a project', async () => {
      const createDto = {
        name: 'New Project',
        description: 'New Description',
        color: '#000000',
        parentId: null,
      };

      projectService.createProject.mockResolvedValue(mockProject);

      const result = await controller.createProject(createDto, mockRequest);
      expect(result).toEqual(mockProject);
      expect(projectService.createProject).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
      );
    });
  });

  describe('duplicateProject', () => {
    it('should duplicate a project', async () => {
      const id = 'project-123';
      const includeSubprojects = true;
      const includeTasks = true;

      projectService.duplicateProject.mockResolvedValue(mockProject);

      const result = await controller.duplicateProject(
        id,
        mockRequest,
        includeSubprojects,
        includeTasks,
      );
      expect(result).toEqual(mockProject);
      expect(projectService.duplicateProject).toHaveBeenCalledWith(
        id,
        mockUser.id,
        {
          includeSubprojects,
          includeTasks,
        },
      );
    });
  });

  describe('updateProject', () => {
    it('should update a project', async () => {
      const id = 'project-123';
      const updateDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      };

      projectService.updateProject.mockResolvedValue(mockProject);

      const result = await controller.updateProject(id, updateDto, mockRequest);
      expect(result).toEqual(mockProject);
      expect(projectService.updateProject).toHaveBeenCalledWith(
        id,
        updateDto,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when project to update is not found', async () => {
      const id = 'non-existent';
      const updateDto = {
        name: 'Updated Project',
      };

      projectService.updateProject.mockRejectedValue(new NotFoundException());

      await expect(
        controller.updateProject(id, updateDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('moveProject', () => {
    it('should move a project', async () => {
      const moveDto = {
        projectId: 'project-123',
        targetId: 'target-123',
        position: 'after' as const,
      };

      projectService.moveProject.mockResolvedValue();

      await controller.moveProject(moveDto, mockRequest);
      expect(projectService.moveProject).toHaveBeenCalledWith(
        moveDto,
        mockUser.id,
      );
    });
  });

  describe('reorderProjects', () => {
    it('should reorder projects', async () => {
      const projectIds = ['project-1', 'project-2', 'project-3'];

      projectService.reorderProjects.mockResolvedValue();

      await controller.reorderProjects(projectIds, mockRequest);
      expect(projectService.reorderProjects).toHaveBeenCalledWith(
        projectIds,
        mockUser.id,
      );
    });
  });

  describe('archiveProject', () => {
    it('should archive a project', async () => {
      const id = 'project-123';
      projectService.archiveProject.mockResolvedValue(mockProject);

      const result = await controller.archiveProject(id, mockRequest);
      expect(result).toEqual(mockProject);
      expect(projectService.archiveProject).toHaveBeenCalledWith(
        id,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when project to archive is not found', async () => {
      const id = 'non-existent';
      projectService.archiveProject.mockRejectedValue(new NotFoundException());

      await expect(controller.archiveProject(id, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('mergeProjects', () => {
    it('should merge projects', async () => {
      const sourceId = 'source-123';
      const targetId = 'target-123';

      projectService.mergeProjects.mockResolvedValue(mockProject);

      const result = await controller.mergeProjects(
        sourceId,
        targetId,
        mockRequest,
      );
      expect(result).toEqual(mockProject);
      expect(projectService.mergeProjects).toHaveBeenCalledWith(
        sourceId,
        targetId,
        mockUser.id,
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      projectService.deleteProject.mockResolvedValue();

      await controller.deleteProject(mockProject.id, mockRequest);
      expect(projectService.deleteProject).toHaveBeenCalledWith(
        mockProject.id,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when project to delete is not found', async () => {
      const id = 'non-existent';
      projectService.deleteProject.mockRejectedValue(new NotFoundException());

      await expect(controller.deleteProject(id, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProjectTree', () => {
    it('should return project tree', async () => {
      projectService.getProjectTree.mockResolvedValue([mockProject]);

      const result = await controller.getProjectTree(mockRequest);
      expect(result).toEqual([mockProject]);
      expect(projectService.getProjectTree).toHaveBeenCalledWith(
        mockUser.id,
        undefined,
      );
    });
  });
});
