import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../../../../src/tasks/tasks.service';
import { TasksRepository } from '../../../../src/tasks/tasks.repository';
import { ProjectsRepository } from '../../../../src/projects/projects.repository';
import { TagsRepository } from '../../../../src/tags/tags.repository';
import { SecurityLoggerService } from '../../../../src/common/services/security-logger.service';
import { RecurringTaskService } from '../../../../src/tasks/recurring-task.service';
import { TaskDomainService } from '../../../../src/tasks/tasks.domain.service';
import { TaskStatus } from '../../../../src/tasks/tasks.entity';
import { CompleteOverdueTasksDto } from '../../../../src/tasks/dto/complete-overdue-tasks.dto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationDomainService } from '../../../../src/tasks/notification.domain.service';

// Create mock versions of the repositories and services
const mockTasksRepository = () => ({
  find: jest.fn(),
  save: jest.fn(),
});

const mockProjectsRepository = () => ({});
const mockTagsRepository = () => ({});
const mockSecurityLoggerService = () => ({});
const mockRecurringTaskService = () => ({});
const mockTaskDomainService = () => ({});
const mockNotificationDomainService = () => ({
  generateNotificationContent: jest.fn(),
  scheduleTaskReminder: jest.fn(),
});

describe('TaskService - completeOverdueTasks', () => {
  let taskService: TaskService;
  let tasksRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(TasksRepository),
          useFactory: mockTasksRepository,
        },
        {
          provide: getRepositoryToken(ProjectsRepository),
          useFactory: mockProjectsRepository,
        },
        {
          provide: getRepositoryToken(TagsRepository),
          useFactory: mockTagsRepository,
        },
        {
          provide: SecurityLoggerService,
          useFactory: mockSecurityLoggerService,
        },
        {
          provide: RecurringTaskService,
          useFactory: mockRecurringTaskService,
        },
        {
          provide: TaskDomainService,
          useFactory: mockTaskDomainService,
        },
        {
          provide: NotificationDomainService,
          useFactory: mockNotificationDomainService,
        },
      ],
    }).compile();

    taskService = module.get<TaskService>(TaskService);
    tasksRepository = module.get(getRepositoryToken(TasksRepository));
  });

  it('should return success with 0 tasks when no overdue tasks found', async () => {
    // Mock repository to return empty array
    tasksRepository.find.mockResolvedValue([]);

    const result = await taskService.completeOverdueTasks('user-id', {
      additionalFilters: {},
      includeBlockedTasks: false,
    });

    expect(result).toEqual([]);

    // Check that repository was called with correct parameters
    expect(tasksRepository.find).toHaveBeenCalledWith({
      where: {
        status: TaskStatus.NOT_STARTED,
        dueDate: expect.any(Object), // LessThan(new Date())
        isArchived: false,
      },
      relations: ['project', 'tags'],
    });
  });

  it('should complete all overdue tasks and return success', async () => {
    // Mock repository to return tasks
    const tasks = [
      {
        id: 'task-1',
        title: 'Test Task 1',
        status: TaskStatus.NOT_STARTED,
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        status: TaskStatus.NOT_STARTED,
      },
    ];

    tasksRepository.find.mockResolvedValue(tasks);
    tasksRepository.save.mockImplementation((task) => Promise.resolve(task));

    const result = await taskService.completeOverdueTasks('user-id', {
      additionalFilters: {},
      includeBlockedTasks: false,
    });

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe(TaskStatus.COMPLETED);
    expect(result[1].status).toBe(TaskStatus.COMPLETED);

    // Check that find was called correctly
    expect(tasksRepository.find).toHaveBeenCalledWith({
      where: {
        status: TaskStatus.NOT_STARTED,
        dueDate: expect.any(Object), // LessThan(new Date())
        isArchived: false,
      },
      relations: ['project', 'tags'],
    });

    // Check that save was called for each task
    expect(tasksRepository.save).toHaveBeenCalledTimes(2);
  });

  it('should include blocked tasks when includeBlockedTasks is true', async () => {
    // Mock repository to return tasks
    const tasks = [
      {
        id: 'task-1',
        title: 'Test Task 1',
        status: TaskStatus.NOT_STARTED,
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        status: TaskStatus.BLOCKED,
      },
    ];

    tasksRepository.find.mockResolvedValue(tasks);
    tasksRepository.save.mockImplementation((task) => Promise.resolve(task));

    const result = await taskService.completeOverdueTasks('user-id', {
      additionalFilters: {},
      includeBlockedTasks: true,
    });

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe(TaskStatus.COMPLETED);
    expect(result[1].status).toBe(TaskStatus.COMPLETED);

    // Check that repository was called with correct parameters
    expect(tasksRepository.find).toHaveBeenCalledWith({
      where: {
        status: expect.any(Object), // In([TaskStatus.NOT_STARTED, TaskStatus.BLOCKED])
        dueDate: expect.any(Object), // LessThan(new Date())
        isArchived: false,
      },
      relations: ['project', 'tags'],
    });

    // Check that save was called for each task
    expect(tasksRepository.save).toHaveBeenCalledTimes(2);
  });
});
