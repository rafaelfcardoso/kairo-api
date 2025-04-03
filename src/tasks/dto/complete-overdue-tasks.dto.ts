import {
  IsOptional,
  IsObject,
  IsBoolean,
  IsArray,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../tasks.entity';

export class CompleteOverdueTasksDto {
  @ApiPropertyOptional({
    description: 'Additional filters to apply when finding overdue tasks',
    example: { projectId: '123e4567-e89b-12d3-a456-426614174000' },
  })
  @IsOptional()
  @IsObject()
  additionalFilters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether to include blocked tasks in the batch completion',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeBlockedTasks?: boolean = false;
}

export class CompleteOverdueTasksResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Number of tasks that were completed',
    example: 5,
  })
  @IsNumber()
  tasksCompleted: number;

  @ApiProperty({
    description: 'Message describing the result of the operation',
    example: 'Successfully completed 5 overdue tasks.',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'IDs of the tasks that were completed',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  completedTaskIds?: string[];
}

// New DTO for more general batch completion
export class BatchCompleteTasksDto {
  @ApiPropertyOptional({
    description: 'Additional filters to apply when finding tasks to complete',
    example: { projectId: '123e4567-e89b-12d3-a456-426614174000' },
  })
  @IsOptional()
  @IsObject()
  additionalFilters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Which task statuses to include in the batch completion',
    example: [TaskStatus.NOT_STARTED],
    default: [TaskStatus.NOT_STARTED],
    enum: TaskStatus,
    isArray: true,
  })
  @IsOptional()
  @IsEnum(TaskStatus, { each: true })
  statuses?: TaskStatus[] = [TaskStatus.NOT_STARTED];
}

// Reusing the same response DTO for both endpoints
export type BatchCompleteTasksResponseDto = CompleteOverdueTasksResponseDto;
