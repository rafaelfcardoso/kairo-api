// src/focus-sessions/focus-sessions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { FocusSessionsRepository } from './focus-sessions.repository';
import {
  CreateFocusSessionDto,
  UpdateFocusSessionDto,
  CompleteFocusSessionDto,
  GetFocusSessionsHistoryDto,
  FocusSessionResponseDto,
} from './focus-sessions.dto';
import { FocusSession, EnergyLevel } from './focus-sessions.entity';

@Injectable()
export class FocusSessionsService {
  constructor(
    private readonly focusSessionsRepository: FocusSessionsRepository,
  ) {}

  async findAll(
    filters?: GetFocusSessionsHistoryDto,
  ): Promise<FocusSessionResponseDto[]> {
    const sessions = await this.focusSessionsRepository.findAll(filters);
    return this.mapToResponseDto(sessions);
  }

  async findOne(id: string): Promise<FocusSessionResponseDto> {
    const session = await this.focusSessionsRepository.findOne(id);

    if (!session) {
      throw new NotFoundException(`Focus session with ID ${id} not found`);
    }

    return this.mapToResponseDto([session])[0];
  }

  async create(
    createFocusSessionDto: CreateFocusSessionDto,
  ): Promise<FocusSessionResponseDto> {
    const session = await this.focusSessionsRepository.create(
      createFocusSessionDto,
    );
    return this.mapToResponseDto([session])[0];
  }

  async update(
    id: string,
    updateFocusSessionDto: UpdateFocusSessionDto,
  ): Promise<FocusSessionResponseDto> {
    const existingSession = await this.focusSessionsRepository.findOne(id);

    if (!existingSession) {
      throw new NotFoundException(`Focus session with ID ${id} not found`);
    }

    const updatedSession = await this.focusSessionsRepository.update(
      id,
      updateFocusSessionDto,
    );

    return this.mapToResponseDto([updatedSession])[0];
  }

  async complete(
    id: string,
    completeFocusSessionDto: CompleteFocusSessionDto,
  ): Promise<FocusSessionResponseDto> {
    const { endTime, energyLevel, wasSuccessful, notes } =
      completeFocusSessionDto;

    const existingSession = await this.focusSessionsRepository.findOne(id);

    if (!existingSession) {
      throw new NotFoundException(`Focus session with ID ${id} not found`);
    }

    const completedSession = await this.focusSessionsRepository.complete(
      id,
      endTime,
      energyLevel,
      wasSuccessful,
      notes,
    );

    return this.mapToResponseDto([completedSession])[0];
  }

  async remove(id: string): Promise<void> {
    const existingSession = await this.focusSessionsRepository.findOne(id);

    if (!existingSession) {
      throw new NotFoundException(`Focus session with ID ${id} not found`);
    }

    await this.focusSessionsRepository.remove(id);
  }

  async getSessionStats(
    startDate?: Date,
    endDate?: Date,
    projectId?: string,
  ): Promise<{
    totalSessions: number;
    totalMinutes: number;
    successfulSessions: number;
    successRate: number;
    averageDuration: number;
    energyLevelDistribution: {
      low: number;
      medium: number;
      high: number;
    };
    projectDistribution?: Record<string, { name: string; minutes: number }>;
  }> {
    const stats = await this.focusSessionsRepository.getSessionStats(
      startDate,
      endDate,
      projectId,
    );

    return {
      totalSessions: stats.totalSessions,
      totalMinutes: stats.totalMinutes,
      successfulSessions: stats.successfulSessions,
      successRate:
        stats.totalSessions > 0
          ? (stats.successfulSessions / stats.totalSessions) * 100
          : 0,
      averageDuration: stats.averageDuration,
      energyLevelDistribution: {
        low: stats.energyLevelDistribution[EnergyLevel.LOW],
        medium: stats.energyLevelDistribution[EnergyLevel.MEDIUM],
        high: stats.energyLevelDistribution[EnergyLevel.HIGH],
      },
      ...(stats.projectDistribution
        ? { projectDistribution: stats.projectDistribution }
        : {}),
    };
  }

  // Helper method to transform entities to DTOs
  private mapToResponseDto(
    sessions: FocusSession[],
  ): FocusSessionResponseDto[] {
    return sessions.map((session) => {
      const responseDto = new FocusSessionResponseDto();
      responseDto.id = session.id;
      responseDto.startTime = session.startTime;
      responseDto.endTime = session.endTime;
      responseDto.durationMinutes = session.durationMinutes;
      responseDto.energyLevel = session.energyLevel;
      responseDto.wasSuccessful = session.wasSuccessful;
      responseDto.notes = session.notes;
      responseDto.createdAt = session.createdAt;
      responseDto.projectId = session.projectId;

      // Map related tasks to simpler objects
      responseDto.tasks = session.tasks
        ? session.tasks.map((task) => ({
            id: task.id,
            title: task.title,
          }))
        : [];

      // Map project to a simpler object if it exists
      if (session.project) {
        responseDto.project = {
          id: session.project.id,
          name: session.project.name,
        };
      }

      return responseDto;
    });
  }
}
