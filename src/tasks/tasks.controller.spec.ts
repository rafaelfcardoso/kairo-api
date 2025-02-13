import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './tasks.controller';
import { TaskService } from './tasks.service';
import { SecurityLoggerService } from '../common/services/security-logger.service';
import { Reflector } from '@nestjs/core';

describe('TaskController', () => {
  let controller: TaskController;

  beforeEach(async () => {
    const mockSecurityLogger = {
      logSecurityEvent: jest.fn(),
      logValidationFailure: jest.fn(),
      logSuspiciousActivity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskService,
          useValue: {
            getTasks: jest.fn(),
            getTaskById: jest.fn(),
            createTask: jest.fn(),
            updateTask: jest.fn(),
            deleteTask: jest.fn(),
          },
        },
        {
          provide: SecurityLoggerService,
          useValue: mockSecurityLogger,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
