// src/dto/project.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

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