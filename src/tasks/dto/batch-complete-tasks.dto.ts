import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';
import { TaskStatus } from '../tasks.entity';

export class BatchCompleteTasksDto {
  @ApiProperty({
    description: 'Additional filters for batch completion',
    example: { taskIds: ['123e4567-e89b-12d3-a456-426614174000'] },
  })
  additionalFilters: {
    taskIds: string[];
  };

  @ApiProperty({
    description: 'Task statuses to filter by',
    example: [TaskStatus.NOT_STARTED],
    isArray: true,
    enum: TaskStatus,
  })
  @IsArray()
  @IsOptional()
  statuses?: TaskStatus[] = [TaskStatus.NOT_STARTED];
}

export class BatchCompleteTasksResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of tasks completed',
    example: 5,
  })
  tasksCompleted: number;

  @ApiProperty({
    description: 'Success message',
    example: 'Successfully completed 5 tasks',
  })
  message: string;
}
