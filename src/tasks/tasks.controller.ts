// src/controllers/task.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TaskService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskFilterDto } from './tasks.dto';
import { Task, TaskStatus, TaskPriority } from './tasks.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { ParseUUIDArrayPipe } from './pipes/parse-uuid-array.pipe';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { SanitizePipe } from '../common/pipes/sanitize.pipe';
import { Request } from 'express';
import {
  AiService,
  NaturalLanguageRequest,
} from '../common/services/ai.service';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { Logger } from '@nestjs/common';
import { format, parseISO, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/**
 * DTO for natural language task creation
 */
class NaturalLanguageTaskDto implements NaturalLanguageRequest {
  @ApiProperty({
    description: 'Natural language command to create a task',
    example: 'Remind me to call Mom every Sunday at 2 PM',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  command: string;

  @ApiProperty({
    description:
      'Additional context for the AI to use when processing the command',
    required: false,
    example: { timezone: 'America/New_York' },
  })
  @IsOptional()
  context?: Record<string, any>;
}

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(RateLimitGuard)
export class TaskController {
  private readonly logger = new Logger(TaskController.name);

  constructor(
    private taskService: TaskService,
    private aiService: AiService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TaskStatus,
    description: 'Filter tasks by status',
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description: 'Include archived tasks in the results',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: TaskPriority,
    description: 'Filter tasks by priority',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter tasks by project ID',
  })
  @ApiQuery({
    name: 'tagIds',
    required: false,
    type: [String],
    description: 'Filter tasks by tag IDs',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter tasks by title or description',
  })
  @ApiQuery({
    name: 'dueDate',
    required: false,
    type: String,
    description: 'Filter tasks by due date (YYYY-MM-DD format)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved tasks successfully',
    type: [Task],
  })
  async getTasks(
    @Query(
      new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    )
    filterDto: TaskFilterDto,
  ): Promise<Task[]> {
    return this.taskService.getTasks(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved task successfully',
    type: Task,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  async getTaskById(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.taskService.getTaskById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Task created successfully',
    type: Task,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input',
  })
  async createTask(
    @Body(new ValidationPipe(), new SanitizePipe())
    createTaskDto: CreateTaskDto,
    @Req() request: Request,
  ): Promise<Task> {
    return this.taskService.createTask(createTaskDto, request.ip);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a task',
    description:
      'Update any task properties including title, description, status, priority, project assignment, due date, etc.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Task ID' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task updated successfully',
    type: Task,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe(), new SanitizePipe())
    updateTaskDto: UpdateTaskDto,
    @Req() request: Request,
  ): Promise<Task> {
    return this.taskService.updateTask(id, updateTaskDto, request.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'id', type: 'string', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Task deleted successfully',
  })
  async deleteTask(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.taskService.deleteTask(id);
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive a task' })
  @ApiParam({ name: 'id', type: 'string', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task archived successfully',
    type: Task,
  })
  async archiveTask(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.taskService.archiveTask(id);
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Add tags to task' })
  @ApiParam({ name: 'id', type: 'string', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tags added successfully',
    type: Task,
  })
  async addTags(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('tagIds', ParseUUIDArrayPipe) tagIds: string[],
  ): Promise<Task> {
    return this.taskService.addTags(id, tagIds);
  }

  @Delete(':id/tags')
  @ApiOperation({ summary: 'Remove tags from task' })
  @ApiParam({ name: 'id', type: 'string', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tags removed successfully',
    type: Task,
  })
  async removeTags(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('tagIds', ParseUUIDArrayPipe) tagIds: string[],
  ): Promise<Task> {
    return this.taskService.removeTags(id, tagIds);
  }

  @Get('views/today')
  @ApiOperation({ summary: "Get today's tasks" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Retrieved today's tasks successfully",
    type: [Task],
  })
  async getTodayTasks(): Promise<Task[]> {
    return this.taskService.getTodayTasks();
  }

  @Get('views/overdue')
  @ApiOperation({ summary: 'Get overdue tasks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved overdue tasks successfully',
    type: [Task],
  })
  async getOverdueTasks(): Promise<Task[]> {
    return this.taskService.getOverdueTasks();
  }

  @Get('views/upcoming')
  @ApiOperation({ summary: 'Get upcoming tasks' })
  @ApiQuery({
    name: 'days',
    type: 'number',
    required: false,
    description: 'Number of days to look ahead',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved upcoming tasks successfully',
    type: [Task],
  })
  async getUpcomingTasks(@Query('days') days: number): Promise<Task[]> {
    return this.taskService.getUpcomingTasks(days);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved task statistics successfully',
  })
  async getTaskStats() {
    return this.taskService.getTaskStats();
  }

  @Get('stats/by-priority')
  @ApiOperation({ summary: 'Get tasks grouped by priority' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved priority statistics successfully',
  })
  async getTasksByPriority(): Promise<Record<TaskPriority, number>> {
    return this.taskService.getTasksByPriority();
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a task' })
  @ApiParam({ name: 'id', type: 'string', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Task duplicated successfully',
    type: Task,
  })
  async duplicateTask(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.taskService.duplicateTask(id);
  }

  @Post('support/assign-orphaned-to-inbox')
  @ApiOperation({
    summary: 'Assign all tasks without a project to the Inbox project',
    description:
      'Support operation to fix tasks that were not properly assigned to the Inbox project. Returns details about how many tasks were orphaned and fixed.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tasks assigned successfully',
    schema: {
      type: 'object',
      properties: {
        tasksAssigned: {
          type: 'number',
          description: 'Number of orphaned tasks that were assigned to Inbox',
          example: 5,
        },
        inboxProjectId: {
          type: 'string',
          description: 'ID of the Inbox project where tasks were assigned',
          example: '569c363f-1934-4e69-b324-6c2fad28bc59',
        },
        summary: {
          type: 'string',
          description: 'Human-readable summary of the operation',
          example:
            'Found and fixed 5 tasks that were not assigned to any project',
        },
        tasks: {
          type: 'array',
          items: { $ref: '#/components/schemas/Task' },
          description:
            'List of tasks that were updated with their new project assignment',
        },
      },
    },
  })
  async assignOrphanedTasksToInbox() {
    return this.taskService.assignOrphanedTasksToInbox();
  }

  @Post('natural-language')
  @ApiOperation({
    summary: 'Create a task using natural language',
    description:
      'Process a natural language command and create a task based on the AI interpretation. ' +
      'Can handle commands like "Create a task to review project proposal by next Friday" or ' +
      '"Remind me to call Mom every Sunday at 2 PM".',
  })
  @ApiBody({ type: NaturalLanguageTaskDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Task created successfully from natural language',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or could not interpret command',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AI service unavailable',
  })
  async createTaskFromNaturalLanguage(
    @Body() naturalLanguageDto: NaturalLanguageRequest,
    @Req() request: Request,
  ): Promise<any> {
    // Process the natural language input
    const aiResponse =
      await this.aiService.processNaturalLanguage(naturalLanguageDto);

    this.logger.log(`AI response: ${JSON.stringify(aiResponse)}`);

    // Check if the warning about past date is accurate based on timezone
    if (
      aiResponse.analysis.is_past_date &&
      aiResponse.analysis.due_date &&
      naturalLanguageDto.context?.timezone
    ) {
      try {
        const timezone = naturalLanguageDto.context.timezone;
        this.logger.log(`Checking timezone: ${timezone}`);

        // Extract the time from the command
        const commandLower = naturalLanguageDto.command.toLowerCase();
        this.logger.log(`Command: ${commandLower}`);

        // Check if the command contains a time reference like "8 PM" or "8:00 PM"
        const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
        const timeMatch = commandLower.match(timeRegex);

        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const isPM = timeMatch[3].toLowerCase() === 'pm';

          // Convert to 24-hour format
          let hour24 = hour;
          if (isPM && hour < 12) hour24 += 12;
          if (!isPM && hour === 12) hour24 = 0;

          this.logger.log(
            `Extracted time: ${hour24}:${minute} (${isPM ? 'PM' : 'AM'})`,
          );

          // Get current date and time in the user's timezone
          const now = new Date();
          const nowInUserTz = toZonedTime(now, timezone);
          const nowHour = nowInUserTz.getHours();
          const nowMinute = nowInUserTz.getMinutes();

          this.logger.log(`Current time in timezone: ${nowHour}:${nowMinute}`);

          // If the specified time is later today
          if (hour24 > nowHour || (hour24 === nowHour && minute > nowMinute)) {
            this.logger.log(
              `Time is in the future today. Removing past date warning.`,
            );
            delete aiResponse.analysis.warning;
            aiResponse.analysis.is_past_date = false;
          } else {
            this.logger.log(`Time is in the past today.`);
          }
        } else {
          this.logger.log(`No specific time found in command: ${commandLower}`);
        }
      } catch (error) {
        this.logger.error(`Error processing timezone: ${error.message}`);
      }
    }

    // Get the inbox project to use as default
    const inboxProject = await this.taskService.getInboxProject();

    // Create a task DTO from the parsed data
    const taskDto: CreateTaskDto = {
      title: aiResponse.analysis.title,
      description: aiResponse.analysis.description,
      priority: aiResponse.analysis.priority as TaskPriority,
      dueDate: aiResponse.analysis.due_date,
      // Convert recurrence rule string if present
      recurrenceRule: aiResponse.analysis.recurrence_rule,
      // Use the needsReminder flag for reminder functionality
      needsReminder: aiResponse.analysis.title.toLowerCase().includes('remind'),
      // Include a custom message for reminders
      reminderMessage: aiResponse.analysis.title
        .toLowerCase()
        .includes('remind')
        ? `Auto-generated reminder for: ${aiResponse.analysis.title}`
        : null,
      // Assign to the inbox project by default
      projectId: inboxProject.id,
    } as CreateTaskDto; // Use type assertion to resolve the linter error

    // Create the task in the database
    const createdTask = await this.taskService.createTask(taskDto, request.ip);

    // Update the response with the actual task ID
    aiResponse.task_id = createdTask.id;

    return aiResponse;
  }

  @Get('views/recurring')
  @ApiOperation({ summary: 'Get recurring tasks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved recurring tasks successfully',
    type: [Task],
  })
  async getRecurringTasks(): Promise<Task[]> {
    // Get all tasks that have a recurrence rule
    const filterDto = new TaskFilterDto();
    filterDto.recurring = true;
    return this.taskService.getTasks(filterDto);
  }
}
