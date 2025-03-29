import { Test, TestingModule } from '@nestjs/testing';
import { FocusSessionsController } from '../../../../src/focus-sessions/focus-sessions.controller';
import { FocusSessionsService } from '../../../../src/focus-sessions/focus-sessions.service';
import { NotFoundException } from '@nestjs/common';
import {
  CreateFocusSessionDto,
  UpdateFocusSessionDto,
  CompleteFocusSessionDto,
  FocusSessionResponseDto,
  GetFocusSessionsHistoryDto,
} from '../../../../src/focus-sessions/focus-sessions.dto';
import { EnergyLevel } from '../../../../src/focus-sessions/focus-sessions.entity';

describe('FocusSessionsController', () => {
  let controller: FocusSessionsController;
  let focusSessionsService: FocusSessionsService;

  const mockFocusSessionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    complete: jest.fn(),
    remove: jest.fn(),
    getSessionStats: jest.fn(),
  };

  const mockFocusSession: FocusSessionResponseDto = {
    id: 'test-uuid',
    startTime: new Date(),
    endTime: new Date(new Date().getTime() + 30 * 60000), // 30 minutes later
    notes: 'Test session',
    energyLevel: EnergyLevel.MEDIUM,
    durationMinutes: 30,
    wasSuccessful: true,
    tasks: [],
    projectId: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FocusSessionsController],
      providers: [
        {
          provide: FocusSessionsService,
          useValue: mockFocusSessionsService,
        },
      ],
    }).compile();

    controller = module.get<FocusSessionsController>(FocusSessionsController);
    focusSessionsService =
      module.get<FocusSessionsService>(FocusSessionsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a focus session', async () => {
      const createDto: CreateFocusSessionDto = {
        startTime: new Date(),
        endTime: new Date(new Date().getTime() + 30 * 60000),
        notes: 'Test session',
        taskIds: [],
        projectId: null,
      };

      mockFocusSessionsService.create.mockResolvedValue(mockFocusSession);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockFocusSession);
      expect(focusSessionsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all focus sessions with filters', async () => {
      const filters: GetFocusSessionsHistoryDto = {
        startDate: new Date(),
        endDate: new Date(),
        projectId: 'project-uuid',
      };

      mockFocusSessionsService.findAll.mockResolvedValue([mockFocusSession]);

      const result = await controller.findAll(filters);

      expect(result).toEqual([mockFocusSession]);
      expect(focusSessionsService.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('getStats', () => {
    it('should return focus session statistics', async () => {
      const mockStats = {
        totalSessions: 10,
        totalDuration: 300,
        averageRating: 4.5,
      };

      const startDate = new Date();
      const endDate = new Date();
      const projectId = 'project-uuid';

      mockFocusSessionsService.getSessionStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(startDate, endDate, projectId);

      expect(result).toEqual(mockStats);
      expect(focusSessionsService.getSessionStats).toHaveBeenCalledWith(
        startDate,
        endDate,
        projectId,
      );
    });
  });

  describe('findOne', () => {
    it('should return a focus session by id', async () => {
      mockFocusSessionsService.findOne.mockResolvedValue(mockFocusSession);

      const result = await controller.findOne(mockFocusSession.id);

      expect(result).toEqual(mockFocusSession);
      expect(focusSessionsService.findOne).toHaveBeenCalledWith(
        mockFocusSession.id,
      );
    });

    it('should throw NotFoundException when focus session is not found', async () => {
      const id = 'non-existent-id';
      mockFocusSessionsService.findOne.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
      expect(focusSessionsService.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a focus session', async () => {
      const updateDto: UpdateFocusSessionDto = {
        notes: 'Updated notes',
        energyLevel: EnergyLevel.HIGH,
      };

      mockFocusSessionsService.update.mockResolvedValue({
        ...mockFocusSession,
        notes: 'Updated notes',
        energyLevel: EnergyLevel.HIGH,
      });

      const result = await controller.update(mockFocusSession.id, updateDto);

      expect(result).toEqual({
        ...mockFocusSession,
        notes: 'Updated notes',
        energyLevel: EnergyLevel.HIGH,
      });
      expect(focusSessionsService.update).toHaveBeenCalledWith(
        mockFocusSession.id,
        updateDto,
      );
    });

    it('should throw NotFoundException when focus session does not exist', async () => {
      const id = 'non-existent-id';
      const updateDto: UpdateFocusSessionDto = {
        notes: 'Updated notes',
      };

      mockFocusSessionsService.update.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(focusSessionsService.update).toHaveBeenCalledWith(id, updateDto);
    });
  });

  describe('complete', () => {
    it('should complete a focus session', async () => {
      const completeDto: CompleteFocusSessionDto = {
        endTime: new Date(),
        energyLevel: EnergyLevel.MEDIUM,
        wasSuccessful: true,
        notes: 'Completed session notes',
      };

      const completedSession = {
        ...mockFocusSession,
        wasSuccessful: true,
        notes: 'Completed session notes',
      };

      mockFocusSessionsService.complete.mockResolvedValue(completedSession);

      const result = await controller.complete(
        mockFocusSession.id,
        completeDto,
      );

      expect(result).toEqual(completedSession);
      expect(focusSessionsService.complete).toHaveBeenCalledWith(
        mockFocusSession.id,
        completeDto,
      );
    });

    it('should throw NotFoundException when focus session does not exist', async () => {
      const id = 'non-existent-id';
      const completeDto: CompleteFocusSessionDto = {
        endTime: new Date(),
        energyLevel: EnergyLevel.MEDIUM,
        wasSuccessful: true,
      };

      mockFocusSessionsService.complete.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.complete(id, completeDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(focusSessionsService.complete).toHaveBeenCalledWith(
        id,
        completeDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a focus session', async () => {
      mockFocusSessionsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockFocusSession.id);

      expect(focusSessionsService.remove).toHaveBeenCalledWith(
        mockFocusSession.id,
      );
    });

    it('should throw NotFoundException when focus session does not exist', async () => {
      const id = 'non-existent-id';

      mockFocusSessionsService.remove.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
      expect(focusSessionsService.remove).toHaveBeenCalledWith(id);
    });
  });
});
