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
  IsDateString,
} from 'class-validator';
import {
  TaskStatus,
  TaskPriority,
  RecurrencePattern,
  RecurrenceTimeOfDay,
} from './tasks.entity';
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

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the task needs a reminder',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  needsReminder?: boolean;

  @ApiPropertyOptional({
    example: "Don't forget to submit your report!",
    description: 'Custom message to include with the reminder',
  })
  @IsString()
  @IsOptional()
  reminderMessage?: string;

  // New fields for recurring tasks
  @ApiPropertyOptional({
    example: true,
    description: 'Whether this is a recurring task',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    enum: RecurrencePattern,
    example: RecurrencePattern.DAILY,
    description:
      'The pattern for task recurrence (daily, weekly, monthly, yearly)',
  })
  @IsEnum(RecurrencePattern, {
    message: 'recurrencePattern must be one of: daily, weekly, monthly, yearly',
  })
  @ValidateIf((o) => o.isRecurring === true)
  @IsOptional()
  recurrencePattern?: string;

  @ApiPropertyOptional({
    example: 'monday,wednesday,friday',
    description: 'Specific days for weekly recurrence',
  })
  @IsString()
  @IsOptional()
  recurrenceDays?: string;

  @ApiPropertyOptional({
    enum: RecurrenceTimeOfDay,
    example: RecurrenceTimeOfDay.MORNING,
    description: 'Time of day for the recurring task',
  })
  @IsString()
  @IsOptional()
  recurrenceTimeOfDay?: string;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Specific time for custom recurrence time',
  })
  @IsString()
  @IsOptional()
  recurrenceTime?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the parent recurring task if this is an instance',
  })
  @IsUUID('4')
  @IsOptional()
  recurringParentId?: string;
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
  @ApiProperty({ required: false, enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean;

  @ApiProperty({ required: false, enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}
