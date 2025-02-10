import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task, TaskStatus, TaskPriority } from './tasks.entity';
import { Project, ProjectType } from '../projects/projects.entity';
import { TasksRepository } from './tasks.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { TagsRepository } from '../tags/tags.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: Repository<Task>;
  let tasksRepository: TasksRepository;
  let projectsRepository: ProjectsRepository;
  let tagsRepository: TagsRepository;

  const mockInboxProject = {
    id: '569c363f-1934-4e69-b324-6c2fad28bc59',
    name: 'Inbox',
    type: ProjectType.INBOX,
  };

  const mockTaskRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTasksRepository = {
    createTask: jest.fn(),
    updateTask: jest.fn(),
    getTaskById: jest.fn(),
  };

  const mockProjectsRepository = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.type === ProjectType.INBOX) {
        return Promise.resolve(mockInboxProject);
      }
      if (where.id) {
        return Promise.resolve({
          id: where.id,
          name: 'Test Project',
          type: ProjectType.REGULAR,
        });
      }
      return Promise.resolve(null);
    }),
  };

  const mockTagsRepository = {
    findByIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
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
          useValue: mockTagsRepository,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    tasksRepository = module.get<TasksRepository>(TasksRepository);
    projectsRepository = module.get<ProjectsRepository>(ProjectsRepository);
    tagsRepository = module.get<TagsRepository>(TagsRepository);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('validateDueDate', () => {
    it('should accept valid ISO date with UTC timezone', async () => {
      const validDate = '2025-02-14T14:00:00.000Z';
      expect(() => service['validateDueDate'](validDate)).not.toThrow();
    });

    it('should accept valid ISO date with timezone offset', async () => {
      const validDate = '2025-02-14T14:00:00.000+00:00';
      expect(() => service['validateDueDate'](validDate)).not.toThrow();
    });

    it('should reject date without timezone information', async () => {
      const invalidDate = '2025-02-14T14:00:00.000';
      expect(() => service['validateDueDate'](invalidDate)).toThrow(BadRequestException);
      expect(() => service['validateDueDate'](invalidDate)).toThrow('Due date must include timezone information');
    });

    it('should reject invalid date format', async () => {
      const invalidDate = 'not-a-date';
      expect(() => service['validateDueDate'](invalidDate)).toThrow(BadRequestException);
      expect(() => service['validateDueDate'](invalidDate)).toThrow('Invalid due date format');
    });

    it('should reject dates more than 5 years in the future', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 6);
      const invalidDate = futureDate.toISOString();
      
      expect(() => service['validateDueDate'](invalidDate)).toThrow(BadRequestException);
      expect(() => service['validateDueDate'](invalidDate)).toThrow('Due date cannot be more than 5 years in the future');
    });

    it('should accept null due date', async () => {
      expect(() => service['validateDueDate'](null)).not.toThrow();
    });
  });

  describe('createTask', () => {
    it('should create task with valid due date', async () => {
      const validDate = '2025-02-14T14:00:00.000Z';
      const createTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriority.MEDIUM,
        dueDate: validDate,
      };

      mockTaskRepository.create.mockReturnValue({
        ...createTaskDto,
        project: mockInboxProject,
        status: TaskStatus.TODO,
      });

      mockTaskRepository.save.mockResolvedValue({
        id: '123',
        ...createTaskDto,
        project: mockInboxProject,
        status: TaskStatus.TODO,
      });

      const result = await service.createTask(createTaskDto);

      expect(result.dueDate).toBe(validDate);
      expect(result.project).toBeDefined();
      expect(mockTaskRepository.create).toHaveBeenCalled();
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should throw error when creating task with invalid due date', async () => {
      const invalidDate = '2025-02-14'; // Missing timezone
      const createTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriority.MEDIUM,
        dueDate: invalidDate,
      };

      await expect(service.createTask(createTaskDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTask', () => {
    it('should update task with valid due date', async () => {
      const validDate = '2025-02-14T14:00:00.000Z';
      const updateTaskDto = {
        dueDate: validDate,
      };

      mockTasksRepository.getTaskById.mockResolvedValue({
        id: '123',
        title: 'Test Task',
        status: TaskStatus.TODO,
      });

      mockTaskRepository.save.mockResolvedValue({
        id: '123',
        title: 'Test Task',
        status: TaskStatus.TODO,
        dueDate: validDate,
      });

      const result = await service.updateTask('123', updateTaskDto);

      expect(result.dueDate).toBe(validDate);
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should throw error when updating task with invalid due date', async () => {
      const invalidDate = '2025-02-14T14:00:00.000'; // Missing timezone
      const updateTaskDto = {
        dueDate: invalidDate,
      };

      mockTasksRepository.getTaskById.mockResolvedValue({
        id: '123',
        title: 'Test Task',
        status: TaskStatus.TODO,
      });

      await expect(service.updateTask('123', updateTaskDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Project Assignment', () => {
    it('should assign task to specified project when creating task', async () => {
      const projectId = 'test-project-id';
      const mockProject = { 
        id: projectId, 
        name: 'Test Project',
        type: ProjectType.REGULAR,
      };
      
      mockProjectsRepository.findOne.mockResolvedValue(mockProject);
      mockTaskRepository.create.mockReturnValue({
        title: 'Test Task',
        project: mockProject,
      });
      mockTaskRepository.save.mockResolvedValue({
        id: 'test-task-id',
        title: 'Test Task',
        project: mockProject,
      });

      const createTaskDto = {
        title: 'Test Task',
        projectId: projectId,
      };

      const result = await service.createTask(createTaskDto);

      expect(result.project).toBeDefined();
      expect(result.project.id).toBe(projectId);
      expect(mockProjectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should assign task to Inbox project when no project specified during creation', async () => {
      mockProjectsRepository.findOne.mockResolvedValue(mockInboxProject);
      mockTaskRepository.create.mockReturnValue({
        title: 'Test Task',
        project: mockInboxProject,
      });
      mockTaskRepository.save.mockResolvedValue({
        id: 'test-task-id',
        title: 'Test Task',
        project: mockInboxProject,
      });

      const createTaskDto = {
        title: 'Test Task',
      };

      const result = await service.createTask(createTaskDto);

      expect(result.project).toBeDefined();
      expect(result.project.id).toBe(mockInboxProject.id);
      expect(mockProjectsRepository.findOne).toHaveBeenCalledWith({
        where: { type: ProjectType.INBOX },
      });
    });

    it('should assign task to Inbox project when project is explicitly set to null during update', async () => {
      const existingTask = {
        id: 'test-task-id',
        title: 'Test Task',
        project: { 
          id: 'old-project-id', 
          name: 'Old Project',
          type: ProjectType.REGULAR,
        },
      };

      mockTasksRepository.getTaskById.mockResolvedValue(existingTask);
      mockProjectsRepository.findOne.mockResolvedValue(mockInboxProject);
      mockTaskRepository.save.mockResolvedValue({
        ...existingTask,
        project: mockInboxProject,
      });

      const updateTaskDto = {
        projectId: null,
      };

      const result = await service.updateTask('test-task-id', updateTaskDto);

      expect(result.project).toBeDefined();
      expect(result.project.id).toBe(mockInboxProject.id);
      expect(mockProjectsRepository.findOne).toHaveBeenCalledWith({
        where: { type: ProjectType.INBOX },
      });
    });

    it('should throw error when specified project does not exist', async () => {
      const projectId = 'non-existent-project';
      mockProjectsRepository.findOne.mockResolvedValue(null);

      const createTaskDto = {
        title: 'Test Task',
        projectId: projectId,
      };

      await expect(service.createTask(createTaskDto)).rejects.toThrow(NotFoundException);
      expect(mockProjectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should throw error when Inbox project does not exist', async () => {
      mockProjectsRepository.findOne.mockResolvedValue(null);

      const createTaskDto = {
        title: 'Test Task',
      };

      await expect(service.createTask(createTaskDto)).rejects.toThrow('Inbox project not found');
      expect(mockProjectsRepository.findOne).toHaveBeenCalledWith({
        where: { type: ProjectType.INBOX },
      });
    });
  });
});
