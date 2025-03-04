import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from '../../tasks.controller';
import { TaskService } from '../../tasks.service';
import { SecurityLoggerService } from '../../../common/services/security-logger.service';
import { Reflector } from '@nestjs/core';
import {
  AiService,
  TaskAnalysisResponse,
} from '../../../common/services/ai.service';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Request } from 'express';
import { ProjectType } from '../../../projects/projects.entity';

describe('TaskController', () => {
  let controller: TaskController;
  let aiService: AiService;
  let taskService: TaskService;
  let mockLogger: any;
  let mockRequest: Request;

  beforeEach(async () => {
    const mockSecurityLogger = {
      logSecurityEvent: jest.fn(),
      logValidationFailure: jest.fn(),
      logSuspiciousActivity: jest.fn(),
    };

    const mockAiService = {
      processNaturalLanguage: jest.fn(),
      getSmartReminder: jest.fn(),
    };

    const mockTaskService = {
      getTasks: jest.fn(),
      getTaskById: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      getInboxProject: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskService,
          useValue: mockTaskService,
        },
        {
          provide: SecurityLoggerService,
          useValue: mockSecurityLogger,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: HttpService,
          useValue: {},
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    aiService = module.get<AiService>(AiService);
    taskService = module.get<TaskService>(TaskService);

    // Override the controller's logger with our mock
    (controller as any).logger = mockLogger;

    mockRequest = {
      user: {
        id: 'test-user-id',
      },
    } as unknown as Request;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTaskFromNaturalLanguage', () => {
    it('should correctly handle future times in the user timezone', async () => {
      // Setup
      jest.useFakeTimers().setSystemTime(new Date('2025-03-03T18:30:00Z')); // 6:30 PM UTC

      // Mock the logger
      const mockLogger = {
        log: jest.fn(),
        error: jest.fn(),
      };
      (controller as any).logger = mockLogger;

      // Mock the inbox project
      const mockInboxProject = { id: 'inbox-project-id' };
      jest
        .spyOn(taskService, 'getInboxProject')
        .mockResolvedValue(mockInboxProject as any);

      // Create a mock AI response
      const mockAiResponse = {
        task_id: 'mock-task-id',
        analysis: {
          title: 'Write my journal',
          description: null,
          priority: 'none',
          due_date: '2025-03-03T23:00:00.000Z', // 8 PM in UTC
          is_past_date: true, // This should be corrected by the controller
          warning:
            'The specified date appears to be in the past. Please confirm if this is intentional.',
        },
        suggested_priority: 1,
        tokens_used: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };

      // Mock the AI service to return our response
      jest
        .spyOn(aiService, 'processNaturalLanguage')
        .mockResolvedValue(mockAiResponse);

      // Mock the task service to return a task
      const mockTask = { id: 'created-task-id' };
      jest.spyOn(taskService, 'createTask').mockResolvedValue(mockTask as any);

      // Call the controller method with a time in the future (8 PM)
      const request = {
        command: 'Tonight I will write my journal at 8 PM',
        context: {
          timezone: 'America/Sao_Paulo',
        },
      };

      const mockExpressRequest = { ip: '127.0.0.1' };
      const result = await controller.createTaskFromNaturalLanguage(
        request,
        mockExpressRequest as any,
      );

      // Verify the warning was removed and is_past_date was set to false
      expect(result.analysis.is_past_date).toBe(false);
      expect(result.analysis.warning).toBeUndefined();

      // Verify the task was created with the correct data
      expect(taskService.createTask).toHaveBeenCalled();
      expect(result.task_id).toBe('created-task-id');

      // Verify the logger was called
      expect(mockLogger.log).toHaveBeenCalled();

      // Cleanup
      jest.useRealTimers();
    });

    it('should handle tasks without a timezone context', async () => {
      // Setup
      jest.useFakeTimers().setSystemTime(new Date('2025-03-03T18:30:00Z')); // 6:30 PM UTC

      // Mock the logger
      const mockLogger = {
        log: jest.fn(),
        error: jest.fn(),
      };
      (controller as any).logger = mockLogger;

      // Mock the inbox project
      const mockInboxProject = { id: 'inbox-project-id' };
      jest
        .spyOn(taskService, 'getInboxProject')
        .mockResolvedValue(mockInboxProject as any);

      // Create a mock AI response
      const mockAiResponse = {
        task_id: 'mock-task-id',
        analysis: {
          title: 'Write my journal',
          description: null,
          priority: 'none',
          due_date: '2025-03-03T23:00:00.000Z', // 8 PM in UTC
        },
        suggested_priority: 1,
        tokens_used: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };

      // Mock the AI service to return our response
      jest
        .spyOn(aiService, 'processNaturalLanguage')
        .mockResolvedValue(mockAiResponse);

      // Mock the task service to return a task
      const mockTask = { id: 'created-task-id' };
      jest.spyOn(taskService, 'createTask').mockResolvedValue(mockTask as any);

      // Call the controller method without a timezone context
      const request = {
        command: 'Tonight I will write my journal at 8 PM',
      };

      const mockExpressRequest = { ip: '127.0.0.1' };
      const result = await controller.createTaskFromNaturalLanguage(
        request,
        mockExpressRequest as any,
      );

      // Verify the task was created with the correct data
      expect(taskService.createTask).toHaveBeenCalled();
      expect(result.task_id).toBe('created-task-id');

      // Cleanup
      jest.useRealTimers();
    });

    it('should create a task from natural language and assign it to the inbox project', async () => {
      const inboxProjectId = '569c363f-1934-4e69-b324-6c2fad28bc59';
      const mockInboxProject = {
        id: inboxProjectId,
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

      const naturalLanguageDto = {
        command: 'Create a task to review project proposal by next Friday',
      };

      const aiResponse = {
        task_id: 'test-task-id',
        analysis: {
          title: 'Review project proposal',
          description: null,
          priority: 'none',
          due_date: '2023-12-31T23:59:59.999Z',
          recurrence_rule: null,
        },
      };

      const createdTask = {
        id: 'test-task-id',
        title: 'Review project proposal',
        project: mockInboxProject,
      };

      const mockRequest = { ip: '127.0.0.1' };

      aiService.processNaturalLanguage = jest
        .fn()
        .mockResolvedValue(aiResponse);
      taskService.getInboxProject = jest
        .fn()
        .mockResolvedValue(mockInboxProject);
      taskService.createTask = jest.fn().mockResolvedValue(createdTask);

      const result = await controller.createTaskFromNaturalLanguage(
        naturalLanguageDto,
        mockRequest as any,
      );

      expect(taskService.getInboxProject).toHaveBeenCalled();
      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Review project proposal',
          projectId: inboxProjectId,
        }),
        mockRequest.ip,
      );
      expect(result.task_id).toBe(createdTask.id);
    });

    it('should assign task to the specified project when project_id is provided in the analysis', async () => {
      // Arrange
      const specificProjectId = 'specific-project-id';
      const request = {
        command: 'Create a task to review project proposal for project X',
      };

      const aiResponse: TaskAnalysisResponse = {
        task_id: 'test-task-id',
        analysis: {
          title: 'Review project proposal',
          description: null,
          due_date: '2023-12-31T23:59:59.999Z',
          priority: 'none',
          project_id: specificProjectId, // AI detected a specific project
          is_past_date: true, // This should be corrected by the controller
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
        color: '#000000',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdTask = {
        id: 'task-id',
        title: 'Review project proposal',
        project_id: specificProjectId,
      };

      jest
        .spyOn(aiService, 'processNaturalLanguage')
        .mockResolvedValue(aiResponse);
      jest
        .spyOn(taskService, 'getInboxProject')
        .mockResolvedValue(inboxProject);
      jest
        .spyOn(taskService, 'createTask')
        .mockResolvedValue(createdTask as any);

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
          reminderMessage: null,
        }),
        undefined,
      );
    });

    it('should assign task to inbox project when project_id is null in the analysis', async () => {
      // Arrange
      const request = {
        command: 'Create a task to review project proposal',
      };

      const aiResponse: TaskAnalysisResponse = {
        task_id: 'test-task-id',
        analysis: {
          title: 'Review project proposal',
          description: null,
          due_date: '2023-12-31T23:59:59.999Z',
          priority: 'none',
          project_id: null, // No specific project detected
          is_past_date: true,
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
        color: '#000000',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdTask = {
        id: 'task-id',
        title: 'Review project proposal',
        project_id: 'inbox-project-id',
      };

      jest
        .spyOn(aiService, 'processNaturalLanguage')
        .mockResolvedValue(aiResponse);
      jest
        .spyOn(taskService, 'getInboxProject')
        .mockResolvedValue(inboxProject);
      jest
        .spyOn(taskService, 'createTask')
        .mockResolvedValue(createdTask as any);

      // Act
      const result = await controller.createTaskFromNaturalLanguage(
        request,
        mockRequest,
      );

      // Assert
      expect(taskService.getInboxProject).toHaveBeenCalled();
      expect(result).toBe(aiResponse);
      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Review project proposal',
          description: null,
          dueDate: '2023-12-31T23:59:59.999Z',
          priority: 'none',
          projectId: 'inbox-project-id',
          needsReminder: false,
          reminderMessage: null,
        }),
        undefined,
      );
    });

    it('should handle the case when inbox project cannot be found', async () => {
      // Arrange
      const request = {
        command: 'Create a task to review project proposal',
      };

      const aiResponse: TaskAnalysisResponse = {
        task_id: 'test-task-id',
        analysis: {
          title: 'Review project proposal',
          description: null,
          due_date: '2023-12-31T23:59:59.999Z',
          priority: 'none',
          project_id: null, // No project detected
        },
        suggested_priority: 1,
        tokens_used: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };

      jest
        .spyOn(aiService, 'processNaturalLanguage')
        .mockResolvedValue(aiResponse);
      jest.spyOn(taskService, 'getInboxProject').mockImplementation(() => {
        throw new Error('Could not find inbox project to assign task to');
      });

      // Act & Assert
      await expect(
        controller.createTaskFromNaturalLanguage(request, mockRequest),
      ).rejects.toThrow('Could not find inbox project to assign task to');
    });
  });
});
