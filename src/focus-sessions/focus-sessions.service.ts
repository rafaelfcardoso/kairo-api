// src/focus-sessions/focus-sessions.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FocusSessionsRepository } from './focus-sessions.repository';
import {
  CreateFocusSessionDto,
  UpdateFocusSessionDto,
  CompleteFocusSessionDto,
  GetFocusSessionsHistoryDto,
  FocusSessionResponseDto,
} from './focus-sessions.dto';
import { FocusSession, EnergyLevel } from './focus-sessions.entity';
import { SecurityLoggerService } from '../common/services/security-logger.service';
import { User } from '../entities/user.entity';

@Injectable()
export class FocusSessionsService {
  constructor(
    private readonly focusSessionsRepository: FocusSessionsRepository,
  ) {}

  private async checkFocusSessionOwnership(
    sessionId: string,
    userId: string,
  ): Promise<FocusSession> {
    const session = await this.focusSessionsRepository.findOne(sessionId);
    if (!session) {
      throw new NotFoundException(
        `Focus session with ID ${sessionId} not found`,
      );
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('You do not own this focus session');
    }
    return session;
  }

  async findAll(
    filters: GetFocusSessionsHistoryDto,
    userId: string,
  ): Promise<FocusSessionResponseDto[]> {
    const userFilters = { ...filters, userId: userId };
    const sessions = await this.focusSessionsRepository.findAll(userFilters);
    return this.mapToResponseDto(sessions);
  }

  async findOne(id: string, userId: string): Promise<FocusSessionResponseDto> {
    const session = await this.checkFocusSessionOwnership(id, userId);
    const sessionWithRelations = await this.focusSessionsRepository.findOne(id);
    if (!sessionWithRelations) {
      throw new NotFoundException(
        `Focus session with ID ${id} not found after ownership check.`,
      );
    }
    return this.mapToResponseDto([sessionWithRelations])[0];
  }

  async create(
    createFocusSessionDto: CreateFocusSessionDto,
    userId: string,
  ): Promise<FocusSessionResponseDto> {
    const session = await this.focusSessionsRepository.create(
      createFocusSessionDto,
      userId,
    );
    return this.mapToResponseDto([session])[0];
  }

  async update(
    id: string,
    updateFocusSessionDto: UpdateFocusSessionDto,
    userId: string,
  ): Promise<FocusSessionResponseDto> {
    await this.checkFocusSessionOwnership(id, userId);

    if (updateFocusSessionDto.taskIds) {
      // TODO: Verify user owns all taskIds
    }
    if (updateFocusSessionDto.projectId !== undefined) {
      // TODO: Verify user owns projectId (or it's null)
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
    userId: string,
  ): Promise<FocusSessionResponseDto> {
    await this.checkFocusSessionOwnership(id, userId);

    const { endTime, energyLevel, wasSuccessful, notes } =
      completeFocusSessionDto;
    const completedSession = await this.focusSessionsRepository.complete(
      id,
      endTime,
      energyLevel,
      wasSuccessful,
      notes,
    );
    return this.mapToResponseDto([completedSession])[0];
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.checkFocusSessionOwnership(id, userId);
    await this.focusSessionsRepository.remove(id);
  }

  async getSessionStats(
    userId: string,
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
    if (projectId) {
      // TODO: Verify user owns projectId or it's a system project they can access
    }
    const stats = await this.focusSessionsRepository.getSessionStats(
      userId,
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

      responseDto.tasks = session.tasks
        ? session.tasks.map((task) => ({
            id: task.id,
            title: task.title,
          }))
        : [];

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
