import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
  HttpStatus,
} from '@nestjs/common';
import { TaskService } from '../tasks/tasks.service';
import { TagsService } from '../tags/tags.service';
import { ProjectsService } from '../projects/projects.service';
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
import { Tag } from '../tags/tags.entity';
import { Project, ProjectType } from '../projects/projects.entity';
import { CreateTaskDto } from '../tasks/tasks.dto';
import { CreateTagDto } from '../tags/tags.dto';
import { CreateProjectDto } from '../projects/projects.dto';
import {
  NaturalLanguageRequest,
  AiService,
  TaskAnalysisResponse,
} from '../common/services/ai.service';

// Interface for resource retrieval response including related resources
interface ResourceRetrievalResult {
  resource: ResourceInstance;
  included?: ResourceInstance[];
}

// Interface for collection retrieval results
interface ResourceCollectionResult {
  resources: ResourceInstance[];
  included?: ResourceInstance[];
}

@Injectable()
export class McpService {
  constructor(
    private tasksService: TaskService,
    private tagsService: TagsService,
    private projectsService: ProjectsService,
    @Inject(forwardRef(() => AiService))
    private aiService: AiService,
  ) {}

  /**
   * Get resource schema for the specified resource type
   */
  async getResourceSchema(resourceType: string): Promise<Resource> {
    switch (resourceType.toLowerCase()) {
      case 'task':
        return this.getTaskResourceSchema();
      case 'tag':
        return this.getTagResourceSchema();
      case 'project':
        return this.getProjectResourceSchema();
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  /**
   * Get resources of the specified type with filtering, pagination, etc.
   */
  async getResources(
    resourceType: string,
    params: ResourceQueryParams,
  ): Promise<ResourceCollectionResult> {
    const resources = await this._getResourcesInternal(resourceType, params);
    const included: ResourceInstance[] = [];

    // Handle includes if requested
    if (params.include && params.include.length > 0) {
      for (const resource of resources) {
        const relatedResources = await this._getRelatedResources(
          resourceType,
          resource,
          params.include,
        );
        included.push(...relatedResources);
      }
    }

    return { resources, included };
  }

  /**
   * Count resources of a specific type with optional filters
   */
  async getResourceCount(
    resourceType: string,
    filters: Record<string, any>,
  ): Promise<number> {
    switch (resourceType.toLowerCase()) {
      case 'task':
        return this.tasksService.countTasks(filters);
      case 'tag':
        return this.tagsService.countTags(filters);
      case 'project':
        return this.projectsService.countProjects(filters);
      default:
        throw new BadRequestException(`Unknown resource type: ${resourceType}`);
    }
  }

  /**
   * Get a single resource by type and ID with optional includes
   */
  async getResource(
    resourceType: string,
    id: string,
    include: string[] = [],
  ): Promise<ResourceRetrievalResult> {
    const resource = await this._getResourceById(resourceType, id);

    // Handle includes if requested
    let included: ResourceInstance[] = [];
    if (include && include.length > 0) {
      included = await this._getRelatedResources(
        resourceType,
        resource,
        include,
      );
    }

    return { resource, included };
  }

  /**
   * Create a new resource of the specified type
   */
  async createResource(
    resourceType: string,
    data: any,
  ): Promise<ResourceRetrievalResult> {
    const resource = await this._createResourceInternal(resourceType, data);

    // Get relationships that were created
    const included: ResourceInstance[] = [];

    // For tasks, include project and tags if present
    if (resourceType.toLowerCase() === 'task') {
      if (resource.relationships?.project?.data) {
        const projectData = resource.relationships.project.data;
        if (projectData && 'id' in projectData && projectData.id) {
          try {
            const project = await this._getResourceById(
              'project',
              projectData.id,
            );
            included.push(project);
          } catch (error) {
            // Ignore if not found
          }
        }
      }

      if (resource.relationships?.tags?.data) {
        const tagsData = resource.relationships.tags.data;
        if (Array.isArray(tagsData) && tagsData.length > 0) {
          for (const tagRef of tagsData) {
            if (tagRef && 'id' in tagRef) {
              try {
                const tag = await this._getResourceById('tag', tagRef.id);
                included.push(tag);
              } catch (error) {
                // Ignore if not found
              }
            }
          }
        }
      }
    }

    return { resource, included };
  }

  /**
   * Get available tools/actions for the MCP
   */
  async getAvailableTools(): Promise<Action[]> {
    return this._getAvailableActions();
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
      case 'parseTask':
        return this.executeParseTask(request);
      case 'extractEntities':
        return this.executeExtractEntities(request);
      case 'understandQuery':
        return this.executeUnderstandQuery(request);
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
        tagIds: {
          type: 'array',
          description: 'Optional array of tag IDs to assign to the task',
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

      // Add optional tag IDs if provided
      if (
        request.parameters.tagIds &&
        Array.isArray(request.parameters.tagIds)
      ) {
        nlpRequest.context = {
          ...nlpRequest.context,
          tagIds: request.parameters.tagIds,
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
      if (
        error.message?.includes('Failed to process natural language request') ||
        error.status === HttpStatus.SERVICE_UNAVAILABLE
      ) {
        throw new BadRequestException(
          'AI service is currently unavailable. Please try again later.',
        );
      }
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

      // Handle tag IDs
      let tagIds: string[] = [];

      // Add explicitly provided tag IDs if any
      if (
        nlpRequest.context?.tagIds &&
        Array.isArray(nlpRequest.context.tagIds)
      ) {
        tagIds = [...nlpRequest.context.tagIds];
      }

      // Add tags detected by AI service if any
      if (aiResponse.analysis.tags && Array.isArray(aiResponse.analysis.tags)) {
        // Try to find existing tags by name
        for (const tagName of aiResponse.analysis.tags) {
          try {
            const similarTags = await this.tagsService.findSimilarTags(tagName);
            if (similarTags.length > 0) {
              // Add the most relevant tag ID if not already included
              if (!tagIds.includes(similarTags[0].id)) {
                tagIds.push(similarTags[0].id);
              }
            }
          } catch (error) {
            // Log but continue if tag lookup fails
            console.log(
              `Failed to find tag for "${tagName}": ${error.message}`,
            );
          }
        }
      }

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
        // Add tag IDs if any were found
        tagIds: tagIds.length > 0 ? tagIds : undefined,
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

  /**
   * Transform Tag entity to MCP Resource schema
   */
  private getTagResourceSchema(): Resource {
    const properties: Record<string, PropertyDefinition> = {
      id: {
        type: 'string',
        description: 'The unique identifier of the tag',
        required: true,
      },
      name: {
        type: 'string',
        description: 'The name of the tag',
        required: true,
      },
      color: {
        type: 'string',
        description: 'The color of the tag in hex format (e.g., #FF0000)',
        required: true,
      },
      description: {
        type: 'string',
        description: 'Optional description of the tag',
        nullable: true,
      },
      isGoal: {
        type: 'boolean',
        description: 'Whether this tag represents a user goal',
        default: false,
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the tag was created',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the tag was last updated',
      },
    };

    return {
      type: 'tag',
      title: 'Tag',
      description: 'A tag that can be applied to tasks',
      properties,
      relationships: {
        tasks: {
          resourceType: 'task',
          cardinality: 'many',
          description: 'Tasks associated with this tag',
        },
      },
    };
  }

  /**
   * Transform Tag entity to MCP Resource instance
   */
  private mapTagToResource(tag: Tag): ResourceInstance {
    // Validate required properties
    if (!tag.id) {
      throw new Error('Tag ID is required');
    }

    if (!tag.name) {
      throw new Error('Tag name is required');
    }

    if (!tag.color) {
      throw new Error('Tag color is required');
    }

    const resourceInstance: ResourceInstance = {
      id: tag.id,
      type: 'tag',
      properties: {
        name: tag.name,
        color: tag.color,
        description: tag.description,
        isGoal: tag.isGoal,
        createdAt: tag.createdAt.toISOString(),
        updatedAt: tag.updatedAt.toISOString(),
      },
      relationships: {},
    };

    // Add tasks relationships if they exist
    if (tag.tasks && tag.tasks.length > 0) {
      resourceInstance.relationships.tasks = {
        data: tag.tasks.map((task) => ({
          id: task.id,
          type: 'task',
        })),
      };
    }

    return resourceInstance;
  }

  /**
   * Get tag resources with filtering
   */
  private async getTagResources(
    params: ResourceQueryParams,
  ): Promise<ResourceInstance[]> {
    // Check if we're looking for goal tags specifically
    if (params.filter?.isGoal === 'true') {
      const tags = await this.tagsService.getGoalTags();
      return tags.map((tag) => this.mapTagToResource(tag));
    }

    // Default to getting all tags
    const tags = await this.tagsService.getTags();

    // Map tags to resources
    return tags
      .map((tag) => {
        try {
          return this.mapTagToResource(tag);
        } catch (error) {
          console.error(`Error mapping tag ${tag.id}: ${error.message}`);
          return null;
        }
      })
      .filter((resource) => resource !== null);
  }

  /**
   * Get a specific tag by ID
   */
  private async getTagResource(id: string): Promise<ResourceInstance> {
    const tag = await this.tagsService.getTagById(id);

    try {
      return this.mapTagToResource(tag);
    } catch (error) {
      throw new Error(
        `Tag with ID ${id} does not meet required criteria: ${error.message}`,
      );
    }
  }

  /**
   * Create a new tag resource
   */
  private async createTagResource(data: any): Promise<ResourceInstance> {
    try {
      // Convert MCP resource data to CreateTagDto
      const createTagDto: CreateTagDto = {
        name: data.properties.name,
        color: data.properties.color,
        description: data.properties.description,
        isGoal: data.properties.isGoal,
      };

      // Create the tag
      const tag = await this.tagsService.createTag(createTagDto);

      // Map the created tag to a resource instance
      return this.mapTagToResource(tag);
    } catch (error) {
      throw new BadRequestException(`Failed to create tag: ${error.message}`);
    }
  }

  /**
   * Transform Project entity to MCP Resource schema
   */
  private getProjectResourceSchema(): Resource {
    const projectTypeOptions = Object.values(ProjectType);

    const properties: Record<string, PropertyDefinition> = {
      id: {
        type: 'string',
        description: 'The unique identifier of the project',
        required: true,
      },
      name: {
        type: 'string',
        description: 'The name of the project',
        required: true,
      },
      description: {
        type: 'string',
        description: 'Detailed description of the project',
        nullable: true,
      },
      type: {
        type: 'string',
        description: 'Type of project (inbox, regular, archive)',
        enum: projectTypeOptions,
        default: ProjectType.REGULAR,
      },
      color: {
        type: 'string',
        description: 'The color of the project in hex format (e.g., #FF0000)',
        nullable: true,
      },
      isArchived: {
        type: 'boolean',
        description: 'Whether the project is archived',
        default: false,
      },
      isSystem: {
        type: 'boolean',
        description: 'Whether this is a system project that cannot be deleted',
        default: false,
      },
      order: {
        type: 'number',
        description: 'Order position of the project',
        default: 0,
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the project was created',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the project was last updated',
      },
    };

    return {
      type: 'project',
      title: 'Project',
      description: 'A project that can contain tasks',
      properties,
      relationships: {
        parent: {
          resourceType: 'project',
          cardinality: 'one',
          description: 'The parent project, if this is a sub-project',
          required: false,
        },
        children: {
          resourceType: 'project',
          cardinality: 'many',
          description: 'Child sub-projects of this project',
        },
        tasks: {
          resourceType: 'task',
          cardinality: 'many',
          description: 'Tasks within this project',
        },
      },
    };
  }

  /**
   * Transform Project entity to MCP Resource instance
   */
  private mapProjectToResource(project: Project): ResourceInstance {
    // Validate required properties
    if (!project.id) {
      throw new Error('Project ID is required');
    }

    if (!project.name) {
      throw new Error('Project name is required');
    }

    const resourceInstance: ResourceInstance = {
      id: project.id,
      type: 'project',
      properties: {
        name: project.name,
        description: project.description,
        type: project.type,
        color: project.color,
        isArchived: project.isArchived,
        isSystem: project.isSystem,
        order: project.order,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      relationships: {},
    };

    // Add parent relationship if exists
    if (project.parent) {
      resourceInstance.relationships.parent = {
        data: {
          id: project.parent.id,
          type: 'project',
        },
      };
    }

    // Add children relationships if exist
    if (project.children && project.children.length > 0) {
      resourceInstance.relationships.children = {
        data: project.children.map((child) => ({
          id: child.id,
          type: 'project',
        })),
      };
    }

    // Add tasks relationships if exist
    if (project.tasks && project.tasks.length > 0) {
      resourceInstance.relationships.tasks = {
        data: project.tasks.map((task) => ({
          id: task.id,
          type: 'task',
        })),
      };
    }

    return resourceInstance;
  }

  /**
   * Get project resources with filtering
   */
  private async getProjectResources(
    params: ResourceQueryParams,
  ): Promise<ResourceInstance[]> {
    // Convert MCP query params to our project filter params
    const filterDto = {
      search: params.filter?.search,
      includeArchived: params.filter?.includeArchived === 'true',
      // Set includeSystem to true explicitly if not specified
      includeSystem:
        params.filter?.includeSystem === 'true' ||
        params.filter?.includeSystem === undefined
          ? true
          : false,
      parentId: params.filter?.parentId,
    };

    console.log('MCP getProjectResources filter:', filterDto);

    const projects = await this.projectsService.getProjects(filterDto);

    // Map projects to resources
    return projects
      .map((project) => {
        try {
          return this.mapProjectToResource(project);
        } catch (error) {
          console.error(
            `Error mapping project ${project.id}: ${error.message}`,
          );
          return null;
        }
      })
      .filter((resource) => resource !== null);
  }

  /**
   * Get a specific project by ID
   */
  private async getProjectResource(id: string): Promise<ResourceInstance> {
    const project = await this.projectsService.getProjectById(id);

    try {
      return this.mapProjectToResource(project);
    } catch (error) {
      throw new Error(
        `Project with ID ${id} does not meet required criteria: ${error.message}`,
      );
    }
  }

  /**
   * Create a new project resource
   */
  private async createProjectResource(data: any): Promise<ResourceInstance> {
    try {
      // Convert MCP resource data to CreateProjectDto
      const createProjectDto: CreateProjectDto = {
        name: data.properties.name,
        description: data.properties.description,
        color: data.properties.color,
      };

      // Handle parent relationship
      if (data.relationships?.parent?.data?.id) {
        createProjectDto.parentId = data.relationships.parent.data.id;
      }

      // Create the project
      const project =
        await this.projectsService.createProject(createProjectDto);

      // Map the created project to a resource instance
      return this.mapProjectToResource(project);
    } catch (error) {
      throw new BadRequestException(
        `Failed to create project: ${error.message}`,
      );
    }
  }

  // Implementation for getting related resources
  private async _getRelatedResources(
    resourceType: string,
    resource: ResourceInstance,
    relations: string[],
  ): Promise<ResourceInstance[]> {
    const included: ResourceInstance[] = [];

    for (const relation of relations) {
      // Skip if the resource doesn't have this relationship
      if (!resource.relationships?.[relation]?.data) {
        continue;
      }

      const relData = resource.relationships[relation].data;

      // Handle to-one relationships
      if (!Array.isArray(relData) && relData?.id && relData?.type) {
        try {
          const relatedResource = await this._getResourceById(
            relData.type,
            relData.id,
          );
          included.push(relatedResource);
        } catch (error) {
          // Ignore errors for related resources that can't be found
        }
      }

      // Handle to-many relationships
      else if (Array.isArray(relData)) {
        for (const item of relData) {
          if (item?.id && item?.type) {
            try {
              const relatedResource = await this._getResourceById(
                item.type,
                item.id,
              );
              included.push(relatedResource);
            } catch (error) {
              // Ignore errors for related resources that can't be found
            }
          }
        }
      }
    }

    return included;
  }

  // Helper to get a resource by ID
  private async _getResourceById(
    resourceType: string,
    id: string,
  ): Promise<ResourceInstance> {
    switch (resourceType.toLowerCase()) {
      case 'task':
        return this.getTaskResource(id);
      case 'tag':
        return this.getTagResource(id);
      case 'project':
        return this.getProjectResource(id);
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  // Helper for getting resources with filters
  private async _getResourcesInternal(
    resourceType: string,
    params: ResourceQueryParams,
  ): Promise<ResourceInstance[]> {
    switch (resourceType.toLowerCase()) {
      case 'task':
        return this.getTaskResources(params);
      case 'tag':
        return this.getTagResources(params);
      case 'project':
        return this.getProjectResources(params);
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  // Helper for creating resources
  private async _createResourceInternal(
    resourceType: string,
    data: any,
  ): Promise<ResourceInstance> {
    switch (resourceType.toLowerCase()) {
      case 'task':
        return this.createTaskResource(data);
      case 'tag':
        return this.createTagResource(data);
      case 'project':
        return this.createProjectResource(data);
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  // Helper for getting available actions
  private _getAvailableActions(): Action[] {
    return [
      this.getCreateTaskFromNLPActionDefinition(),
      this.getParseTaskActionDefinition(),
      this.getExtractEntitiesActionDefinition(),
      this.getUnderstandQueryActionDefinition(),
    ];
  }

  /**
   * Get the definition for the parseTask action
   */
  private getParseTaskActionDefinition(): Action {
    return {
      name: 'parseTask',
      description: 'Parses natural language text into task data',
      parameters: {
        text: {
          type: 'string',
          description: 'Natural language text to parse',
          required: true,
        },
        confidenceThreshold: {
          type: 'number',
          description:
            'Minimum confidence threshold for returned results (0-1)',
          required: false,
        },
        context: {
          type: 'object',
          description: 'Additional context to improve NLP processing',
          required: false,
        },
        parseRecurrence: {
          type: 'boolean',
          description: 'Whether to process recurrence information',
          required: false,
        },
        defaultProjectId: {
          type: 'string',
          description: 'Project ID to associate with the task by default',
          required: false,
        },
      },
      returns: {
        type: 'object',
        description: 'Parsed task details, extracted entities, and metadata',
      },
    };
  }

  /**
   * Execute the parseTask action
   */
  private async executeParseTask(
    request: ActionExecutionRequest,
  ): Promise<ActionExecutionResponse> {
    // Validate parameters
    if (
      !request.parameters.text ||
      typeof request.parameters.text !== 'string'
    ) {
      throw new BadRequestException(
        'Text parameter must be a non-empty string',
      );
    }

    // Transform MCP request to NLP service request
    const nlpRequest: NaturalLanguageRequest = {
      command: request.parameters.text,
      context: {
        confidenceThreshold: request.parameters.confidenceThreshold,
        parseRecurrence: request.parameters.parseRecurrence,
        defaultProjectId: request.parameters.defaultProjectId,
        ...request.parameters.context,
      },
    };

    try {
      // Call the existing AI service
      const result = await this.aiService.processNaturalLanguage(nlpRequest);

      // Transform the result to match the expected MCP action response format
      return {
        data: {
          success: true,
          result: {
            request_id: result.task_id,
            parsed_task: {
              title: result.analysis.title,
              description: result.analysis.description || '',
              due_date: result.analysis.due_date,
              priority: result.analysis.priority || 'medium',
              estimated_duration_minutes: result.time_estimate || 30,
            },
            extracted_entities: {
              projects: result.analysis.project_id
                ? [
                    {
                      name: result.analysis.project_id,
                      confidence: 0.9,
                    },
                  ]
                : [],
              tags: (result.analysis.tags || []).map((tag) => ({
                name: tag,
                confidence: 0.9,
              })),
              dates: result.analysis.due_date
                ? [
                    {
                      value: result.analysis.due_date,
                      type: 'due_date',
                      confidence: 0.9,
                    },
                  ]
                : [],
            },
            alternatives: [],
            meta: {
              processing_time_ms: 0, // Not available from the AI service
              model_version: '1.0.0',
              tokens_used: result.tokens_used.total_tokens,
            },
          },
          meta: {
            processing_time_ms: 0,
            model_version: '1.0.0',
            tokens_used: result.tokens_used.total_tokens,
          },
        },
      };
    } catch (error) {
      if (
        error.message?.includes('Failed to process natural language request') ||
        error.status === HttpStatus.SERVICE_UNAVAILABLE
      ) {
        throw new BadRequestException(
          'AI service is currently unavailable. Please try again later.',
        );
      }
      throw new BadRequestException(`Failed to parse task: ${error.message}`);
    }
  }

  /**
   * Get the definition for the understandQuery action
   */
  private getUnderstandQueryActionDefinition(): Action {
    return {
      name: 'understandQuery',
      description: 'Analyzes and understands a natural language query',
      parameters: {
        text: {
          type: 'string',
          description: 'Natural language query to understand',
          required: true,
        },
        maxSuggestions: {
          type: 'number',
          description: 'Maximum number of suggestions to return',
          required: false,
        },
        confidenceThreshold: {
          type: 'number',
          description:
            'Minimum confidence threshold for returned results (0-1)',
          required: false,
        },
        context: {
          type: 'object',
          description: 'Additional context to improve NLP processing',
          required: false,
        },
      },
      returns: {
        type: 'object',
        description: 'Query understanding details, suggestions, and metadata',
      },
    };
  }

  /**
   * Execute the understandQuery action
   */
  private async executeUnderstandQuery(
    request: ActionExecutionRequest,
  ): Promise<ActionExecutionResponse> {
    // Validate parameters
    if (
      !request.parameters.text ||
      typeof request.parameters.text !== 'string'
    ) {
      throw new BadRequestException(
        'Text parameter must be a non-empty string',
      );
    }

    // Transform MCP request to NLP service request
    const nlpRequest: NaturalLanguageRequest = {
      command: request.parameters.text,
      context: {
        confidenceThreshold: request.parameters.confidenceThreshold,
        maxSuggestions: request.parameters.maxSuggestions,
        ...request.parameters.context,
      },
    };

    try {
      // Call the existing AI service
      const result = await this.aiService.processNaturalLanguage(nlpRequest);

      // Transform the result to match the expected MCP action response format for query understanding
      return {
        data: {
          success: true,
          result: {
            request_id: result.task_id,
            understood_query: {
              intent: 'find_tasks', // Default intent since AI service doesn't provide this
              confidence: 0.8,
              parameters: {
                project: result.analysis.project_id,
                priority: result.analysis.priority,
                due_date: result.analysis.due_date,
                tags: result.analysis.tags,
              },
            },
            clarification_needed: false,
            suggested_tasks: [], // Would need task service to provide actual suggestions
            meta: {
              processing_time_ms: 0, // Not available from the AI service
              model_version: '1.0.0',
              tokens_used: result.tokens_used.total_tokens,
            },
          },
          meta: {
            processing_time_ms: 0,
            model_version: '1.0.0',
            tokens_used: result.tokens_used.total_tokens,
          },
        },
      };
    } catch (error) {
      if (
        error.message?.includes('Failed to process natural language request') ||
        error.status === HttpStatus.SERVICE_UNAVAILABLE
      ) {
        throw new BadRequestException(
          'AI service is currently unavailable. Please try again later.',
        );
      }
      throw new BadRequestException(
        `Failed to understand query: ${error.message}`,
      );
    }
  }

  /**
   * Get the definition for the extractEntities action
   */
  private getExtractEntitiesActionDefinition(): Action {
    return {
      name: 'extractEntities',
      description: 'Extracts entities from natural language text',
      parameters: {
        text: {
          type: 'string',
          description: 'Natural language text to analyze',
          required: true,
        },
        entityTypes: {
          type: 'array',
          description:
            'Types of entities to extract (e.g., date, project, tag, priority)',
          required: false,
        },
        confidenceThreshold: {
          type: 'number',
          description:
            'Minimum confidence threshold for returned results (0-1)',
          required: false,
        },
        context: {
          type: 'object',
          description: 'Additional context to improve NLP processing',
          required: false,
        },
      },
      returns: {
        type: 'object',
        description: 'Extracted entities and metadata',
      },
    };
  }

  /**
   * Execute the extractEntities action
   */
  private async executeExtractEntities(
    request: ActionExecutionRequest,
  ): Promise<ActionExecutionResponse> {
    // Validate parameters
    if (
      !request.parameters.text ||
      typeof request.parameters.text !== 'string'
    ) {
      throw new BadRequestException(
        'Text parameter must be a non-empty string',
      );
    }

    // Transform MCP request to NLP service request
    const nlpRequest: NaturalLanguageRequest = {
      command: request.parameters.text,
      context: {
        confidenceThreshold: request.parameters.confidenceThreshold,
        entityTypes: request.parameters.entityTypes,
        ...request.parameters.context,
      },
    };

    try {
      // Call the existing AI service
      const result = await this.aiService.processNaturalLanguage(nlpRequest);

      // Transform the result to match the expected MCP action response format for entity extraction
      return {
        data: {
          success: true,
          result: {
            request_id: result.task_id,
            entities: {
              projects: result.analysis.project_id
                ? [
                    {
                      name: result.analysis.project_id,
                      confidence: 0.9,
                    },
                  ]
                : [],
              tags: (result.analysis.tags || []).map((tag) => ({
                name: tag,
                confidence: 0.9,
              })),
              dates: result.analysis.due_date
                ? [
                    {
                      value: result.analysis.due_date,
                      type: 'due_date',
                      confidence: 0.9,
                    },
                  ]
                : [],
            },
            meta: {
              processing_time_ms: 0, // Not available from the AI service
              model_version: '1.0.0',
              tokens_used: result.tokens_used.total_tokens,
            },
          },
          meta: {
            processing_time_ms: 0,
            model_version: '1.0.0',
            tokens_used: result.tokens_used.total_tokens,
          },
        },
      };
    } catch (error) {
      if (
        error.message?.includes('Failed to process natural language request') ||
        error.status === HttpStatus.SERVICE_UNAVAILABLE
      ) {
        throw new BadRequestException(
          'AI service is currently unavailable. Please try again later.',
        );
      }
      throw new BadRequestException(
        `Failed to extract entities: ${error.message}`,
      );
    }
  }
}
