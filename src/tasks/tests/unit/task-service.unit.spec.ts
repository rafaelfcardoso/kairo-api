import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../../tasks.service';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '../../tasks.entity';
import { Project, ProjectType } from '../../../projects/projects.entity';
import { TasksRepository } from '../../tasks.repository';
import { ProjectsRepository } from '../../../projects/projects.repository';
import { TagsRepository } from '../../../tags/tags.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SecurityLoggerService } from '../../../common/services/security-logger.service';
import { RecurringTaskService } from '../../recurring-task.service';
import { TaskDomainService } from '../../tasks.domain.service';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: Repository<Task>;
  let tasksRepository: TasksRepository;
  let projectsRepository: ProjectsRepository;
  let tagsRepository: TagsRepository;
  let mockTasksRepository: Partial<TasksRepository>;
  let mockProjectsRepository: Partial<ProjectsRepository>;
  let mockTagsRepository: Partial<TagsRepository>;
  let mockTaskRepository: Partial<Repository<Task>>;
  let mockSecurityLogger: Partial<SecurityLoggerService>;
  let mockRecurringTaskService: Partial<RecurringTaskService>;
  let mockTaskDomainService: Partial<TaskDomainService>;

  const mockInboxProject = {
    id: '569c363f-1934-4e69-b324-6c2fad28bc59',
    name: 'Caixa de entrada',
    description: 'Tarefas não atribuídas a projetos',
    type: ProjectType.INBOX,
    isSystem: true,
    isArchived: false,
    color: '#808080',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Project;

  const mockTask = {
    id: 'test-task-id',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.NOT_STARTED,
    priority: TaskPriority.NONE,
    project: mockInboxProject,
    isArchived: false,
    hasTime: false,
    estimatedMinutes: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Task;

  beforeEach(async () => {
    mockTasksRepository = {
      getTasks: jest.fn(),
      getTaskById: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      archiveTask: jest.fn(),
      getTodayTasks: jest.fn(),
      getOverdueTasks: jest.fn(),
      getUpcomingTasks: jest.fn(),
      assignToProject: jest.fn(),
      addTags: jest.fn(),
      save: jest.fn(),
      addFocusSession: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
    };

    mockProjectsRepository = {
      findOne: jest.fn(),
      findByIds: jest.fn(),
    };

    mockTagsRepository = {
      findByIds: jest.fn(),
    };

    mockTaskRepository = {
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
    };

    mockSecurityLogger = {
      logSecurityEvent: jest.fn(),
      logValidationFailure: jest.fn(),
      logSuspiciousActivity: jest.fn(),
    };

    mockRecurringTaskService = {
      processCompletedTask: jest.fn(),
      scheduleNextRecurrence: jest.fn(),
      calculateNextOccurrence: jest.fn(),
    };

    mockTaskDomainService = {
      calculateNextOccurrence: jest.fn(),
      isTaskDue: jest.fn(),
      getTasksNeedingReminders: jest.fn(),
      completeTask: jest.fn().mockReturnValue({
        updatedTask: {
          id: 'test-task-id',
          title: 'Test Task',
          status: 'completed',
        },
        nextTask: null,
      }),
      determineNotificationType: jest.fn(),
      canCompleteTask: jest.fn().mockReturnValue(true),
    };

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
          useValue: mockTagsRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: SecurityLoggerService,
          useValue: mockSecurityLogger,
        },
        {
          provide: RecurringTaskService,
          useValue: mockRecurringTaskService,
        },
        {
          provide: TaskDomainService,
          useValue: mockTaskDomainService,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    tasksRepository = module.get<TasksRepository>(TasksRepository);
    projectsRepository = module.get<ProjectsRepository>(ProjectsRepository);
    tagsRepository = module.get<TagsRepository>(TagsRepository);
    mockTasksRepository = module.get<TasksRepository>(TasksRepository);
    mockProjectsRepository = module.get<ProjectsRepository>(ProjectsRepository);
    mockTagsRepository = module.get<TagsRepository>(TagsRepository);
    mockTaskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Date Validation', () => {
    it('should accept valid future date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const validDate = tomorrow.toISOString().split('T')[0];
      expect(() => service['validateDate'](validDate)).not.toThrow();
    });

    it('should accept valid future date with time', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const validDate = tomorrow.toISOString();
      expect(() => service['validateDate'](validDate)).not.toThrow();
    });

    it('should reject past date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDate = yesterday.toISOString().split('T')[0];
      expect(() => service['validateDate'](pastDate)).toThrow(
        'Due date cannot be in the past',
      );
    });

    it('should reject past date with time', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDate = yesterday.toISOString();
      expect(() => service['validateDate'](pastDate)).toThrow(
        'Due date cannot be in the past',
      );
    });

    it('should accept today date', async () => {
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];
      expect(() => service['validateDate'](todayDate)).not.toThrow();
    });

    it('should accept null date', async () => {
      expect(() => service['validateDate'](null)).not.toThrow();
    });

    it('should reject invalid date format', async () => {
      const invalidDate = 'not-a-date';
      expect(() => service['validateDate'](invalidDate)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('Task Creation', () => {
    it('should create task with valid due date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const validDate = tomorrow.toISOString().split('T')[0];
      const createTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriority.MEDIUM,
        dueDate: validDate,
      };

      (mockTasksRepository.createTask as jest.Mock).mockResolvedValue({
        id: '123',
        ...createTaskDto,
        dueDate: validDate,
        project: mockInboxProject,
        status: TaskStatus.NOT_STARTED,
      });

      const result = await service.createTask(createTaskDto);
      expect(result.dueDate).toBe(validDate);
      expect(result.project).toBeDefined();
    });

    it('should throw error when creating task with invalid due date', async () => {
      const invalidDate = 'not-a-date';
      const createTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriority.MEDIUM,
        dueDate: invalidDate,
      };

      await expect(service.createTask(createTaskDto)).rejects.toThrow(
        BadRequestException,
      );
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

      const createTaskDto = {
        title: 'Test Task',
        projectId: projectId,
      };

      const mockTask = {
        id: 'test-task-id',
        ...createTaskDto,
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

      expect(result.project).toBeDefined();
      expect(result.project.id).toBe(projectId);
      expect(mockTasksRepository.createTask).toHaveBeenCalledWith(
        createTaskDto,
      );
    });

    it('should throw error when specified project does not exist', async () => {
      const projectId = 'non-existent-project';
      const createTaskDto = {
        title: 'Test Task',
        projectId: projectId,
      };

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

  describe('Task Updates', () => {
    it('should update task with new status', async () => {
      const taskId = 'test-task-id';
      const updateTaskDto = {
        status: TaskStatus.COMPLETED,
      };

      const mockTask = {
        id: taskId,
        title: 'Test Task',
        status: TaskStatus.NOT_STARTED,
        isRecurring: false,
      };

      const updatedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
      };

      (mockTasksRepository.getTaskById as jest.Mock).mockResolvedValue(
        mockTask,
      );
      (mockTasksRepository.save as jest.Mock).mockResolvedValue(updatedTask);
      (mockTaskDomainService.completeTask as jest.Mock).mockReturnValue({
        updatedTask: updatedTask,
        nextTask: null,
      });
      (mockTasksRepository.getTaskById as jest.Mock)
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(updatedTask);

      const result = await service.updateTask(taskId, updateTaskDto);

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(mockTaskDomainService.completeTask).toHaveBeenCalledWith(mockTask);
      expect(mockTasksRepository.save).toHaveBeenCalled();
    });

    it('should update task with new priority', async () => {
      const taskId = 'test-task-id';
      const updateTaskDto = {
        priority: TaskPriority.HIGH,
      };

      const mockTask = {
        id: taskId,
        title: 'Test Task',
        priority: TaskPriority.NONE,
      };

      const updatedTask = {
        ...mockTask,
        priority: TaskPriority.HIGH,
      };

      (mockTasksRepository.getTaskById as jest.Mock).mockResolvedValue(
        mockTask,
      );
      (mockTasksRepository.updateTask as jest.Mock).mockResolvedValue(
        updatedTask,
      );

      const result = await service.updateTask(taskId, updateTaskDto);

      expect(result.priority).toBe(TaskPriority.HIGH);
      expect(mockTasksRepository.updateTask).toHaveBeenCalledWith(
        taskId,
        updateTaskDto,
      );
    });
  });
});
