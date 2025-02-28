// src/dto/task.dto.ts
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsString,
  IsBoolean,
  MinLength,
  Matches,
  IsISO8601,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TaskStatus, TaskPriority, TaskType } from './tasks.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Implement user authentication',
    description: 'The title of the task',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example: 'Add JWT authentication with refresh tokens',
    description: 'Detailed description of the task',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: TaskPriority,
    example: TaskPriority.NONE,
    description: 'Priority level of the task (none, low, medium, high)',
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({
    enum: TaskType,
    example: TaskType.STANDARD,
    description: 'Type of task (standard, reminder, news_update, job_listing)',
  })
  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType;

  @ApiPropertyOptional({
    example: 'FREQ=WEEKLY;BYDAY=SU;BYHOUR=14;BYMINUTE=0',
    description: 'Recurrence rule in iCalendar format for recurring tasks',
  })
  @IsString()
  @IsOptional()
  recurrenceRule?: string;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59.999Z',
    description: 'Due date of the task in ISO 8601 format with timezone',
  })
  @IsISO8601({ strict: true })
  @ValidateIf((o) => o.dueDate !== null && o.dueDate !== undefined)
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    example: '2025-01-07T23:59:59.999Z',
    description:
      'Next due date for recurring tasks in ISO 8601 format with timezone',
  })
  @IsISO8601({ strict: true })
  @ValidateIf((o) => o.nextDueDate !== null && o.nextDueDate !== undefined)
  @IsOptional()
  nextDueDate?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the task has a specific time set for the due date',
  })
  @IsBoolean()
  @IsOptional()
  hasTime?: boolean;

  @ApiPropertyOptional({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'Array of tag IDs to associate with the task',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({
    example: '569c363f-1934-4e69-b324-6c2fad28bc59',
    description:
      'Project ID to associate the task with (defaults to Inbox project)',
  })
  @IsUUID('4')
  @IsOptional()
  projectId?: string;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({
    enum: TaskStatus,
    example: TaskStatus.COMPLETED,
    description: 'New status for the task',
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;
}

export class TaskFilterDto {
  @ApiPropertyOptional({
    example: '',
    description: 'Search term to filter tasks by title or description',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: TaskStatus,
    example: TaskStatus.NOT_STARTED,
    description: 'Filter tasks by status',
    enumName: 'TaskStatus',
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: TaskType,
    example: TaskType.STANDARD,
    description: 'Filter tasks by type',
    enumName: 'TaskType',
  })
  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType;

  @ApiPropertyOptional({
    enum: TaskPriority,
    example: TaskPriority.NONE,
    description: 'Filter tasks by priority',
    enumName: 'TaskPriority',
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: false,
    description: 'Include archived tasks in the results',
  })
  @IsBoolean()
  @IsOptional()
  includeArchived?: boolean;

  @ApiPropertyOptional({
    example: '',
    description: 'Filter tasks by project ID',
  })
  @IsUUID('4')
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    example: [],
    description: 'Filter tasks by tag IDs',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({
    example: '',
    description: 'Filter tasks by due date (YYYY-MM-DD format)',
    type: String,
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dueDate must be in YYYY-MM-DD format',
  })
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter for tasks due today or in the past',
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  dueSoon?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter for recurring tasks only',
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  recurring?: boolean;
}
