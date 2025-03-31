import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from '../../../../src/tasks/tasks.controller';
import { TaskService } from '../../../../src/tasks/tasks.service';
import { SecurityLoggerService } from '../../../../src/common/services/security-logger.service';
import { Reflector } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import { Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { ProjectType } from '../../../../src/projects/projects.entity';
import {
  Task,
  TaskPriority,
  TaskStatus,
  RecurrenceTimeOfDay,
} from '../../../../src/tasks/tasks.entity';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilterDto,
} from '../../../../src/tasks/tasks.dto';
import {
  CompleteOverdueTasksDto,
  CompleteOverdueTasksResponseDto,
  BatchCompleteTasksDto,
  BatchCompleteTasksResponseDto,
} from '../../../../src/tasks/dto/complete-overdue-tasks.dto';

describe('TaskController', () => {
  let controller: TaskController;
  let taskService: jest.Mocked<TaskService>;
  let mockLogger: any;
  let mockRequest: Request;

  // Mock task data
  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'This is a test task',
    status: TaskStatus.NOT_STARTED,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date('2025-01-01'),
    isArchived: false,
    isRecurring: false,
    recurrenceRule: null,
    recurrencePattern: null,
    recurrenceDays: null,
    nextDueDate: null,
    reminderMessage: null,
    needsReminder: false,
    hasTime: false,
    recurringParentId: null,
    project: null,
    tags: [],
    focusSessions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    recurrenceTimeOfDay: null,
    recurrenceTime: null,
    estimatedMinutes: 0,
    completedAt: null,
    get isCompleted() {
      return this.status === TaskStatus.COMPLETED;
    },
  };

  // Mock duplicated task
  const mockDuplicatedTask: Task = {
    ...mockTask,
    id: 'duplicated-task-id',
    title: 'Test Task (Copy)',
    get isCompleted() {
      return this.status === TaskStatus.COMPLETED;
    },
  };

  // Task stats
  const mockTaskStats = {
    total: 5,
    completed: 2,
    notStarted: 2,
    inProgress: 1,
    overdue: 1,
  };

  // Tasks by priority
  const mockTasksByPriority = {
    [TaskPriority.HIGH]: [],
    [TaskPriority.MEDIUM]: [],
    [TaskPriority.LOW]: [],
    [TaskPriority.NONE]: [],
  };

  // Orphaned tasks result
  const mockOrphanedTasksResult = {
    tasksAssigned: 3,
    inboxProjectId: 'inbox-project-id',
    summary: 'Found and fixed 3 tasks',
    tasks: [mockTask, mockTask, mockTask],
  };

  beforeEach(async () => {
    const mockSecurityLogger = {
      logSecurityEvent: jest.fn(),
      logValidationFailure: jest.fn(),
      logSuspiciousActivity: jest.fn(),
    };

    const mockTaskService = {
      getTasks: jest.fn().mockResolvedValue([mockTask]),
      getTaskById: jest.fn().mockResolvedValue(mockTask),
      createTask: jest.fn().mockResolvedValue(mockTask),
      updateTask: jest.fn().mockResolvedValue(mockTask),
      deleteTask: jest.fn(),
      completeOverdueTasks: jest
        .fn()
        .mockImplementation(() => Promise.resolve([])),
      batchCompleteTasks: jest
        .fn()
        .mockImplementation(() => Promise.resolve([])),
      assignToProject: jest.fn(),
      addTags: jest.fn().mockResolvedValue({
        ...mockTask,
        tags: [{ id: 'tag-1', name: 'Tag 1' }],
      }),
      removeTags: jest.fn().mockResolvedValue({ ...mockTask, tags: [] }),
      archiveTask: jest
        .fn()
        .mockResolvedValue({ ...mockTask, isArchived: true }),
      getTaskStats: jest.fn().mockResolvedValue(mockTaskStats),
      getTasksByPriority: jest.fn().mockResolvedValue(mockTasksByPriority),
      assignOrphanedTasksToInbox: jest
        .fn()
        .mockResolvedValue(mockOrphanedTasksResult),
      getTodayTasks: jest.fn().mockResolvedValue([mockTask]),
      getOverdueTasks: jest.fn().mockResolvedValue([mockTask]),
      getUpcomingTasks: jest.fn().mockResolvedValue([mockTask]),
      duplicateTask: jest.fn().mockResolvedValue(mockDuplicatedTask),
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
    taskService = module.get<jest.Mocked<TaskService>>(TaskService);

    // Override the controller's logger with our mock
    (controller as any).logger = mockLogger;

    // Setup mock request with user and IP
    mockRequest = {
      user: { id: 'test-user-id' },
      ip: '127.0.0.1',
    } as unknown as Request;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTasks', () => {
    it('should return all tasks', async () => {
      const filterDto = new TaskFilterDto();

      const result = await controller.getTasks(filterDto);

      expect(result).toEqual([mockTask]);
      expect(taskService.getTasks).toHaveBeenCalledWith(filterDto);
    });

    it('should apply filters when provided', async () => {
      const filterDto = new TaskFilterDto();
      filterDto.status = TaskStatus.NOT_STARTED;
      filterDto.priority = TaskPriority.HIGH;

      await controller.getTasks(filterDto);

      expect(taskService.getTasks).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('getTaskById', () => {
    it('should return a task by id', async () => {
      const result = await controller.getTaskById('task-123');

      expect(result).toEqual(mockTask);
      expect(taskService.getTaskById).toHaveBeenCalledWith('task-123');
    });

    it('should throw NotFoundException when task is not found', async () => {
      jest
        .spyOn(taskService, 'getTaskById')
        .mockRejectedValueOnce(new NotFoundException());

      await expect(controller.getTaskById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTask', () => {
    it('should create a task', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New task description',
        priority: TaskPriority.MEDIUM,
      };

      const result = await controller.createTask(createTaskDto, mockRequest);

      expect(result).toEqual(mockTask);
      expect(taskService.createTask).toHaveBeenCalledWith(
        createTaskDto,
        mockRequest.ip,
      );
    });

    it('should handle validation errors', async () => {
      const invalidDto = {} as CreateTaskDto;
      jest
        .spyOn(taskService, 'createTask')
        .mockRejectedValueOnce(new BadRequestException());

      await expect(
        controller.createTask(invalidDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTask', () => {
    it('should update a task', async () => {
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        description: 'Updated description',
      };

      const result = await controller.updateTask(
        'task-123',
        updateTaskDto,
        mockRequest,
      );

      expect(result).toEqual(mockTask);
      expect(taskService.updateTask).toHaveBeenCalledWith(
        'task-123',
        updateTaskDto,
        mockRequest.ip,
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const updateTaskDto: UpdateTaskDto = { title: 'Updated Task' };
      jest
        .spyOn(taskService, 'updateTask')
        .mockRejectedValueOnce(new NotFoundException());

      await expect(
        controller.updateTask('non-existent', updateTaskDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      await controller.deleteTask('task-123');

      expect(taskService.deleteTask).toHaveBeenCalledWith('task-123');
    });

    it('should throw NotFoundException when task does not exist', async () => {
      jest
        .spyOn(taskService, 'deleteTask')
        .mockRejectedValueOnce(new NotFoundException());

      await expect(controller.deleteTask('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archiveTask', () => {
    it('should archive a task', async () => {
      const result = await controller.archiveTask('task-123');

      expect(result.isArchived).toBe(true);
      expect(taskService.archiveTask).toHaveBeenCalledWith('task-123');
    });

    it('should throw NotFoundException when task does not exist', async () => {
      jest
        .spyOn(taskService, 'archiveTask')
        .mockRejectedValueOnce(new NotFoundException());

      await expect(controller.archiveTask('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addTags', () => {
    it('should add tags to a task', async () => {
      const tagIds = ['tag-1', 'tag-2'];

      const result = await controller.addTags('task-123', tagIds);

      expect(result.tags).toHaveLength(1);
      expect(taskService.addTags).toHaveBeenCalledWith('task-123', tagIds);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      jest
        .spyOn(taskService, 'addTags')
        .mockRejectedValueOnce(new NotFoundException());

      await expect(
        controller.addTags('non-existent', ['tag-1']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeTags', () => {
    it('should remove tags from a task', async () => {
      const tagIds = ['tag-1', 'tag-2'];

      const result = await controller.removeTags('task-123', tagIds);

      expect(result.tags).toEqual([]);
      expect(taskService.removeTags).toHaveBeenCalledWith('task-123', tagIds);
    });
  });

  describe('getTodayTasks', () => {
    it('should return tasks due today', async () => {
      const result = await controller.getTodayTasks();

      expect(result).toEqual([mockTask]);
      expect(taskService.getTodayTasks).toHaveBeenCalled();
    });
  });

  describe('getOverdueTasks', () => {
    it('should return overdue tasks', async () => {
      const result = await controller.getOverdueTasks();

      expect(result).toEqual([mockTask]);
      expect(taskService.getOverdueTasks).toHaveBeenCalled();
    });
  });

  describe('getUpcomingTasks', () => {
    it('should return upcoming tasks with default days', async () => {
      const result = await controller.getUpcomingTasks(undefined);

      expect(result).toEqual([mockTask]);
      expect(taskService.getUpcomingTasks).toHaveBeenCalledWith(undefined);
    });

    it('should return upcoming tasks with specified days', async () => {
      const result = await controller.getUpcomingTasks(5);

      expect(result).toEqual([mockTask]);
      expect(taskService.getUpcomingTasks).toHaveBeenCalledWith(5);
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      const expectedStats = {
        total: 5,
        completed: 2,
        notStarted: 2,
        inProgress: 1,
        overdue: 1,
      };

      const result = await controller.getTaskStats();

      expect(result).toEqual(expectedStats);
      expect(taskService.getTaskStats).toHaveBeenCalled();
    });
  });

  describe('getTasksByPriority', () => {
    it('should return tasks grouped by priority', async () => {
      const expectedStats = {
        [TaskPriority.HIGH]: 0,
        [TaskPriority.MEDIUM]: 0,
        [TaskPriority.LOW]: 0,
        [TaskPriority.NONE]: 0,
      };

      const result = await controller.getTasksByPriority();

      expect(result).toEqual(expectedStats);
      expect(taskService.getTasksByPriority).toHaveBeenCalled();
    });
  });

  describe('duplicateTask', () => {
    it('should duplicate a task', async () => {
      const result = await controller.duplicateTask('task-123');

      expect(result.id).toBe('duplicated-task-id');
      expect(taskService.duplicateTask).toHaveBeenCalledWith('task-123');
    });

    it('should throw NotFoundException when task does not exist', async () => {
      jest
        .spyOn(taskService, 'duplicateTask')
        .mockRejectedValueOnce(new NotFoundException());

      await expect(controller.duplicateTask('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignOrphanedTasksToInbox', () => {
    it('should assign orphaned tasks to inbox', async () => {
      const expectedResult = {
        tasksAssigned: 3,
        inboxProjectId: 'inbox-project-id',
        summary: 'Found and fixed 3 tasks',
        tasks: [mockTask, mockTask, mockTask],
      };

      const result = await controller.assignOrphanedTasksToInbox();

      expect(result).toEqual(expectedResult);
      expect(taskService.assignOrphanedTasksToInbox).toHaveBeenCalled();
    });
  });

  describe('getRecurringTasks', () => {
    it('should return recurring tasks', async () => {
      // Reset the mock to verify proper arguments
      jest.spyOn(taskService, 'getTasks').mockClear();

      const result = await controller.getRecurringTasks();

      expect(result).toEqual([mockTask]);
      expect(taskService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          isRecurring: true,
        }),
      );
    });
  });

  describe('completeOverdueTasks', () => {
    it('should complete overdue tasks', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description 1',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.COMPLETED,
          needsReminder: false,
          isArchived: false,
          isBlocked: false,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          dueDate: null,
          reminderDate: null,
          userId: 'user-id',
          projectId: null,
          parentTaskId: null,
          tags: [],
          subtasks: [],
          blockedBy: [],
          blocking: [],
          recurrenceRule: null,
          recurrenceAnchorId: null,
          notes: '',
          estimatedTimeInMinutes: 0,
          actualTimeInMinutes: 0,
          reminderMessage: null,
          nextDueDate: null,
          hasTime: false,
          recurrencePattern: null,
          recurrenceEndDate: null,
          recurrenceCount: null,
          recurrenceInterval: null,
          recurrenceFrequency: null,
          recurrenceByDay: null,
          recurrenceByMonth: null,
          recurrenceByMonthDay: null,
          recurrenceWeekStart: null,
          recurrenceDays: [],
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
          recurrenceExceptions: [],
          recurrenceTimezone: null,
          recurrencePosition: null,
          recurrenceOf: null,
          estimatedMinutes: 0,
          project: null,
          focusSessions: [],
          isCompleted: true,
        } as unknown as Task,
        {
          id: 'task-2',
          title: 'Task 2',
          description: 'Description 2',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.COMPLETED,
          needsReminder: false,
          isArchived: false,
          isBlocked: false,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          dueDate: null,
          reminderDate: null,
          userId: 'user-id',
          projectId: null,
          parentTaskId: null,
          tags: [],
          subtasks: [],
          blockedBy: [],
          blocking: [],
          recurrenceRule: null,
          recurrenceAnchorId: null,
          notes: '',
          estimatedTimeInMinutes: 0,
          actualTimeInMinutes: 0,
          reminderMessage: null,
          nextDueDate: null,
          hasTime: false,
          recurrencePattern: null,
          recurrenceEndDate: null,
          recurrenceCount: null,
          recurrenceInterval: null,
          recurrenceFrequency: null,
          recurrenceByDay: null,
          recurrenceByMonth: null,
          recurrenceByMonthDay: null,
          recurrenceWeekStart: null,
          recurrenceDays: [],
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
          recurrenceExceptions: [],
          recurrenceTimezone: null,
          recurrencePosition: null,
          recurrenceOf: null,
          estimatedMinutes: 0,
          project: null,
          focusSessions: [],
          isCompleted: true,
        } as unknown as Task,
        {
          id: 'task-3',
          title: 'Task 3',
          description: 'Description 3',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.COMPLETED,
          needsReminder: false,
          isArchived: false,
          isBlocked: false,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          dueDate: null,
          reminderDate: null,
          userId: 'user-id',
          projectId: null,
          parentTaskId: null,
          tags: [],
          subtasks: [],
          blockedBy: [],
          blocking: [],
          recurrenceRule: null,
          recurrenceAnchorId: null,
          notes: '',
          estimatedTimeInMinutes: 0,
          actualTimeInMinutes: 0,
          reminderMessage: null,
          nextDueDate: null,
          hasTime: false,
          recurrencePattern: null,
          recurrenceEndDate: null,
          recurrenceCount: null,
          recurrenceInterval: null,
          recurrenceFrequency: null,
          recurrenceByDay: null,
          recurrenceByMonth: null,
          recurrenceByMonthDay: null,
          recurrenceWeekStart: null,
          recurrenceDays: [],
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
          recurrenceExceptions: [],
          recurrenceTimezone: null,
          recurrencePosition: null,
          recurrenceOf: null,
          estimatedMinutes: 0,
          project: null,
          focusSessions: [],
          isCompleted: true,
        } as unknown as Task,
      ];

      taskService.completeOverdueTasks.mockResolvedValue(mockTasks);

      const result = await controller.completeOverdueTasks('user-id', {
        additionalFilters: { cutoffDate: new Date() },
        includeBlockedTasks: false,
      });

      expect(result).toEqual({
        success: true,
        tasksCompleted: 3,
        message: 'Completed 3 overdue tasks',
        completedTaskIds: ['task-1', 'task-2', 'task-3'],
      });
    });
  });

  describe('batchCompleteTasks', () => {
    it('should batch complete tasks', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description 1',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.COMPLETED,
          needsReminder: false,
          isArchived: false,
          isBlocked: false,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          dueDate: null,
          reminderDate: null,
          userId: 'user-id',
          projectId: null,
          parentTaskId: null,
          tags: [],
          subtasks: [],
          blockedBy: [],
          blocking: [],
          recurrenceRule: null,
          recurrenceAnchorId: null,
          notes: '',
          estimatedTimeInMinutes: 0,
          actualTimeInMinutes: 0,
          reminderMessage: null,
          nextDueDate: null,
          hasTime: false,
          recurrencePattern: null,
          recurrenceEndDate: null,
          recurrenceCount: null,
          recurrenceInterval: null,
          recurrenceFrequency: null,
          recurrenceByDay: null,
          recurrenceByMonth: null,
          recurrenceByMonthDay: null,
          recurrenceWeekStart: null,
          recurrenceDays: [],
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
          recurrenceExceptions: [],
          recurrenceTimezone: null,
          recurrencePosition: null,
          recurrenceOf: null,
          estimatedMinutes: 0,
          project: null,
          focusSessions: [],
          isCompleted: true,
        } as unknown as Task,
        {
          id: 'task-2',
          title: 'Task 2',
          description: 'Description 2',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.COMPLETED,
          needsReminder: false,
          isArchived: false,
          isBlocked: false,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          dueDate: null,
          reminderDate: null,
          userId: 'user-id',
          projectId: null,
          parentTaskId: null,
          tags: [],
          subtasks: [],
          blockedBy: [],
          blocking: [],
          recurrenceRule: null,
          recurrenceAnchorId: null,
          notes: '',
          estimatedTimeInMinutes: 0,
          actualTimeInMinutes: 0,
          reminderMessage: null,
          nextDueDate: null,
          hasTime: false,
          recurrencePattern: null,
          recurrenceEndDate: null,
          recurrenceCount: null,
          recurrenceInterval: null,
          recurrenceFrequency: null,
          recurrenceByDay: null,
          recurrenceByMonth: null,
          recurrenceByMonthDay: null,
          recurrenceWeekStart: null,
          recurrenceDays: [],
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
          recurrenceExceptions: [],
          recurrenceTimezone: null,
          recurrencePosition: null,
          recurrenceOf: null,
          estimatedMinutes: 0,
          project: null,
          focusSessions: [],
          isCompleted: true,
        } as unknown as Task,
        {
          id: 'task-3',
          title: 'Task 3',
          description: 'Description 3',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.COMPLETED,
          needsReminder: false,
          isArchived: false,
          isBlocked: false,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          dueDate: null,
          reminderDate: null,
          userId: 'user-id',
          projectId: null,
          parentTaskId: null,
          tags: [],
          subtasks: [],
          blockedBy: [],
          blocking: [],
          recurrenceRule: null,
          recurrenceAnchorId: null,
          notes: '',
          estimatedTimeInMinutes: 0,
          actualTimeInMinutes: 0,
          reminderMessage: null,
          nextDueDate: null,
          hasTime: false,
          recurrencePattern: null,
          recurrenceEndDate: null,
          recurrenceCount: null,
          recurrenceInterval: null,
          recurrenceFrequency: null,
          recurrenceByDay: null,
          recurrenceByMonth: null,
          recurrenceByMonthDay: null,
          recurrenceWeekStart: null,
          recurrenceDays: [],
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
          recurrenceExceptions: [],
          recurrenceTimezone: null,
          recurrencePosition: null,
          recurrenceOf: null,
          estimatedMinutes: 0,
          project: null,
          focusSessions: [],
          isCompleted: true,
        } as unknown as Task,
      ];

      taskService.batchCompleteTasks.mockResolvedValue(mockTasks);

      const result = await controller.batchCompleteTasks('user-id', {
        additionalFilters: { taskIds: ['task-1', 'task-2', 'task-3'] },
        statuses: [TaskStatus.NOT_STARTED],
      });

      expect(result).toEqual({
        success: true,
        tasksCompleted: 3,
        message: 'Completed 3 tasks',
        completedTaskIds: ['task-1', 'task-2', 'task-3'],
      });
    });
  });
});
