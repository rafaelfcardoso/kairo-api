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
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { 
  CreateProjectDto, 
  UpdateProjectDto, 
  ProjectFilterDto, 
  ProjectMoveDto 
} from './projects.dto';
import { Project } from './projects.entity';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(AuthGuard())
export class ProjectsController {
  constructor(private projectService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects with optional filters' })
  @ApiQuery({ type: ProjectFilterDto, required: false })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved projects successfully',
    type: [Project]
  })
  async getProjects(@Query() filterDto: ProjectFilterDto): Promise<Project[]> {
    return this.projectService.getProjects(filterDto);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get project hierarchy as a tree' })
  @ApiQuery({ name: 'rootId', required: false, type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved project tree successfully',
    type: [Project]
  })
  async getProjectTree(@Query('rootId') rootId?: string): Promise<Project[]> {
    return this.projectService.getProjectTree(rootId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search projects' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search results',
    type: [Project]
  })
  async searchProjects(@Query('query') query: string): Promise<Project[]> {
    return this.projectService.searchProjects(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved project successfully',
    type: Project
  })
  async getProjectById(@Param('id', ParseUUIDPipe) id: string): Promise<Project> {
    return this.projectService.getProjectById(id);
  }

  @Get(':id/with-ancestors')
  @ApiOperation({ summary: 'Get project with its ancestors' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved project with ancestors',
    type: Project
  })
  async getProjectWithAncestors(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.getProjectWithAncestors(id);
  }

  @Get(':id/breadcrumb')
  @ApiOperation({ summary: 'Get project breadcrumb trail' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved project breadcrumb',
    type: [Project]
  })
  async getProjectBreadcrumb(@Param('id', ParseUUIDPipe) id: string): Promise<Project[]> {
    return this.projectService.getProjectBreadcrumb(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved project statistics'
  })
  async getProjectStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.getProjectStats(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get project timeline' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved project timeline'
  })
  async getProjectTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.getProjectTimeline(id);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Get project health status' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved project health status'
  })
  async getProjectHealth(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.calculateProjectHealth(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Project created successfully',
    type: Project
  })
  async createProject(@Body() createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectService.createProject(createProjectDto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a project' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'includeSubprojects', required: false, type: Boolean })
  @ApiQuery({ name: 'includeTasks', required: false, type: Boolean })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Project duplicated successfully',
    type: Project
  })
  async duplicateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeSubprojects') includeSubprojects?: boolean,
    @Query('includeTasks') includeTasks?: boolean,
  ): Promise<Project> {
    return this.projectService.duplicateProject(id, { includeSubprojects, includeTasks });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Project updated successfully',
    type: Project
  })
  async updateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectService.updateProject(id, updateProjectDto);
  }

  @Put('move')
  @ApiOperation({ summary: 'Move a project in the hierarchy' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Project moved successfully'
  })
  async moveProject(@Body() moveDto: ProjectMoveDto): Promise<void> {
    return this.projectService.moveProject(moveDto);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder projects' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Projects reordered successfully'
  })
  async reorderProjects(@Body() projectIds: string[]): Promise<void> {
    return this.projectService.reorderProjects(projectIds);
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive a project' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Project archived successfully',
    type: Project
  })
  async archiveProject(@Param('id', ParseUUIDPipe) id: string): Promise<Project> {
    return this.projectService.archiveProject(id);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge two projects' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Projects merged successfully',
    type: Project
  })
  async mergeProjects(
    @Body('sourceId', ParseUUIDPipe) sourceId: string,
    @Body('targetId', ParseUUIDPipe) targetId: string,
  ): Promise<Project> {
    return this.projectService.mergeProjects(sourceId, targetId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Project deleted successfully'
  })
  async deleteProject(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.projectService.deleteProject(id);
  }
}