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
  Logger,
  HttpException,
  UsePipes,
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ParseUUIDArrayPipe } from './pipes/parse-uuid-array.pipe';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { SanitizePipe } from '../common/pipes/sanitize.pipe';
import { Request } from 'express';
import {
  CompleteOverdueTasksDto,
  CompleteOverdueTasksResponseDto,
  BatchCompleteTasksDto,
  BatchCompleteTasksResponseDto,
} from './dto/complete-overdue-tasks.dto';
import { UserId } from '../common/decorators/user-id.decorator';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@Controller('tasks')
@UseGuards(AuthGuard('jwt'), RateLimitGuard, JwtAuthGuard)
export class TaskController {
  private readonly logger = new Logger(TaskController.name);

  constructor(private taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks for the authenticated user' })
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
    @Req() request: Request,
  ): Promise<Task[]> {
    const userId = (request.user as User).id;
    return this.taskService.getTasks(filterDto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific task by ID (owned by user)' })
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
  async getTaskById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<Task> {
    const userId = (request.user as User).id;
    return this.taskService.getTaskById(id, userId);
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
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async createTask(
    @Body(new ValidationPipe(), new SanitizePipe())
    createTaskDto: CreateTaskDto,
    @Req() request: Request,
  ): Promise<Task> {
    const userId = (request.user as User).id;
    return this.taskService.createTask(createTaskDto, userId);
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
    const userId = (request.user as User).id;
    return this.taskService.updateTask(id, updateTaskDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'id', type: 'string', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Task deleted successfully',
  })
  async deleteTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<void> {
    const userId = (request.user as User).id;
    await this.taskService.deleteTask(id, userId);
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive a task' })
  @ApiParam({ name: 'id', type: 'string', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task archived successfully',
    type: Task,
  })
  async archiveTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<Task> {
    const userId = (request.user as User).id;
    return this.taskService.archiveTask(id, userId);
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
    @Req() request: Request,
  ): Promise<Task> {
    const userId = (request.user as User).id;
    return this.taskService.addTags(id, tagIds, userId);
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
    @Req() request: Request,
  ): Promise<Task> {
    const userId = (request.user as User).id;
    return this.taskService.removeTags(id, tagIds, userId);
  }

  @Get('views/today')
  @ApiOperation({ summary: "Get today's tasks for the user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Retrieved today's tasks successfully",
    type: [Task],
  })
  async getTodayTasks(@Req() request: Request): Promise<Task[]> {
    const userId = (request.user as User).id;
    return this.taskService.getTodayTasks(userId);
  }

  @Get('views/overdue')
  @ApiOperation({ summary: 'Get overdue tasks for the user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved overdue tasks successfully',
    type: [Task],
  })
  async getOverdueTasks(@Req() request: Request): Promise<Task[]> {
    const userId = (request.user as User).id;
    return this.taskService.getOverdueTasks(userId);
  }

  @Get('views/upcoming')
  @ApiOperation({ summary: 'Get upcoming tasks for the user' })
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
  async getUpcomingTasks(
    @Query('days') days: number,
    @Req() request: Request,
  ): Promise<Task[]> {
    const userId = (request.user as User).id;
    return this.taskService.getUpcomingTasks(days, userId);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get task statistics for the user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved task statistics successfully',
  })
  async getTaskStats(@Req() request: Request) {
    const userId = (request.user as User).id;
    return this.taskService.getTaskStats(userId);
  }

  @Get('by-priority')
  @ApiOperation({ summary: 'Get user tasks grouped by priority' })
  @ApiResponse({
    status: 200,
    description: 'Tasks grouped by priority',
    type: Object,
  })
  async getTasksByPriority(@Req() request: Request) {
    const userId = (request.user as User).id;
    return this.taskService.getTasksByPriority(userId);
  }

  @Post('complete-overdue')
  @ApiOperation({ summary: 'Complete all overdue tasks' })
  @ApiResponse({
    status: 200,
    description: 'Tasks completed successfully',
    type: CompleteOverdueTasksResponseDto,
  })
  async completeOverdueTasks(
    @UserId() userId: string,
    @Body() options: CompleteOverdueTasksDto,
  ): Promise<CompleteOverdueTasksResponseDto> {
    const completedTasks = await this.taskService.completeOverdueTasks(
      userId,
      options,
    );
    return {
      success: true,
      tasksCompleted: completedTasks.length,
      message: `Completed ${completedTasks.length} overdue tasks`,
      completedTaskIds: completedTasks.map((task) => task.id),
    };
  }

  @Post('batch-complete')
  @ApiOperation({ summary: 'Complete multiple tasks at once' })
  @ApiResponse({
    status: 200,
    description: 'Tasks completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        tasksCompleted: { type: 'number', example: 5 },
        message: { type: 'string', example: 'Completed 5 tasks' },
        completedTaskIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['task-1', 'task-2'],
        },
      },
    },
  })
  async batchCompleteTasks(
    @UserId() userId: string,
    @Body() options: BatchCompleteTasksDto,
  ): Promise<BatchCompleteTasksResponseDto> {
    const completedTasks = await this.taskService.batchCompleteTasks(
      userId,
      options,
    );
    return {
      success: true,
      tasksCompleted: completedTasks.length,
      message:
        completedTasks.length > 0
          ? `Completed ${completedTasks.length} tasks`
          : 'No tasks found matching the criteria',
      completedTaskIds: completedTasks.map((task) => task.id),
    };
  }

  @Post('assign-orphaned')
  @ApiOperation({ summary: 'Assign orphaned tasks to inbox' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orphaned tasks assigned successfully',
    type: [Task],
  })
  async assignOrphanedTasksToInbox(): Promise<Task[]> {
    return this.taskService.assignOrphanedTasksToInbox();
  }

  @Get('recurring')
  @ApiOperation({ summary: 'Get recurring tasks for the user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved recurring tasks successfully',
    type: [Task],
  })
  async getRecurringTasks(@Req() request: Request): Promise<Task[]> {
    const userId = (request.user as User).id;
    const filterDto = new TaskFilterDto();
    filterDto.isRecurring = true;
    return this.taskService.getTasks(filterDto, userId);
  }
}
