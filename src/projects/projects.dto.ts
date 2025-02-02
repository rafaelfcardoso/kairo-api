// src/dto/project.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateProjectDto {
  @ApiProperty({
    example: 'My Business',  // Set the example for the name field
    description: 'The name of the project',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'This project is focused on establishing my business.',  // Set the example for the description field
    description: 'A brief description of the project',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '#4A90E2',
    description: 'Color code in hex format (e.g., #4A90E2)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color code (e.g., #4A90E2)',
  })
  color?: string;

  @ApiProperty({
    example: null,  // Set the example for the parentId field
    description: 'The ID of the parent project if this project is a sub-project',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateProjectDto extends CreateProjectDto {
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  parentId?: string | null; // Allow null to remove parent
}

export class ProjectFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean = false;

  @ApiProperty({
    example: false,
    description: 'Whether to include system projects in the results',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeSystem?: boolean = false;

  @IsOptional()
  @IsUUID()
  parentId?: string | null; // null means root projects only
}

export class ProjectMoveDto {
  @IsNotEmpty()
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  targetId?: string;

  @IsNotEmpty()
  @IsString()
  position: 'before' | 'after' | 'inside';
}