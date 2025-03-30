import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from '../../../src/tasks/tasks.controller';
import { TaskService } from '../../../src/tasks/tasks.service';
import { RecurringTaskService } from '../../../src/tasks/recurring-task.service';
import { TaskDomainService } from '../../../src/tasks/tasks.domain.service';
import { TasksRepository } from '../../../src/tasks/tasks.repository';
import { ProjectsRepository } from '../../../src/projects/projects.repository';
import { TagsRepository } from '../../../src/tags/tags.repository';
import { SecurityLoggerService } from '../../../src/common/services/security-logger.service';
import { SchedulerService } from '../../../src/common/services/scheduler.service';
import { NotificationService } from '../../../src/common/services/notification.service';
import { NotificationDomainService } from '../../../src/tasks/notification.domain.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Task,
  TaskStatus,
  TaskPriority,
} from '../../../src/tasks/tasks.entity';
import { Project, ProjectType } from '../../../src/projects/projects.entity';
import { Tag } from '../../../src/tags/tags.entity';
import { Repository, DataSource } from 'typeorm';
import { CreateTaskDto, UpdateTaskDto } from '../../../src/tasks/tasks.dto';
import { HttpService } from '@nestjs/axios';
import { Logger, NotFoundException } from '@nestjs/common';
import { TaskFactory } from '../../../src/tasks/factories/task.factory';
import { TaskAggregate } from '../../../src/tasks/aggregates/task.aggregate';
import { v4 as uuidv4 } from 'uuid';
import { Reflector } from '@nestjs/core';

