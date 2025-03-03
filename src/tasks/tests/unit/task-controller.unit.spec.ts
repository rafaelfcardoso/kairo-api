import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from '../../tasks.controller';
import { TaskService } from '../../tasks.service';
import { SecurityLoggerService } from '../../../common/services/security-logger.service';
import { Reflector } from '@nestjs/core';
import { AiService } from '../../../common/services/ai.service';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';

describe('TaskController', () => {
  let controller: TaskController;
  let aiService: AiService;
  let taskService: TaskService;
  let mockLogger: any;

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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTaskFromNaturalLanguage', () => {
    it('should correctly handle future times in the user timezone', async () => {
      // Setup
      jest.useFakeTimers().setSystemTime(new Date('2025-03-03T18:30:00Z')); // 6:30 PM UTC

      // Mock AI service response with a past date warning
      const mockAiResponse = {
        task_id: 'mock-task-id',
        analysis: {
          title: 'Write my journal',
          description: '',
          due_date: '2025-03-03T20:00:00Z', // 8:00 PM UTC
          priority: 'none',
          has_time: true,
          is_past_date: true, // AI incorrectly thinks it's in the past
          warning: 'The due date is in the past',
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

      // Mock AI service response with a past date warning
      const mockAiResponse = {
        task_id: 'mock-task-id',
        analysis: {
          title: 'Write my journal',
          description: '',
          due_date: '2025-03-03T20:00:00Z', // 8:00 PM UTC
          priority: 'none',
          has_time: true,
          is_past_date: true, // AI incorrectly thinks it's in the past
          warning: 'The due date is in the past',
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
        // No context with timezone
      };

      const mockExpressRequest = { ip: '127.0.0.1' };
      const result = await controller.createTaskFromNaturalLanguage(
        request,
        mockExpressRequest as any,
      );

      // Verify the warning and is_past_date were not modified (no timezone to check against)
      expect(result.analysis.is_past_date).toBe(true);
      expect(result.analysis.warning).toBe('The due date is in the past');

      // Verify the task was created with the correct data
      expect(taskService.createTask).toHaveBeenCalled();
      expect(result.task_id).toBe('created-task-id');

      // Cleanup
      jest.useRealTimers();
    });
  });
});
