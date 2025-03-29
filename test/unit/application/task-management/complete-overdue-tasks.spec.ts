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

    const userId = 'user-123';
    const options: CompleteOverdueTasksDto = {};

    const result = await taskService.completeOverdueTasks(userId, options);

    // Check that repository was called with correct parameters
    expect(tasksRepository.find).toHaveBeenCalledWith({
      where: {
        status: TaskStatus.NOT_STARTED,
        dueDate: expect.any(Object), // LessThan(new Date())
        isArchived: false,
      },
    });

    // Check response
    expect(result).toEqual({
      success: true,
      tasksCompleted: 0,
      message: 'No overdue tasks found to complete.',
    });

    // Verify save was not called
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('should complete all overdue tasks and return success', async () => {
    // Create mock tasks
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const mockTasks = [
      {
        id: 'task-1',
        status: TaskStatus.NOT_STARTED,
        dueDate: yesterday,
        title: 'Overdue Task 1',
      },
      {
        id: 'task-2',
        status: TaskStatus.NOT_STARTED,
        dueDate: yesterday,
        title: 'Overdue Task 2',
      },
    ];

    // Mock repository responses
    tasksRepository.find.mockResolvedValue(mockTasks);
    tasksRepository.save.mockResolvedValue(undefined);

    const userId = 'user-123';
    const options: CompleteOverdueTasksDto = {};

    const result = await taskService.completeOverdueTasks(userId, options);

    // Check that find was called correctly
    expect(tasksRepository.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: TaskStatus.NOT_STARTED,
      }),
    });

    // Check that save was called with updated tasks
    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'task-1',
          status: TaskStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
        expect.objectContaining({
          id: 'task-2',
          status: TaskStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      ]),
    );

    // Check response
    expect(result).toEqual({
      success: true,
      tasksCompleted: 2,
      message: 'Successfully completed 2 overdue tasks.',
      completedTaskIds: ['task-1', 'task-2'],
    });
  });

  it('should include blocked tasks when includeBlockedTasks is true', async () => {
    // Mock repository to return empty array (we just want to check the query)
    tasksRepository.find.mockResolvedValue([]);

    const userId = 'user-123';
    const options: CompleteOverdueTasksDto = {
      includeBlockedTasks: true,
    };

    await taskService.completeOverdueTasks(userId, options);

    // Check that repository was called with correct parameters
    expect(tasksRepository.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: expect.any(Object), // In([TaskStatus.NOT_STARTED, TaskStatus.BLOCKED])
        dueDate: expect.any(Object), // LessThan(new Date())
        isArchived: false,
      }),
    });
  });
});
