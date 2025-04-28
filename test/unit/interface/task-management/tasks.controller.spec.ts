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
import { mockRequest, mockUser } from '../../../mocks/request.mock';

describe('TaskController', () => {
  let controller: TaskController;
  let taskService: jest.Mocked<TaskService>;
  let mockLogger: any;

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
    recurrenceRule: '',
    recurrencePattern: '',
    recurrenceDays: '',
    nextDueDate: new Date(),
    reminderMessage: '',
    needsReminder: false,
    hasTime: false,
    recurringParentId: '',
    project: {
      id: 'project-1',
      name: 'Test Project',
      description: '',
      type: ProjectType.INBOX,
      isArchived: false,
      isSystem: false,
      parent: undefined as any,
      children: [],
      tasks: [],
      color: '#000000',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: mockUser,
      userId: mockUser.id,
    },
    tags: [],
    focusSessions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    recurrenceTimeOfDay: '',
    recurrenceTime: '',
    estimatedMinutes: 0,
    completedAt: new Date(),
    user: mockUser,
    userId: mockUser.id,
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
          useValue: {
            logSecurityEvent: jest.fn(),
            logValidationFailure: jest.fn(),
            logSuspiciousActivity: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {},
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    taskService = module.get<jest.Mocked<TaskService>>(TaskService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTasks', () => {
    it('should return all tasks with filters', async () => {
      const filterDto: TaskFilterDto = {
        status: TaskStatus.NOT_STARTED,
        search: 'test',
      };

      const result = await controller.getTasks(filterDto, mockRequest);

      expect(result).toEqual([mockTask]);
      expect(taskService.getTasks).toHaveBeenCalledWith(filterDto, mockUser.id);
    });

    it('should handle database errors gracefully', async () => {
      const filterDto: TaskFilterDto = {};
      taskService.getTasks.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.getTasks(filterDto, mockRequest),
      ).rejects.toThrow();
    });
  });

  describe('getTaskById', () => {
    it('should return a task by id', async () => {
      const result = await controller.getTaskById('task-123', mockRequest);

      expect(result).toEqual(mockTask);
      expect(taskService.getTaskById).toHaveBeenCalledWith(
        'task-123',
        mockUser.id,
      );
    });

    it('should throw NotFoundException when task is not found', async () => {
      const id = 'non-existent';
      taskService.getTaskById.mockRejectedValue(new NotFoundException());

      await expect(
        controller.getTaskById('non-existent', mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      await controller.deleteTask('task-123', mockRequest);

      expect(taskService.deleteTask).toHaveBeenCalledWith(
        'task-123',
        mockUser.id,
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      taskService.deleteTask.mockRejectedValue(new NotFoundException());

      await expect(
        controller.deleteTask('non-existent', mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('archiveTask', () => {
    it('should archive a task', async () => {
      const result = await controller.archiveTask('task-123', mockRequest);

      expect(result).toEqual({ ...mockTask, isArchived: true });
      expect(taskService.archiveTask).toHaveBeenCalledWith(
        'task-123',
        mockUser.id,
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      taskService.archiveTask.mockRejectedValue(new NotFoundException());

      await expect(
        controller.archiveTask('non-existent', mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addTags', () => {
    it('should add tags to a task', async () => {
      const tagIds = ['tag-1'];
      const result = await controller.addTags('task-123', tagIds, mockRequest);

      expect(result).toEqual({
        ...mockTask,
        tags: [{ id: 'tag-1', name: 'Tag 1' }],
      });
      expect(taskService.addTags).toHaveBeenCalledWith(
        'task-123',
        tagIds,
        mockUser.id,
      );
    });
  });

  describe('removeTags', () => {
    it('should remove tags from a task', async () => {
      const tagIds = ['tag-1'];
      const result = await controller.removeTags(
        'task-123',
        tagIds,
        mockRequest,
      );

      expect(result).toEqual({ ...mockTask, tags: [] });
      expect(taskService.removeTags).toHaveBeenCalledWith(
        'task-123',
        tagIds,
        mockUser.id,
      );
    });
  });

  describe('getTodayTasks', () => {
    it("should return today's tasks", async () => {
      const result = await controller.getTodayTasks(mockRequest);

      expect(result).toEqual([mockTask]);
      expect(taskService.getTodayTasks).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getOverdueTasks', () => {
    it('should return overdue tasks', async () => {
      const result = await controller.getOverdueTasks(mockRequest);

      expect(result).toEqual([mockTask]);
      expect(taskService.getOverdueTasks).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getUpcomingTasks', () => {
    it('should return upcoming tasks', async () => {
      const days = 7;
      const result = await controller.getUpcomingTasks(days, mockRequest);

      expect(result).toEqual([mockTask]);
      expect(taskService.getUpcomingTasks).toHaveBeenCalledWith(
        days,
        mockUser.id,
      );
    });

    it('should use default days if not provided', async () => {
      const result = await controller.getUpcomingTasks(5, mockRequest);

      expect(result).toEqual([mockTask]);
      expect(taskService.getUpcomingTasks).toHaveBeenCalledWith(5, mockUser.id);
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      const result = await controller.getTaskStats(mockRequest);

      expect(result).toEqual(mockTaskStats);
      expect(taskService.getTaskStats).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getTasksByPriority', () => {
    it('should return tasks grouped by priority', async () => {
      const mockTasksByPriorityResult = {
        [TaskPriority.HIGH]: [mockTask],
        [TaskPriority.MEDIUM]: [mockTask],
        [TaskPriority.LOW]: [mockTask],
        [TaskPriority.NONE]: [mockTask],
      };
      taskService.getTasksByPriority.mockResolvedValue(
        mockTasksByPriorityResult,
      );

      const result = await controller.getTasksByPriority(mockRequest);

      expect(result).toEqual(mockTasksByPriorityResult);
      expect(taskService.getTasksByPriority).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
