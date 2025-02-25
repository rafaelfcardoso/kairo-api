// src/focus-sessions/focus-sessions.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { FocusSession, EnergyLevel } from './focus-sessions.entity';
import {
  CreateFocusSessionDto,
  GetFocusSessionsHistoryDto,
  UpdateFocusSessionDto,
} from './focus-sessions.dto';
import { Task } from '../tasks/tasks.entity';

@Injectable()
export class FocusSessionsRepository {
  constructor(
    @InjectRepository(FocusSession)
    private focusSessionRepository: Repository<FocusSession>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async findAll(filters?: GetFocusSessionsHistoryDto): Promise<FocusSession[]> {
    const where: FindOptionsWhere<FocusSession> = {};

    // Apply date range filters if provided
    if (filters?.startDate && filters?.endDate) {
      where.startTime = Between(filters.startDate, filters.endDate);
    } else if (filters?.startDate) {
      where.startTime = Between(filters.startDate, new Date());
    }

    // Apply energy level filter if provided
    if (filters?.energyLevel) {
      where.energyLevel = filters.energyLevel;
    }

    // Apply success status filter if provided
    if (filters?.wasSuccessful !== undefined) {
      where.wasSuccessful = filters.wasSuccessful;
    }

    const query = this.focusSessionRepository
      .createQueryBuilder('focusSession')
      .leftJoinAndSelect('focusSession.tasks', 'task')
      .where(where);

    // Apply task filter if provided
    if (filters?.taskId) {
      query.andWhere('task.id = :taskId', { taskId: filters.taskId });
    }

    return query.orderBy('focusSession.startTime', 'DESC').getMany();
  }

  async findOne(id: string): Promise<FocusSession> {
    return this.focusSessionRepository.findOne({
      where: { id },
      relations: ['tasks'],
    });
  }

  async create(
    createFocusSessionDto: CreateFocusSessionDto,
  ): Promise<FocusSession> {
    const { taskIds, ...focusSessionData } = createFocusSessionDto;

    const focusSession = this.focusSessionRepository.create(focusSessionData);

    // Associate tasks if taskIds are provided
    if (taskIds && taskIds.length > 0) {
      const tasks = await this.taskRepository.findByIds(taskIds);
      focusSession.tasks = tasks;
    }

    return this.focusSessionRepository.save(focusSession);
  }

  async update(
    id: string,
    updateFocusSessionDto: UpdateFocusSessionDto,
  ): Promise<FocusSession> {
    const { taskIds, ...updateData } = updateFocusSessionDto;

    // Update focus session data
    await this.focusSessionRepository.update(id, updateData);

    // Handle task associations if taskIds are provided
    if (taskIds) {
      const focusSession = await this.focusSessionRepository.findOne({
        where: { id },
        relations: ['tasks'],
      });

      if (focusSession) {
        const tasks = await this.taskRepository.findByIds(taskIds);
        focusSession.tasks = tasks;
        return this.focusSessionRepository.save(focusSession);
      }
    }

    return this.findOne(id);
  }

  async complete(
    id: string,
    endTime: Date,
    energyLevel: EnergyLevel,
    wasSuccessful: boolean,
    notes?: string,
  ): Promise<FocusSession> {
    const focusSession = await this.findOne(id);

    if (!focusSession) {
      return null;
    }

    // Set completion data
    focusSession.endTime = endTime;
    focusSession.energyLevel = energyLevel;
    focusSession.wasSuccessful = wasSuccessful;

    if (notes) {
      focusSession.notes = notes;
    }

    // Calculate duration in minutes
    const durationMs = endTime.getTime() - focusSession.startTime.getTime();
    focusSession.durationMinutes = Math.round(durationMs / (1000 * 60));

    return this.focusSessionRepository.save(focusSession);
  }

  async remove(id: string): Promise<void> {
    await this.focusSessionRepository.delete(id);
  }

  async getSessionStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalSessions: number;
    totalMinutes: number;
    successfulSessions: number;
    averageDuration: number;
    energyLevelDistribution: Record<EnergyLevel, number>;
  }> {
    // Query for sessions within date range
    const query =
      this.focusSessionRepository.createQueryBuilder('focusSession');

    if (startDate && endDate) {
      query.where('focusSession.startTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.where('focusSession.startTime >= :startDate', { startDate });
    } else if (endDate) {
      query.where('focusSession.startTime <= :endDate', { endDate });
    }

    const sessions = await query.getMany();

    // Calculate statistics
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce(
      (sum, session) => sum + session.durationMinutes,
      0,
    );
    const successfulSessions = sessions.filter(
      (session) => session.wasSuccessful,
    ).length;
    const averageDuration =
      totalSessions > 0 ? totalMinutes / totalSessions : 0;

    // Calculate energy level distribution
    const energyLevelDistribution = {
      [EnergyLevel.LOW]: 0,
      [EnergyLevel.MEDIUM]: 0,
      [EnergyLevel.HIGH]: 0,
    };

    sessions.forEach((session) => {
      energyLevelDistribution[session.energyLevel]++;
    });

    return {
      totalSessions,
      totalMinutes,
      successfulSessions,
      averageDuration,
      energyLevelDistribution,
    };
  }
}
