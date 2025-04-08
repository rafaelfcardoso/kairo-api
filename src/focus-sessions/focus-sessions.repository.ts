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

  async findAll(filters: GetFocusSessionsHistoryDto): Promise<FocusSession[]> {
    const where: FindOptionsWhere<FocusSession> = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters?.startDate && filters?.endDate) {
      where.startTime = Between(
        new Date(filters.startDate),
        new Date(filters.endDate),
      );
    } else if (filters?.startDate) {
      where.startTime = Between(new Date(filters.startDate), new Date());
    }

    if (filters?.energyLevel) {
      where.energyLevel = filters.energyLevel;
    }

    if (filters?.wasSuccessful !== undefined) {
      where.wasSuccessful = filters.wasSuccessful;
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    const query = this.focusSessionRepository
      .createQueryBuilder('focusSession')
      .leftJoinAndSelect('focusSession.tasks', 'task')
      .leftJoinAndSelect('focusSession.project', 'project')
      .where(where);

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
    userId: string,
  ): Promise<FocusSession> {
    const { taskIds, projectId, ...focusSessionData } = createFocusSessionDto;

    const focusSession = this.focusSessionRepository.create({
      ...focusSessionData,
      userId: userId,
      projectId,
    });

    if (taskIds && taskIds.length > 0) {
      const tasks = await this.taskRepository.findByIds(taskIds);
      focusSession.tasks = tasks;
    }

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

    if (taskIds) {
      const tasks = await this.taskRepository.findByIds(taskIds);
      focusSession.tasks = tasks;
    }

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

    focusSession.endTime = endTime;
    focusSession.energyLevel = energyLevel;
    focusSession.wasSuccessful = wasSuccessful;

    if (notes) {
      focusSession.notes = notes;
    }

    const durationMs = endTime.getTime() - focusSession.startTime.getTime();
    focusSession.durationMinutes = Math.round(durationMs / (1000 * 60));

    return this.focusSessionRepository.save(focusSession);
  }

  async remove(id: string): Promise<void> {
    await this.focusSessionRepository.delete(id);
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
    averageDuration: number;
    energyLevelDistribution: Record<EnergyLevel, number>;
    projectDistribution?: Record<string, { name: string; minutes: number }>;
  }> {
    const query = this.focusSessionRepository
      .createQueryBuilder('focusSession')
      .leftJoinAndSelect('focusSession.project', 'project')
      .where('focusSession.userId = :userId', { userId });

    if (startDate && endDate) {
      query.andWhere('focusSession.startTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere('focusSession.startTime >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('focusSession.startTime <= :endDate', { endDate });
    }

    if (projectId) {
      query.andWhere(
        '(focusSession.projectId = :projectId OR EXISTS (SELECT 1 FROM focus_session_tasks_task fstt JOIN task t ON fstt.taskId = t.id WHERE fstt.focusSessionId = focusSession.id AND t.projectId = :projectId))',
        { projectId },
      );
    }

    const sessions = await query.getMany();

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

    const energyLevelDistribution = {
      [EnergyLevel.LOW]: 0,
      [EnergyLevel.MEDIUM]: 0,
      [EnergyLevel.HIGH]: 0,
    };

    sessions.forEach((session) => {
      energyLevelDistribution[session.energyLevel]++;
    });

    let projectDistribution = undefined;
    if (!projectId) {
      projectDistribution = {};

      for (const session of sessions) {
        if (session.projectId && session.project) {
          const projId = session.projectId;
          if (!projectDistribution[projId]) {
            projectDistribution[projId] = {
              name: session.project.name,
              minutes: 0,
            };
          }
          projectDistribution[projId].minutes += session.durationMinutes;
        } else {
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
