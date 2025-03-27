import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from '../../tasks.controller';
import { TaskService } from '../../tasks.service';
import { SecurityLoggerService } from '../../../common/services/security-logger.service';
import { Reflector } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Request } from 'express';
import { ProjectType } from '../../../projects/projects.entity';
import { TaskPriority } from '../../../tasks/tasks.entity';

describe('TaskController', () => {
  let controller: TaskController;
  let taskService: TaskService;
  let mockLogger: any;
  let mockRequest: Request;

  beforeEach(async () => {
    const mockSecurityLogger = {
      logSecurityEvent: jest.fn(),
      logValidationFailure: jest.fn(),
      logSuspiciousActivity: jest.fn(),
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
});
