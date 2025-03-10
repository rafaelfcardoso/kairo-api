import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({
    description: 'Start hour (0-23)',
    example: 9,
  })
  @IsNumber()
  @Min(0)
  @Max(23)
  startHour: number;

  @ApiProperty({
    description: 'Start minute (0-59)',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  @Max(59)
  startMinute: number;

  @ApiProperty({
    description: 'End hour (0-23)',
    example: 17,
  })
  @IsNumber()
  @Min(0)
  @Max(23)
  endHour: number;

  @ApiProperty({
    description: 'End minute (0-59)',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  @Max(59)
  endMinute: number;

  @ApiProperty({
    description: 'Days of the week (1-7, where 1 is Monday, 7 is Sunday)',
    example: [1, 2, 3, 4, 5],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  days: number[];

  @ApiProperty({
    description: 'Whether the schedule is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({
    description: 'IDs of block lists to associate with this schedule',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsUUID(4, { each: true })
  @IsOptional()
  blockListIds?: string[];

  @ApiProperty({
    description:
      'IDs of individual block items to associate with this schedule',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsUUID(4, { each: true })
  @IsOptional()
  directBlockItemIds?: string[];
}
