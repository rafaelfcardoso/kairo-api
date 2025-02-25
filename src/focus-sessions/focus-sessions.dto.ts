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

  @ApiProperty({
    example: '2023-04-15T14:30:00Z',
    description: 'When the focus session was created',
  })
  createdAt: Date;
}

// DTO for querying focus sessions history with filters
export class GetFocusSessionsHistoryDto {
  @ApiPropertyOptional({
    description: 'Filter by start date (range start)',
    example: '2023-04-01T00:00:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by end date (range end)',
    example: '2023-04-30T23:59:59Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by specific task ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  taskId?: string;

  @ApiPropertyOptional({
    description: 'Filter by success status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  wasSuccessful?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by energy level',
    enum: EnergyLevel,
    example: EnergyLevel.HIGH,
  })
  @IsOptional()
  @IsEnum(EnergyLevel)
  energyLevel?: EnergyLevel;
}
