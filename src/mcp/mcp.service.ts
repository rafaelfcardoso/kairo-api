import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { TaskService } from '../tasks/tasks.service';
import {
  Resource,
  ResourceInstance,
  ResourceQueryParams,
  PropertyDefinition,
  Action,
  ActionExecutionRequest,
  ActionExecutionResponse,
  ToolsResponse,
} from './mcp.types';
import {
  Task,
  TaskStatus,
  TaskPriority,
  RecurrencePattern,
  RecurrenceTimeOfDay,
} from '../tasks/tasks.entity';
import { CreateTaskDto } from '../tasks/tasks.dto';
import {
  NaturalLanguageRequest,
  AiService,
  TaskAnalysisResponse,
} from '../common/services/ai.service';

@Injectable()
export class McpService {
  constructor(
    private tasksService: TaskService,
    @Inject(forwardRef(() => AiService))
    private aiService: AiService,
  ) {}

  /**
   * Get resource schema for the specified resource type
   */
  getResourceSchema(resourceType: string): Resource {
    switch (resourceType.toLowerCase()) {
      case 'task':
        return this.getTaskResourceSchema();
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  /**
   * Get resources of the specified type with filtering
   */
  async getResources(
    resourceType: string,
    params: ResourceQueryParams,
  ): Promise<ResourceInstance[]> {
    switch (resourceType.toLowerCase()) {
      case 'task':
        return this.getTaskResources(params);
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  /**
   * Get a specific resource by ID
   */
  async getResource(
    resourceType: string,
    id: string,
  ): Promise<ResourceInstance> {
    switch (resourceType.toLowerCase()) {
      case 'task':
        return this.getTaskResource(id);
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  /**
   * Create a new resource
   */
  async createResource(
    resourceType: string,
    data: any,
  ): Promise<ResourceInstance> {
    switch (resourceType.toLowerCase()) {
      case 'task':
        return this.createTaskResource(data);
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  /**
   * Get available MCP tools/actions
   */
  getTools(): ToolsResponse {
    return {
      actions: [this.getCreateTaskFromNLPActionDefinition()],
    };
  }

  /**
   * Execute an MCP action
   */
  async executeAction(
    request: ActionExecutionRequest,
  ): Promise<ActionExecutionResponse> {
    switch (request.name) {
      case 'createTaskFromNLP':
        return this.executeCreateTaskFromNLP(request);
      default:
        throw new BadRequestException(`Unknown action: ${request.name}`);
    }
  }

  /**
   * Get the definition for the createTaskFromNLP action
   */
  private getCreateTaskFromNLPActionDefinition(): Action {
    return {
      name: 'createTaskFromNLP',
      description: 'Creates a new task from natural language input',
      parameters: {
        input: {
          type: 'string',
          description: 'Natural language description of the task to create',
          required: true,
        },
        projectId: {
          type: 'string',
          description: 'Optional project ID to assign the task to',
          required: false,
        },
      },
      returns: {
        type: 'task',
        description: 'The created task resource',
      },
    };
  }

  /**
   * Execute the createTaskFromNLP action
   */
  private async executeCreateTaskFromNLP(
    request: ActionExecutionRequest,
  ): Promise<ActionExecutionResponse> {
    // Validate parameters
    if (
      !request.parameters.input ||
      typeof request.parameters.input !== 'string'
    ) {
      throw new BadRequestException(
        'Input parameter must be a non-empty string',
      );
    }

    // Call the task controller's NLP endpoint
    try {
      // Create NaturalLanguageRequest from parameters
      const nlpRequest: NaturalLanguageRequest = {
        command: request.parameters.input,
        context: {},
      };

      // Add optional project ID if provided
      if (request.parameters.projectId) {
        nlpRequest.context = {
          ...nlpRequest.context,
          projectId: request.parameters.projectId,
        };
      }

      // Process the natural language request using the task service
      const task = await this.processNaturalLanguageTask(nlpRequest);

      // Map the created task to a resource instance
      const taskResource = this.mapTaskToResource(task);

      return {
        data: taskResource,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to create task from NLP: ${error.message}`,
      );
    }
  }

  /**
   * Process a natural language task request
   * This method directly uses the AI service and task service to process NLP input
   */
  private async processNaturalLanguageTask(
    nlpRequest: NaturalLanguageRequest,
  ): Promise<Task> {
    try {
      // Get task analysis directly from the AI service
      const aiResponse =
        await this.aiService.processNaturalLanguage(nlpRequest);

      if (!aiResponse || !aiResponse.analysis?.title) {
        throw new BadRequestException(
          'Failed to analyze natural language input',
        );
      }

      // Get the inbox project as default if no project specified
      const projectId =
        nlpRequest.context?.projectId ||
        (await this.tasksService.getInboxProject()).id;

      // Create the task DTO from the analysis
      const taskDto: CreateTaskDto = {
        title: aiResponse.analysis.title,
        description: aiResponse.analysis.description,
        priority:
          (aiResponse.analysis.priority as TaskPriority) || TaskPriority.NONE,
        dueDate: aiResponse.analysis.due_date
          ? aiResponse.analysis.due_date
          : undefined,
        projectId: projectId,
        // Additional relevant fields from the analysis
        recurrenceRule: aiResponse.analysis.recurrence_rule,
        needsReminder: aiResponse.analysis.title
          .toLowerCase()
          .includes('remind'),
        reminderMessage: aiResponse.analysis.title
          .toLowerCase()
          .includes('remind')
          ? `Auto-generated reminder for: ${aiResponse.analysis.title}`
          : undefined,
      };

      // Create and return the task
      return await this.tasksService.createTask(taskDto);
    } catch (error) {
      throw new BadRequestException(
        `Failed to process natural language task: ${error.message}`,
      );
    }
  }

  /**
   * Create a new task resource
   */
  private async createTaskResource(data: any): Promise<ResourceInstance> {
    try {
      // Convert MCP resource data to CreateTaskDto
      const createTaskDto: CreateTaskDto = {
        title: data.properties.title,
        description: data.properties.description,
        priority: data.properties.priority || TaskPriority.NONE,
        dueDate: data.properties.dueDate,
        // Map other properties as needed
      };

      // Set the status if available (used in internal processing, not part of DTO)
      const taskStatus = data.properties.status || TaskStatus.NOT_STARTED;

      // Handle project relationship
      if (data.relationships?.project?.data?.id) {
        createTaskDto.projectId = data.relationships.project.data.id;
      }

      // Handle tags relationship
      if (data.relationships?.tags?.data) {
        createTaskDto.tagIds = Array.isArray(data.relationships.tags.data)
          ? data.relationships.tags.data.map((tag) => tag.id)
          : [data.relationships.tags.data.id];
      }

      // Create the task
      const task = await this.tasksService.createTask(createTaskDto);

      // If status is different from default, update it
      if (taskStatus !== TaskStatus.NOT_STARTED) {
        task.status = taskStatus;
        await this.tasksService.updateTask(task.id, { status: taskStatus });
      }

      // Map the created task to a resource instance
      return this.mapTaskToResource(task);
    } catch (error) {
      throw new BadRequestException(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Transform Task entity to MCP Resource schema
   */
  private getTaskResourceSchema(): Resource {
    const statusOptions = Object.values(TaskStatus);
    const priorityOptions = Object.values(TaskPriority);
    const recurrencePatternOptions = Object.values(RecurrencePattern);
    const recurrenceTimeOfDayOptions = Object.values(RecurrenceTimeOfDay);

    const properties: Record<string, PropertyDefinition> = {
      id: {
        type: 'string',
        description: 'The unique identifier of the task',
        required: true,
      },
      title: {
        type: 'string',
        description: 'The title of the task',
        required: true,
      },
      description: {
        type: 'string',
        description: 'Detailed description of the task',
        nullable: true,
      },
      status: {
        type: 'string',
        description: 'Current status of the task',
        enum: statusOptions,
      },
      priority: {
        type: 'string',
        description: 'Priority level of the task',
        enum: priorityOptions,
      },
      dueDate: {
        type: 'string',
        format: 'date-time',
        description: 'Due date of the task',
        nullable: true,
      },
      isCompleted: {
        type: 'boolean',
        description: 'Whether the task is completed',
      },
      isRecurring: {
        type: 'boolean',
        description: 'Whether this is a recurring task',
      },
      isArchived: {
        type: 'boolean',
        description: 'Whether the task is archived',
      },
      hasTime: {
        type: 'boolean',
        description:
          'Whether the task has a specific time set for the due date',
      },
      needsReminder: {
        type: 'boolean',
        description: 'Whether the task needs a reminder',
      },
      reminderMessage: {
        type: 'string',
        description: 'Custom message to include with the reminder',
        nullable: true,
      },
      recurrencePattern: {
        type: 'string',
        description: 'The pattern for task recurrence',
        enum: recurrencePatternOptions,
        nullable: true,
      },
      recurrenceDays: {
        type: 'string',
        description: 'Specific days for weekly recurrence',
        nullable: true,
      },
      recurrenceTimeOfDay: {
        type: 'string',
        description: 'Time of day for the recurring task',
        enum: recurrenceTimeOfDayOptions,
        nullable: true,
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the task was created',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the task was last updated',
      },
    };

    return {
      type: 'task',
      title: 'Task',
      description: 'A task in the system',
      properties,
      relationships: {
        project: {
          resourceType: 'project',
          cardinality: 'one',
          description: 'The project this task belongs to',
          required: true,
        },
        tags: {
          resourceType: 'tag',
          cardinality: 'many',
          description: 'Tags associated with this task',
        },
      },
    };
  }

  /**
   * Transform Task entity to MCP Resource instance
   */
  private mapTaskToResource(task: Task): ResourceInstance {
    // Validate required properties
    if (!task.id) {
      throw new Error('Task ID is required');
    }

    if (!task.title) {
      throw new Error('Task title is required');
    }

    if (!task.project) {
      throw new Error('Task must be assigned to a project');
    }

    const resourceInstance: ResourceInstance = {
      id: task.id,
      type: 'task',
      properties: {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString(),
        isCompleted: task.isCompleted,
        isRecurring: task.isRecurring,
        isArchived: task.isArchived,
        hasTime: task.hasTime,
        needsReminder: task.needsReminder,
        reminderMessage: task.reminderMessage,
        recurrencePattern: task.recurrencePattern,
        recurrenceDays: task.recurrenceDays,
        recurrenceTimeOfDay: task.recurrenceTimeOfDay,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
      relationships: {
        // Always include project relationship since it's required
        project: {
          data: {
            id: task.project.id,
            type: 'project',
          },
        },
      },
    };

    // Add tags relationships if exist
    if (task.tags && task.tags.length > 0) {
      resourceInstance.relationships.tags = {
        data: task.tags.map((tag) => ({
          id: tag.id,
          type: 'tag',
        })),
      };
    }

    return resourceInstance;
  }

  /**
   * Get task resources with filtering
   */
  private async getTaskResources(
    params: ResourceQueryParams,
  ): Promise<ResourceInstance[]> {
    // Convert MCP query params to our task filter params
    const filterDto = {
      status: params.filter?.status,
      priority: params.filter?.priority,
      search: params.filter?.search,
      isArchived: params.filter?.isArchived === 'true',
      isCompleted: params.filter?.isCompleted === 'true',
      // Add other filter parameters as needed
    };

    const tasks = await this.tasksService.getTasks(filterDto);

    // Map tasks to resources and filter out any that don't meet required criteria
    return tasks
      .map((task) => {
        try {
          return this.mapTaskToResource(task);
        } catch (error) {
          // Log the error but don't include this task in results
          console.error(`Error mapping task ${task.id}: ${error.message}`);
          return null;
        }
      })
      .filter((resource) => resource !== null);
  }

  /**
   * Get a specific task by ID
   */
  private async getTaskResource(id: string): Promise<ResourceInstance> {
    const task = await this.tasksService.getTaskById(id);

    try {
      return this.mapTaskToResource(task);
    } catch (error) {
      throw new Error(
        `Task with ID ${id} does not meet required criteria: ${error.message}`,
      );
    }
  }
}
