import { Injectable } from '@nestjs/common';
import { TaskService } from '../tasks/tasks.service';
import {
  Resource,
  ResourceInstance,
  ResourceQueryParams,
  PropertyDefinition,
} from './mcp.types';
import {
  Task,
  TaskStatus,
  TaskPriority,
  RecurrencePattern,
  RecurrenceTimeOfDay,
} from '../tasks/tasks.entity';

@Injectable()
export class McpService {
  constructor(private tasksService: TaskService) {}

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
