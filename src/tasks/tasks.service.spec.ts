import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task, TaskStatus, TaskPriority } from './tasks.entity';
import { TasksRepository } from './tasks.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { TagsRepository } from '../tags/tags.repository';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: Repository<Task>;
  let tasksRepository: TasksRepository;
  let projectsRepository: ProjectsRepository;
  let tagsRepository: TagsRepository;

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
    findOne: jest.fn(),
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
        status: TaskStatus.TODO,
      });

      mockTaskRepository.save.mockResolvedValue({
        id: '123',
        ...createTaskDto,
        status: TaskStatus.TODO,
      });

      const result = await service.createTask(createTaskDto);

      expect(result.dueDate).toBe(validDate);
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
});
