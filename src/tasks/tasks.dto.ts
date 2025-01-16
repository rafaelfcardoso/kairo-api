// src/dto/task.dto.ts
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsDate,
  IsString,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { TaskStatus, TaskPriority } from './tasks.entity';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

export class UpdateTaskDto extends CreateTaskDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

export class TaskFilterDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean = false;
}
