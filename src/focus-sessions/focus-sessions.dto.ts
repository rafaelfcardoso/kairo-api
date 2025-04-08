import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsUUID,
  IsDate,
  IsOptional,
  IsBoolean,
  IsString,
  IsNumber,
  IsArray,
  Min,
  ValidateIf,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnergyLevel } from './focus-sessions.entity';

export class CreateFocusSessionDto {
  @ApiProperty({
    description: 'When the focus session started',
    example: '2023-04-15T14:30:00Z',
  })
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiPropertyOptional({
    description: 'When the focus session ended',
    example: '2023-04-15T14:55:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;

  @ApiPropertyOptional({
    description: 'Duration of the focus session in minutes',
    example: 25,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Self-reported energy level during the session',
    enum: EnergyLevel,
    example: EnergyLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(EnergyLevel)
  energyLevel?: EnergyLevel;

  @ApiPropertyOptional({
    description: 'Whether the focus session was successful',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  wasSuccessful?: boolean;

  @ApiPropertyOptional({
    description: 'Notes about the focus session',
    example:
      'Had trouble focusing in the beginning but got in the zone after 10 minutes',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'IDs of tasks associated with the focus session',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds?: string[];

  @ApiPropertyOptional({
    description: 'ID of the project directly associated with the session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}

export class UpdateFocusSessionDto extends PartialType(CreateFocusSessionDto) {
  @ApiPropertyOptional({
    description: 'When the focus session ended',
    example: '2023-04-15T14:55:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;

  @ApiPropertyOptional({
    description: 'Duration automatically calculated from start and end times',
    example: 25,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMinutes?: number;
}

export class CompleteFocusSessionDto {
  @ApiProperty({
    description: 'When the focus session ended',
    example: '2023-04-15T14:55:00Z',
  })
  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @ApiProperty({
    description: 'Self-reported energy level during the session',
    enum: EnergyLevel,
    example: EnergyLevel.MEDIUM,
  })
  @IsEnum(EnergyLevel)
  energyLevel: EnergyLevel;

  @ApiProperty({
    description: 'Whether the focus session was successful',
    example: true,
  })
  @IsBoolean()
  wasSuccessful: boolean;

  @ApiPropertyOptional({
    description: 'Notes about the focus session',
    example:
      'Had trouble focusing in the beginning but got in the zone after 10 minutes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FocusSessionResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The unique identifier of the focus session',
  })
  id: string;

  @ApiProperty({
    example: '2023-04-15T14:30:00Z',
    description: 'When the focus session started',
  })
  startTime: Date;

  @ApiProperty({
    example: '2023-04-15T14:55:00Z',
    description: 'When the focus session ended',
    required: false,
  })
  endTime: Date;

  @ApiProperty({
    example: 25,
    description: 'Duration of the focus session in minutes',
  })
  durationMinutes: number;

  @ApiProperty({
    enum: EnergyLevel,
    example: EnergyLevel.MEDIUM,
    description: 'Self-reported energy level during the session',
  })
  energyLevel: EnergyLevel;

  @ApiProperty({
    example: true,
    description: 'Whether the focus session was successful',
  })
  wasSuccessful: boolean;

  @ApiProperty({
    example:
      'Had trouble focusing in the beginning but got in the zone after 10 minutes',
    description: 'Notes about the focus session',
    required: false,
  })
  notes: string;

  @ApiProperty({
    type: [Object],
    description: 'Tasks associated with the focus session',
  })
  tasks: Array<{
    id: string;
    title: string;
  }>;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the project directly associated with the session',
  })
  projectId?: string;

  @ApiPropertyOptional({
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Project Name',
    },
    description: 'The project directly associated with the session',
  })
  project?: {
    id: string;
    name: string;
  };

  @ApiProperty({
    example: '2023-04-15T14:30:00Z',
    description: 'When the focus session was created',
  })
  createdAt: Date;
}

// DTO for querying focus sessions history with filters
export class GetFocusSessionsHistoryDto {
  @ApiPropertyOptional({
    description: 'Filter sessions starting after this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter sessions starting before this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: EnergyLevel })
  @IsOptional()
  @IsEnum(EnergyLevel)
  energyLevel?: EnergyLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  wasSuccessful?: boolean;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by associated task ID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  // Add userId for internal filtering
  userId?: string;
}
