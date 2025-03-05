import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateScheduleDto {
  @ApiProperty({
    description: 'Start hour (0-23)',
    example: 9,
    minimum: 0,
    maximum: 23,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  startHour?: number;

  @ApiProperty({
    description: 'Start minute (0-59)',
    example: 0,
    minimum: 0,
    maximum: 59,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(59)
  @IsOptional()
  startMinute?: number;

  @ApiProperty({
    description: 'End hour (0-23)',
    example: 17,
    minimum: 0,
    maximum: 23,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  endHour?: number;

  @ApiProperty({
    description: 'End minute (0-59)',
    example: 30,
    minimum: 0,
    maximum: 59,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(59)
  @IsOptional()
  endMinute?: number;

  @ApiProperty({
    description: 'Days of the week (1-7, where 1 is Monday, 7 is Sunday)',
    example: [1, 2, 3, 4, 5],
    type: [Number],
    required: false,
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @IsOptional()
  days?: number[];

  @ApiProperty({
    description: 'Whether the schedule is active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
