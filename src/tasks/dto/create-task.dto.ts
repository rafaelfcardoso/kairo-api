import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDate,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskType } from '../tasks.entity';

export class CreateTaskDto {
  @ApiProperty({
    description: 'The title of the task',
    example: 'Complete project proposal',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'The description of the task',
    example: 'Write a detailed proposal for the new client project',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'The due date of the task',
    example: '2023-12-31T23:59:59.999Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'The type of task',
    example: 'standard',
    enum: TaskType,
    default: TaskType.STANDARD,
  })
  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType = TaskType.STANDARD;

  @ApiPropertyOptional({
    description: 'Whether the task is completed',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  done?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the task is archived',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  archived?: boolean;

  @ApiPropertyOptional({
    description: 'The recurrence rule for the task',
    example: 'FREQ=DAILY;INTERVAL=1',
  })
  @IsString()
  @IsOptional()
  recurrenceRule?: string;

  @ApiPropertyOptional({
    description: 'Whether the task needs a reminder',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  needsReminder?: boolean;

  @ApiPropertyOptional({
    description: 'Custom message to include with the reminder',
    example: "Don't forget to submit your report!",
  })
  @IsString()
  @IsOptional()
  reminderMessage?: string;
}
