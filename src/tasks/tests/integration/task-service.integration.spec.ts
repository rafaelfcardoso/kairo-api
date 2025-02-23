import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../../tasks.service';
import { Repository } from 'typeorm';
import { Task } from '../../tasks.entity';
import { Project } from '../../../projects/projects.entity';
import { SecurityLoggerService } from '../../../common/services/security-logger.service';
import { NotFoundException } from '@nestjs/common';
import { TasksRepository } from '../../tasks.repository';
import { ProjectsRepository } from '../../../projects/projects.repository';
import { TagsRepository } from '../../../tags/tags.repository';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('TaskService', () => {
  let service: TaskService;
  let mockTaskRepository: Repository<Task>;
  let mockProjectsRepository: ProjectsRepository;
  let mockSecurityLogger: SecurityLoggerService;
  let mockTasksRepository: TasksRepository;

  beforeEach(async () => {
    mockTaskRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as any;

    mockProjectsRepository = {
      findOne: jest.fn(),
    } as any;

    mockTasksRepository = {
      createTask: jest.fn(),
      getTasks: jest.fn(),
      getTaskById: jest.fn(),
    } as any;

    mockSecurityLogger = {
      logSecurityEvent: jest.fn(),
      logValidationFailure: jest.fn(),
      logSuspiciousActivity: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
        {
          provide: ProjectsRepository,
          useValue: mockProjectsRepository,
        },
        {
          provide: TagsRepository,
          useValue: {},
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: SecurityLoggerService,
          useValue: mockSecurityLogger,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  describe('Project Assignment', () => {
    const projectId = 'test-project-id';
    const mockProject = { id: projectId, name: 'Test Project' };
    const createTaskDto = {
      title: 'Test Task',
      description: 'Test Description',
      projectId: projectId,
    };

    it('should assign task to specified project when creating task', async () => {
      const mockTask = {
        id: 'test-task-id',
        title: createTaskDto.title,
        description: createTaskDto.description,
        project: mockProject,
      };

      (mockTasksRepository.createTask as jest.Mock).mockImplementation(
        async (dto) => {
          if (dto.projectId === projectId) {
            return mockTask;
          }
          throw new NotFoundException(
            `Project with ID "${dto.projectId}" not found`,
          );
        },
      );

      const result = await service.createTask(createTaskDto);

      expect(result).toBeDefined();
      expect(result.project).toBeDefined();
      expect(result.project.id).toBe(projectId);
      expect(mockTasksRepository.createTask).toHaveBeenCalledWith(
        createTaskDto,
      );
    });

    it('should throw error when specified project does not exist', async () => {
      (mockTasksRepository.createTask as jest.Mock).mockRejectedValue(
        new NotFoundException(`Project with ID "${projectId}" not found`),
      );

      await expect(service.createTask(createTaskDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockTasksRepository.createTask).toHaveBeenCalledWith(
        createTaskDto,
      );
    });
  });
});
