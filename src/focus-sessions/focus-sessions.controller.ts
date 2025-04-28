// src/focus-sessions/focus-sessions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FocusSessionsService } from './focus-sessions.service';
import {
  CreateFocusSessionDto,
  UpdateFocusSessionDto,
  CompleteFocusSessionDto,
  FocusSessionResponseDto,
  GetFocusSessionsHistoryDto,
} from './focus-sessions.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';

@ApiTags('Focus Sessions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('focus-sessions')
export class FocusSessionsController {
  constructor(private readonly focusSessionsService: FocusSessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new focus session' })
  @ApiResponse({
    status: 201,
    description: 'The focus session has been successfully created.',
    type: FocusSessionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiBody({ type: CreateFocusSessionDto })
  async create(
    @Body() createFocusSessionDto: CreateFocusSessionDto,
    @Req() request: Request,
  ): Promise<FocusSessionResponseDto> {
    const userId = (request.user as User).id;
    return this.focusSessionsService.create(createFocusSessionDto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all focus sessions with optional filters (history)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of focus sessions.',
    type: [FocusSessionResponseDto],
  })
  async findAll(
    @Query() filters: GetFocusSessionsHistoryDto,
    @Req() request: Request,
  ): Promise<FocusSessionResponseDto[]> {
    const userId = (request.user as User).id;
    return this.focusSessionsService.findAll(filters, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get focus session statistics' })
  @ApiResponse({
    status: 200,
    description: 'Focus session statistics.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: Date,
    description: 'Start date for the stats period',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: Date,
    description: 'End date for the stats period',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter stats by project ID',
  })
  async getStats(
    @Req() request: Request,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('projectId') projectId?: string,
  ) {
    const userId = (request.user as User).id;
    return this.focusSessionsService.getSessionStats(
      userId,
      startDate,
      endDate,
      projectId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific focus session by ID' })
  @ApiResponse({
    status: 200,
    description: 'The focus session.',
    type: FocusSessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Focus session not found.' })
  @ApiParam({ name: 'id', description: 'Focus session ID', type: 'string' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<FocusSessionResponseDto> {
    const userId = (request.user as User).id;
    return this.focusSessionsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a focus session' })
  @ApiResponse({
    status: 200,
    description: 'The focus session has been successfully updated.',
    type: FocusSessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Focus session not found.' })
  @ApiParam({ name: 'id', description: 'Focus session ID', type: 'string' })
  @ApiBody({ type: UpdateFocusSessionDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFocusSessionDto: UpdateFocusSessionDto,
    @Req() request: Request,
  ): Promise<FocusSessionResponseDto> {
    const userId = (request.user as User).id;
    return this.focusSessionsService.update(id, updateFocusSessionDto, userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete a focus session' })
  @ApiResponse({
    status: 200,
    description: 'The focus session has been successfully completed.',
    type: FocusSessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Focus session not found.' })
  @ApiParam({ name: 'id', description: 'Focus session ID', type: 'string' })
  @ApiBody({ type: CompleteFocusSessionDto })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() completeFocusSessionDto: CompleteFocusSessionDto,
    @Req() request: Request,
  ): Promise<FocusSessionResponseDto> {
    const userId = (request.user as User).id;
    return this.focusSessionsService.complete(
      id,
      completeFocusSessionDto,
      userId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a focus session' })
  @ApiResponse({
    status: 204,
    description: 'The focus session has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Focus session not found.' })
  @ApiParam({ name: 'id', description: 'Focus session ID', type: 'string' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<void> {
    const userId = (request.user as User).id;
    return this.focusSessionsService.remove(id, userId);
  }
}