describe('Task Workflow Integration', () => {
  let taskController: TaskController;
  let taskService: TaskService;
  let recurringTaskService: RecurringTaskService;
  let taskDomainService: TaskDomainService;
  let tasksRepository: TasksRepository;
  let projectsRepository: ProjectsRepository;
  let tagsRepository: TagsRepository;
  let taskRepository: Repository<Task>;
  let projectRepository: Repository<Project>;
  let tagRepository: Repository<Tag>;

  // Test entities
  let inboxProject: Project;
  let customProject: Project;
  let taskInInbox: Task;
  let tagImportant: Tag;
  let tagUrgent: Tag;

  beforeEach(async () => {
    // Create our mock repositories and services
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        TaskService,
        RecurringTaskService,
        TaskDomainService,
        TasksRepository,
        ProjectsRepository,
        TagsRepository,
        TaskFactory,
        {
          provide: SecurityLoggerService,
          useValue: {
            logSecurityEvent: jest.fn(),
            logValidationFailure: jest.fn(),
            logSuspiciousActivity: jest.fn(),
          },
        },
        {
          provide: SchedulerService,
          useValue: {
            processTask: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendTaskNotification: jest.fn(),
          },
        },
        {
          provide: NotificationDomainService,
          useValue: {
            generateNotificationContent: jest.fn(),
            scheduleTaskReminder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Project),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Tag),
          useClass: Repository,
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
        {
          provide: DataSource,
          useFactory: () => ({
            createQueryRunner: jest.fn(() => ({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                createQueryBuilder: jest.fn(),
              },
            })),
            createEntityManager: jest.fn(),
          }),
        },
        Reflector,
      ],
    }).compile();

    taskController = module.get<TaskController>(TaskController);
    taskService = module.get<TaskService>(TaskService);
    recurringTaskService =
      module.get<RecurringTaskService>(RecurringTaskService);
    taskDomainService = module.get<TaskDomainService>(TaskDomainService);
    tasksRepository = module.get<TasksRepository>(TasksRepository);
    projectsRepository = module.get<ProjectsRepository>(ProjectsRepository);
    tagsRepository = module.get<TagsRepository>(TagsRepository);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    tagRepository = module.get<Repository<Tag>>(getRepositoryToken(Tag));

    // Setup test entities
    setupTestEntities();

    // Setup repository mocks
    setupRepositoryMocks();
  });

  const setupTestEntities = () => {
    // Create Inbox project
    inboxProject = {
      id: 'inbox-project-id',
      name: 'Inbox',
      description: 'Default project for unassigned tasks',
      isArchived: false,
      isSystem: true,
      type: ProjectType.INBOX,
      color: '#0000FF',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      parent: null,
      children: [],
      tasks: [],
    };

    // Create custom project
    customProject = {
      id: 'custom-project-id',
      name: 'Work Project',
      description: 'Project for work-related tasks',
      isArchived: false,
      isSystem: false,
      type: ProjectType.REGULAR,
      color: '#FF5733',
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      parent: null,
      children: [],
      tasks: [],
    };

    // Create tags
    tagImportant = {
      id: 'important-tag-id',
      name: 'Important',
      color: '#FF0000',
      description: 'Important tasks',
      isGoal: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tasks: [],
    };

    tagUrgent = {
      id: 'urgent-tag-id',
      name: 'Urgent',
      color: '#FF00FF',
      description: 'Urgent tasks',
      isGoal: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tasks: [],
    };

    // Create task in inbox
    taskInInbox = {
      id: 'inbox-task-id',
      title: 'Inbox Task',
      description: 'Task in inbox',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date('2025-05-01'),
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
      project: inboxProject,
      tags: [],
      focusSessions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      recurrenceTimeOfDay: null,
      recurrenceTime: null,
      estimatedMinutes: 0,
      isCompleted: false,
    };
  };

  const setupRepositoryMocks = () => {
    // Setup Task repository mocks
    const taskRep = taskRepository as jest.Mocked<Repository<Task>>;
    taskRep.findOne = jest.fn((options: any) => {
      if (options?.where?.id === taskInInbox.id) {
        return Promise.resolve(taskInInbox as any);
      }
      return Promise.resolve(null);
    });

    taskRep.save = jest.fn((task: any) => {
      return Promise.resolve({
        ...task,
        id: task.id || uuidv4(),
        createdAt: task.createdAt || new Date(),
        updatedAt: new Date(),
      });
    });

    taskRep.create = jest.fn().mockImplementation((task: any) => {
      return {
        ...task,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    taskRep.createQueryBuilder = jest.fn().mockImplementation(() => {
      return {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([taskInInbox]),
        getOne: jest.fn().mockResolvedValue(taskInInbox),
      } as any;
    });

    // Setup Project repository mocks
    const projectRep = projectRepository as jest.Mocked<Repository<Project>>;
    projectRep.findOne = jest.fn((options: any) => {
      const id = typeof options === 'object' ? options?.where?.id : null;

      if (id === inboxProject.id) {
        return Promise.resolve(inboxProject as any);
      } else if (id === customProject.id) {
        return Promise.resolve(customProject as any);
      }

      return Promise.resolve(null);
    });

    // Setup Tag repository mocks
    const tagRep = tagRepository as jest.Mocked<Repository<Tag>>;
    tagRep.findOne = jest.fn((options: any) => {
      const id = typeof options === 'object' ? options?.where?.id : null;

      if (id === tagImportant.id) {
        return Promise.resolve(tagImportant as any);
      } else if (id === tagUrgent.id) {
        return Promise.resolve(tagUrgent as any);
      }

      return Promise.resolve(null);
    });

    tagRep.find = jest.fn((options: any) => {
      return Promise.resolve([tagImportant, tagUrgent]);
    });

    // Mock the TasksRepository methods
    jest
      .spyOn(tasksRepository, 'createTask')
      .mockImplementation(async (createTaskDto) => {
        const newTask = {
          id: uuidv4(),
          status: TaskStatus.NOT_STARTED,
          isArchived: false,
          isRecurring: createTaskDto.isRecurring || false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...createTaskDto,
          isCompleted: false,
          project: null,
          tags: [],
          focusSessions: [],
          estimatedMinutes: 0,
          dueDate: createTaskDto.dueDate
            ? new Date(createTaskDto.dueDate)
            : null,
          nextDueDate: createTaskDto.nextDueDate
            ? new Date(createTaskDto.nextDueDate)
            : null,
          recurrenceRule: null,
          recurrencePattern: null,
          recurrenceDays: null,
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          reminderMessage: null,
          needsReminder: false,
          hasTime: false,
          recurringParentId: null,
        };

        if (createTaskDto.projectId) {
          const project = await projectRepository.findOne({
            where: { id: createTaskDto.projectId },
          });

          if (!project) {
            throw new NotFoundException(
              `Project with ID "${createTaskDto.projectId}" not found`,
            );
          }

          newTask.project = project;
        } else {
          // Default to inbox
          newTask.project = inboxProject;
        }

        return newTask as Task;
      });

    jest
      .spyOn(tasksRepository, 'getTaskById')
      .mockImplementation(async (id) => {
        const task = await taskRepository.findOne({
          where: { id },
        });

        if (!task) {
          throw new NotFoundException(`Task with ID "${id}" not found`);
        }

        return task;
      });

    jest
      .spyOn(tasksRepository, 'getTasks')
      .mockImplementation(async (filterDto) => {
        return [taskInInbox];
      });

    jest
      .spyOn(tasksRepository, 'updateTask')
      .mockImplementation(async (id, updateTaskDto) => {
        const task = await tasksRepository.getTaskById(id);

        // Ensure dueDate is a Date object
        const dueDate = updateTaskDto.dueDate
          ? typeof updateTaskDto.dueDate === 'string'
            ? new Date(updateTaskDto.dueDate)
            : updateTaskDto.dueDate
          : task.dueDate;

        // Ensure nextDueDate is a Date object
        const nextDueDate = updateTaskDto.nextDueDate
          ? typeof updateTaskDto.nextDueDate === 'string'
            ? new Date(updateTaskDto.nextDueDate)
            : updateTaskDto.nextDueDate
          : task.nextDueDate;

        const updatedTask = {
          ...task,
          ...updateTaskDto,
          dueDate,
          nextDueDate,
          updatedAt: new Date(),
          isCompleted:
            updateTaskDto.status === TaskStatus.COMPLETED ||
            task.isCompleted ||
            false,
        };

        return updatedTask;
      });

    jest
      .spyOn(tasksRepository, 'assignToProject')
      .mockImplementation(async (taskId, projectId) => {
        const task = await tasksRepository.getTaskById(taskId);
        const project = await projectRepository.findOne({
          where: { id: projectId },
        });

        if (!project) {
          throw new NotFoundException(
            `Project with ID "${projectId}" not found`,
          );
        }

        // Create a properly typed Task object
        const updatedTask = {
          ...task,
          project,
          updatedAt: new Date(),
          isCompleted: task.isCompleted || false,
        };

        return updatedTask;
      });

    jest
      .spyOn(tasksRepository, 'addTags')
      .mockImplementation(async (taskId, tagIds) => {
        const task = await tasksRepository.getTaskById(taskId);
        const tags = [];

        for (const tagId of tagIds) {
          const tag = await tagRepository.findOne({
            where: { id: tagId },
          });

          if (tag) {
            tags.push(tag);
          }
        }

        // Create a properly typed Task object
        const updatedTask = {
          ...task,
          tags: [...(task.tags || []), ...tags],
          updatedAt: new Date(),
          isCompleted: task.isCompleted || false,
        };

        return updatedTask;
      });

    // Mock for projectsRepository
    jest
      .spyOn(projectsRepository, 'findOne')
      .mockImplementation((options: any) => {
        return projectRepository.findOne(options);
      });
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task Creation and Management Workflow', () => {
    it('should create a task, assign to project, add tags, and complete it', async () => {
      // Create a variable to store the task between operations
      let testTask = null;

      // 1. Create a new task with default project (Inbox)
      const createTaskDto: CreateTaskDto = {
        title: 'New Test Task',
        description: 'This is a test task',
        priority: TaskPriority.HIGH,
      };

      const mockRequest = {
        user: { id: 'test-user-id' },
        ip: '127.0.0.1',
      } as any;

      // Mock the task creation to return a new task in the inbox
      jest
        .spyOn(taskService, 'createTask')
        .mockImplementation(async (dto, ip) => {
          const newTask = await tasksRepository.createTask(dto);
          testTask = newTask; // Store the task for future operations
          return newTask;
        });

      // Mock the getTaskById to use our stored task
      jest
        .spyOn(tasksRepository, 'getTaskById')
        .mockImplementation(async (id) => {
          if (testTask && id === testTask.id) {
            return testTask;
          }

          // Otherwise, use the original implementation
          const task = await taskRepository.findOne({
            where: { id },
          });

          if (!task) {
            throw new NotFoundException(`Task with ID "${id}" not found`);
          }

          return task;
        });

      const createdTask = await taskController.createTask(
        createTaskDto,
        mockRequest,
      );

      expect(createdTask).toBeDefined();
      expect(createdTask.title).toBe(createTaskDto.title);
      expect(createdTask.priority).toBe(createTaskDto.priority);
      expect(taskService.createTask).toHaveBeenCalledWith(
        createTaskDto,
        mockRequest.ip,
      );

      // 2. Update the task and assign it to a project
      const updateTaskDto: UpdateTaskDto = {
        projectId: customProject.id,
        title: 'Updated Test Task',
      };

      // Mock the task update
      jest
        .spyOn(taskService, 'updateTask')
        .mockImplementation(async (id, dto, ip) => {
          // First do a basic update
          const updatedTask = await tasksRepository.updateTask(id, dto);
          testTask = updatedTask; // Update our stored task

          // Then handle project assignment if needed
          if (dto.projectId) {
            const withProject = await tasksRepository.assignToProject(
              id,
              dto.projectId,
            );
            testTask = withProject; // Update our stored task again
            return withProject;
          }

          return updatedTask;
        });

      const updatedTask = await taskController.updateTask(
        createdTask.id,
        updateTaskDto,
        mockRequest,
      );

      expect(updatedTask).toBeDefined();
      expect(updatedTask.title).toBe(updateTaskDto.title);
      expect(updatedTask.project.id).toBe(customProject.id);
      expect(updatedTask.project.name).toBe(customProject.name);
      expect(taskService.updateTask).toHaveBeenCalledWith(
        createdTask.id,
        updateTaskDto,
        mockRequest.ip,
      );

      // 3. Add tags to the task
      const tagIds = [tagImportant.id, tagUrgent.id];

      // Mock the addTags method
      jest
        .spyOn(taskService, 'addTags')
        .mockImplementation(async (id, tagIds) => {
          const result = await tasksRepository.addTags(id, tagIds);
          testTask = result; // Update our stored task
          return result;
        });

      const taskWithTags = await taskController.addTags(updatedTask.id, tagIds);

      expect(taskWithTags).toBeDefined();
      expect(taskWithTags.tags).toHaveLength(2);
      expect(taskWithTags.tags[0].id).toBe(tagImportant.id);
      expect(taskWithTags.tags[1].id).toBe(tagUrgent.id);
      expect(taskService.addTags).toHaveBeenCalledWith(updatedTask.id, tagIds);

      // 4. Complete the task
      const completeTaskDto: UpdateTaskDto = {
        status: TaskStatus.COMPLETED,
      };

      // Mock the task completion
      jest
        .spyOn(taskService, 'updateTask')
        .mockImplementation(async (id, dto, ip) => {
          // For complete task action
          if (dto.status === TaskStatus.COMPLETED) {
            const completedTask = {
              ...testTask,
              status: TaskStatus.COMPLETED,
              completedAt: new Date(),
              isCompleted: true,
              // Ensure all date properties are proper Date objects
              dueDate:
                testTask.dueDate instanceof Date
                  ? testTask.dueDate
                  : testTask.dueDate
                    ? new Date(testTask.dueDate)
                    : null,
              nextDueDate:
                testTask.nextDueDate instanceof Date
                  ? testTask.nextDueDate
                  : testTask.nextDueDate
                    ? new Date(testTask.nextDueDate)
                    : null,
            };
            testTask = completedTask; // Update our stored task
            return completedTask;
          }
          return testTask;
        });

      const completedTask = await taskController.updateTask(
        taskWithTags.id,
        completeTaskDto,
        mockRequest,
      );

      expect(completedTask).toBeDefined();
      expect(completedTask.status).toBe(TaskStatus.COMPLETED);
      expect(taskService.updateTask).toHaveBeenCalledWith(
        taskWithTags.id,
        completeTaskDto,
        mockRequest.ip,
      );

      // 5. Verify task retrieval works correctly
      jest.spyOn(taskService, 'getTaskById').mockImplementation(async (id) => {
        return tasksRepository.getTaskById(id);
      });

      const retrievedTask = await taskController.getTaskById(completedTask.id);

      expect(retrievedTask).toBeDefined();
      expect(retrievedTask.id).toBe(completedTask.id);
      expect(retrievedTask.status).toBe(TaskStatus.COMPLETED);
      expect(taskService.getTaskById).toHaveBeenCalledWith(completedTask.id);
    });
  });
});
