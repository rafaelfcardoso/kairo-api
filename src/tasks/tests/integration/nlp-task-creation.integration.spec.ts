import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from '../../tasks.controller';
import { TaskService } from '../../tasks.service';
import { TasksRepository } from '../../tasks.repository';
import {
  AiService,
  TaskAnalysisResponse,
} from '../../../common/services/ai.service';
import { ProjectsRepository } from '../../../projects/projects.repository';
import { Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { ProjectType } from '../../../projects/projects.entity';
import { TagsRepository } from '../../../tags/tags.repository';
import { SecurityLoggerService } from '../../../common/services/security-logger.service';
import { RecurringTaskService } from '../../recurring-task.service';
import { TaskDomainService } from '../../tasks.domain.service';
import { TaskFactory } from '../../factories/task.factory';

describe('NLP Task Creation Integration', () => {
  let controller: TaskController;
  let taskService: TaskService;
  let tasksRepository: TasksRepository;
  let aiService: AiService;
  let projectsRepository: ProjectsRepository;
  let mockDataSource: any;
  let mockRequest: Request;

  beforeEach(async () => {
    mockDataSource = {
      createEntityManager: jest.fn(),
      manager: {
        create: jest.fn().mockImplementation((entity, data) => {
          return { ...data };
        }),
        save: jest.fn(),
        findOne: jest.fn(),
        findBy: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockHttpService = {
      post: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'AI_SERVICE_URL') {
          return 'https://test-ai-service.example.com';
        }
        return null;
      }),
    };

    mockRequest = {
      user: {
        id: 'test-user-id',
      },
    } as unknown as Request;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskController,
        TaskService,
        TasksRepository,
        AiService,
        RecurringTaskService,
        TaskDomainService,
        {
          provide: TaskFactory,
          useValue: {
            createTask: jest.fn().mockImplementation((dto) => {
              return {
                title: dto.title,
                description: dto.description,
                status: 'NOT_STARTED',
                priority: dto.priority,
                dueDate: dto.dueDate,
                hasTime: dto.hasTime || false,
                needsReminder: dto.needsReminder || false,
                reminderMessage: dto.reminderMessage,
                recurrenceRule: dto.recurrenceRule,
                isRecurring: dto.isRecurring || false,
              };
            }),
            createStandardTask: jest.fn(),
            createReminderTask: jest.fn(),
            createAggregate: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ProjectsRepository,
          useValue: {
            findOne: jest.fn(),
            getInboxProject: jest.fn(),
          },
        },
        {
          provide: TagsRepository,
          useValue: {
            findByIds: jest.fn(),
          },
        },
        {
          provide: SecurityLoggerService,
          useValue: {
            logSecurityEvent: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    taskService = module.get<TaskService>(TaskService);
    tasksRepository = module.get<TasksRepository>(TasksRepository);
    aiService = module.get<AiService>(AiService);
    projectsRepository = module.get<ProjectsRepository>(ProjectsRepository);
  });

  it('should create a task from natural language and assign it to the inbox project', async () => {
    // Arrange
    const request = {
      command: 'Create a task to review project proposal',
      context: {
        timezone: 'America/New_York',
      },
    };

    const aiResponse: TaskAnalysisResponse = {
      task_id: 'task-id',
      analysis: {
        title: 'Review project proposal',
        description: null,
        due_date: '2023-12-31T23:59:59.999Z',
        priority: 'none',
        project_id: null, // No project detected
        is_past_date: false,
      },
      suggested_priority: 1,
      tokens_used: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    };

    const inboxProject = {
      id: 'inbox-project-id',
      name: 'Inbox',
      description: 'System Inbox',
      isArchived: false,
      isSystem: true,
      type: ProjectType.INBOX,
      parent: null,
      children: [],
      tasks: [],
      color: '#808080',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createdTask = {
      id: 'task-id',
      title: 'Review project proposal',
      project: inboxProject,
    };

    jest
      .spyOn(aiService, 'processNaturalLanguage')
      .mockResolvedValue(aiResponse);
    jest
      .spyOn(projectsRepository, 'findOne')
      .mockResolvedValue(inboxProject as any);
    jest
      .spyOn(taskService, 'getInboxProject')
      .mockResolvedValue(inboxProject as any);
    jest.spyOn(taskService, 'createTask').mockResolvedValue(createdTask as any);

    // Act
    const result = await controller.createTaskFromNaturalLanguage(
      request,
      mockRequest,
    );

    // Assert
    expect(result).toBe(aiResponse);
    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Review project proposal',
        description: null,
        dueDate: '2023-12-31T23:59:59.999Z',
        priority: 'none',
        projectId: 'inbox-project-id',
        needsReminder: false,
      }),
      undefined,
    );
  });

  it('should create a task from natural language with a specified project', async () => {
    // Arrange
    const request = {
      command: 'Create a task to review project proposal for Project X',
      context: {
        timezone: 'America/New_York',
      },
    };

    const projectX = {
      id: 'project-x-id',
      name: 'Project X',
      description: 'Project X Description',
      isArchived: false,
      isSystem: false,
      type: ProjectType.REGULAR,
      parent: null,
      children: [],
      tasks: [],
      color: '#FF0000',
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const aiResponse: TaskAnalysisResponse = {
      task_id: 'task-id',
      analysis: {
        title: 'Review project proposal',
        description: null,
        due_date: '2023-12-31T23:59:59.999Z',
        priority: 'none',
        project_id: 'project-x-id', // Project X detected
        is_past_date: false,
      },
      suggested_priority: 1,
      tokens_used: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    };

    const inboxProject = {
      id: 'inbox-project-id',
      name: 'Inbox',
      description: 'System Inbox',
      isArchived: false,
      isSystem: true,
      type: ProjectType.INBOX,
      parent: null,
      children: [],
      tasks: [],
      color: '#808080',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createdTask = {
      id: 'task-id',
      title: 'Review project proposal',
      project: projectX,
    };

    jest
      .spyOn(aiService, 'processNaturalLanguage')
      .mockResolvedValue(aiResponse);
    jest.spyOn(projectsRepository, 'findOne').mockImplementation((options) => {
      const whereCondition = options.where as any;

      if (whereCondition.id === 'project-x-id') {
        return Promise.resolve(projectX as any);
      } else if (
        whereCondition.isSystem === true &&
        whereCondition.type === ProjectType.INBOX
      ) {
        return Promise.resolve(inboxProject as any);
      }
      return Promise.resolve(null);
    });
    jest
      .spyOn(taskService, 'getInboxProject')
      .mockResolvedValue(inboxProject as any);
    jest.spyOn(taskService, 'createTask').mockResolvedValue(createdTask as any);

    // Act
    const result = await controller.createTaskFromNaturalLanguage(
      request,
      mockRequest,
    );

    // Assert
    expect(result).toBe(aiResponse);
    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Review project proposal',
        description: null,
        dueDate: '2023-12-31T23:59:59.999Z',
        priority: 'none',
        projectId: 'inbox-project-id', // The controller always uses the inbox project ID
        needsReminder: false,
      }),
      undefined,
    );
  });
});
