// src/controllers/project.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilterDto,
  ProjectMoveDto,
} from './projects.dto';
import { Project } from './projects.entity';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';

@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get projects for the authenticated user' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter projects by name or description',
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description: 'Whether to include archived projects in the results',
  })
  @ApiQuery({
    name: 'includeSystem',
    required: false,
    type: Boolean,
    description: 'Whether to include system projects in the results',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: 'Filter projects by parent ID (null for root projects)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved projects successfully',
    type: [Project],
  })
  async getProjects(
    @Query(
      new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    filterDto: ProjectFilterDto,
    @Req() request: Request,
  ): Promise<Project[]> {
    const userId = (request.user as User).id;
    return this.projectService.getProjects(filterDto, userId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get user project hierarchy as a tree' })
  @ApiQuery({ name: 'rootId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved project tree successfully',
    type: [Project],
  })
  async getProjectTree(
    @Req() request: Request,
    @Query('rootId') rootId?: string,
  ): Promise<Project[]> {
    const userId = (request.user as User).id;
    return this.projectService.getProjectTree(userId, rootId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search user projects' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results',
    type: [Project],
  })
  async searchProjects(
    @Query('query') query: string,
    @Req() request: Request,
  ): Promise<Project[]> {
    const userId = (request.user as User).id;
    return this.projectService.searchProjects(query, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project by ID (owned by user)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved project successfully',
    type: Project,
  })
  async getProjectById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<Project> {
    const userId = (request.user as User).id;
    const project = await this.projectService.getProjectById(id, userId);
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }
    return project;
  }

  @Get(':id/with-ancestors')
  @ApiOperation({ summary: 'Get user project with its ancestors' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved project with ancestors',
    type: Project,
  })
  async getProjectWithAncestors(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    const userId = (request.user as User).id;
    return this.projectService.getProjectWithAncestors(id, userId);
  }

  @Get(':id/breadcrumb')
  @ApiOperation({ summary: 'Get user project breadcrumb trail' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved project breadcrumb',
    type: [Project],
  })
  async getProjectBreadcrumb(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<Project[]> {
    const userId = (request.user as User).id;
    return this.projectService.getProjectBreadcrumb(id, userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get user project statistics' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved project statistics',
  })
  async getProjectStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    const userId = (request.user as User).id;
    return this.projectService.getProjectStats(id, userId);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get user project timeline' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved project timeline',
  })
  async getProjectTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    const userId = (request.user as User).id;
    return this.projectService.getProjectTimeline(id, userId);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Get user project health status' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved project health status',
  })
  async getProjectHealth(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    const userId = (request.user as User).id;
    return this.projectService.calculateProjectHealth(id, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project created successfully',
    type: Project,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @Req() request: Request,
  ): Promise<Project> {
    const userId = (request.user as User).id;
    return this.projectService.createProject(createProjectDto, userId);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Duplicate a project' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'includeSubprojects', required: false, type: Boolean })
  @ApiQuery({ name: 'includeTasks', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project duplicated successfully',
    type: Project,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async duplicateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
    @Query('includeSubprojects') includeSubprojects?: boolean,
    @Query('includeTasks') includeTasks?: boolean,
  ): Promise<Project> {
    const userId = (request.user as User).id;
    return this.projectService.duplicateProject(id, userId, {
      includeSubprojects,
      includeTasks,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project updated successfully',
    type: Project,
  })
  async updateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Req() request: Request,
  ): Promise<Project> {
    const userId = (request.user as User).id;
    return this.projectService.updateProject(id, updateProjectDto, userId);
  }

  @Put('move')
  @ApiOperation({ summary: 'Move a project in the hierarchy' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project moved successfully',
  })
  async moveProject(
    @Body() moveDto: ProjectMoveDto,
    @Req() request: Request,
  ): Promise<void> {
    const userId = (request.user as User).id;
    return this.projectService.moveProject(moveDto, userId);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder projects' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Projects reordered successfully',
  })
  async reorderProjects(
    @Body() projectIds: string[],
    @Req() request: Request,
  ): Promise<void> {
    const userId = (request.user as User).id;
    return this.projectService.reorderProjects(projectIds, userId);
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive a project' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project archived successfully',
    type: Project,
  })
  async archiveProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<Project> {
    const userId = (request.user as User).id;
    return this.projectService.archiveProject(id, userId);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge two projects' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Projects merged successfully',
    type: Project,
  })
  async mergeProjects(
    @Body('sourceId', ParseUUIDPipe) sourceId: string,
    @Body('targetId', ParseUUIDPipe) targetId: string,
    @Req() request: Request,
  ): Promise<Project> {
    const userId = (request.user as User).id;
    return this.projectService.mergeProjects(sourceId, targetId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project (owned by user)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Project deleted successfully',
  })
  async deleteProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<void> {
    const userId = (request.user as User).id;
    return this.projectService.deleteProject(id, userId);
  }
}
