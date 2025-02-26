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
import { Project } from '../projects/projects.entity';

@Injectable()
export class FocusSessionsRepository {
  constructor(
    @InjectRepository(FocusSession)
    private focusSessionRepository: Repository<FocusSession>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
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

    // Apply project filter if provided
    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    const query = this.focusSessionRepository
      .createQueryBuilder('focusSession')
      .leftJoinAndSelect('focusSession.tasks', 'task')
      .leftJoinAndSelect('focusSession.project', 'project')
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
      relations: ['tasks', 'project'],
    });
  }

  async create(
    createFocusSessionDto: CreateFocusSessionDto,
  ): Promise<FocusSession> {
    const { taskIds, projectId, ...focusSessionData } = createFocusSessionDto;

    const focusSession = this.focusSessionRepository.create({
      ...focusSessionData,
      projectId,
    });

    // Associate tasks if taskIds are provided
    if (taskIds && taskIds.length > 0) {
      const tasks = await this.taskRepository.findByIds(taskIds);
      focusSession.tasks = tasks;
    }

    // Associate project if projectId is provided
    if (projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });
      if (project) {
        focusSession.project = project;
      }
    }

    return this.focusSessionRepository.save(focusSession);
  }

  async update(
    id: string,
    updateFocusSessionDto: UpdateFocusSessionDto,
  ): Promise<FocusSession> {
    const { taskIds, projectId, ...updateData } = updateFocusSessionDto;

    // Update focus session data
    await this.focusSessionRepository.update(id, {
      ...updateData,
      ...(projectId !== undefined ? { projectId } : {}),
    });

    const focusSession = await this.focusSessionRepository.findOne({
      where: { id },
      relations: ['tasks', 'project'],
    });

    if (!focusSession) {
      return null;
    }

    // Handle task associations if taskIds are provided
    if (taskIds) {
      const tasks = await this.taskRepository.findByIds(taskIds);
      focusSession.tasks = tasks;
    }

    // Handle project association if projectId is provided
    if (projectId !== undefined) {
      if (projectId === null) {
        focusSession.project = null;
      } else {
        const project = await this.projectRepository.findOne({
          where: { id: projectId },
        });
        if (project) {
          focusSession.project = project;
        }
      }
    }

    return this.focusSessionRepository.save(focusSession);
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
    projectId?: string,
  ): Promise<{
    totalSessions: number;
    totalMinutes: number;
    successfulSessions: number;
    averageDuration: number;
    energyLevelDistribution: Record<EnergyLevel, number>;
    projectDistribution?: Record<string, { name: string; minutes: number }>;
  }> {
    // Query for sessions within date range
    const query = this.focusSessionRepository
      .createQueryBuilder('focusSession')
      .leftJoinAndSelect('focusSession.project', 'project');

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

    // Apply project filter if provided
    if (projectId) {
      query.andWhere(
        '(focusSession.projectId = :projectId OR EXISTS (SELECT 1 FROM focus_session_tasks_task fstt JOIN task t ON fstt.taskId = t.id WHERE fstt.focusSessionId = focusSession.id AND t.projectId = :projectId))',
        { projectId },
      );
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

    // Calculate project distribution if not filtering by a specific project
    let projectDistribution = undefined;
    if (!projectId) {
      projectDistribution = {};

      for (const session of sessions) {
        // Direct project association
        if (session.projectId && session.project) {
          const projId = session.projectId;
          if (!projectDistribution[projId]) {
            projectDistribution[projId] = {
              name: session.project.name,
              minutes: 0,
            };
          }
          projectDistribution[projId].minutes += session.durationMinutes;
        }
        // No project association (count as unassigned)
        else {
          const unassignedKey = 'unassigned';
          if (!projectDistribution[unassignedKey]) {
            projectDistribution[unassignedKey] = {
              name: 'Unassigned',
              minutes: 0,
            };
          }
          projectDistribution[unassignedKey].minutes += session.durationMinutes;
        }
      }
    }

    return {
      totalSessions,
      totalMinutes,
      successfulSessions,
      averageDuration,
      energyLevelDistribution,
      ...(projectDistribution ? { projectDistribution } : {}),
    };
  }
}
