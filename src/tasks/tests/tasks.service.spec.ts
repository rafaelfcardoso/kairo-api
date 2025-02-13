import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../tasks.service';
import { Repository } from 'typeorm';
import { Task } from '../tasks.entity';
import { Project } from '../../projects/projects.entity';
import { SecurityLoggerService } from '../../common/services/security-logger.service';
import { NotFoundException } from '@nestjs/common';
import { TasksRepository } from '../tasks.repository';
import { ProjectsRepository } from '../../projects/projects.repository';
import { TagsRepository } from '../../tags/tags.repository';
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
      dueDate: '2024-12-31',
      projectId: projectId,
    };

    it('should assign task to specified project when creating task', async () => {
      const mockTask = {
        id: 'test-task-id',
        title: createTaskDto.title,
        description: createTaskDto.description,
        dueDate: createTaskDto.dueDate,
        project: mockProject,
      };

      (mockProjectsRepository.findOne as jest.Mock).mockResolvedValue(
        mockProject,
      );
      (mockTaskRepository.create as jest.Mock).mockReturnValue(mockTask);
      (mockTaskRepository.save as jest.Mock).mockResolvedValue(mockTask);

      const result = await service.createTask(createTaskDto);

      expect(result).toBeDefined();
      expect(result.project).toBeDefined();
      expect(result.project.id).toBe(projectId);
      expect(mockProjectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should throw error when specified project does not exist', async () => {
      (mockProjectsRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockTaskRepository.create as jest.Mock).mockReturnValue({
        id: 'test-task-id',
        ...createTaskDto,
      });

      await expect(service.createTask(createTaskDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockProjectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });
  });
});
