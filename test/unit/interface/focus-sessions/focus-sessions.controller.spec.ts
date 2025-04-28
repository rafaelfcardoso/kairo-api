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
import { mockRequest, mockUser } from '../../../mocks/request.mock';

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

      const result = await controller.create(createDto, mockRequest);

      expect(result).toEqual(mockFocusSession);
      expect(focusSessionsService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
      );
    });
  });

  describe('findAll', () => {
    it('should return all focus sessions with filters', async () => {
      const filters: GetFocusSessionsHistoryDto = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        projectId: 'project-uuid',
      };

      mockFocusSessionsService.findAll.mockResolvedValue([mockFocusSession]);

      const result = await controller.findAll(filters, mockRequest);

      expect(result).toEqual([mockFocusSession]);
      expect(focusSessionsService.findAll).toHaveBeenCalledWith(
        filters,
        mockUser.id,
      );
    });
  });

  describe('getStats', () => {
    it('should return focus session statistics', async () => {
      const mockStats = {
        totalSessions: 10,
        totalDuration: 300,
        averageRating: 4.5,
      };

      mockFocusSessionsService.getSessionStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(
        mockRequest,
        new Date('2025-01-01'),
        new Date('2025-12-31'),
        'project-uuid',
      );

      expect(result).toEqual(mockStats);
      expect(focusSessionsService.getSessionStats).toHaveBeenCalledWith(
        mockUser.id,
        new Date('2025-01-01'),
        new Date('2025-12-31'),
        'project-uuid',
      );
    });
  });

  describe('findOne', () => {
    it('should return a focus session by id', async () => {
      mockFocusSessionsService.findOne.mockResolvedValue(mockFocusSession);

      const result = await controller.findOne('test-uuid', mockRequest);

      expect(result).toEqual(mockFocusSession);
      expect(focusSessionsService.findOne).toHaveBeenCalledWith(
        'test-uuid',
        mockUser.id,
      );
    });

    it('should throw NotFoundException when focus session is not found', async () => {
      const id = 'non-existent-id';
      mockFocusSessionsService.findOne.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.findOne(id, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
      expect(focusSessionsService.findOne).toHaveBeenCalledWith(
        id,
        mockUser.id,
      );
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

      const result = await controller.update(
        'test-uuid',
        updateDto,
        mockRequest,
      );

      expect(result).toEqual({
        ...mockFocusSession,
        notes: 'Updated notes',
        energyLevel: EnergyLevel.HIGH,
      });
      expect(focusSessionsService.update).toHaveBeenCalledWith(
        'test-uuid',
        updateDto,
        mockUser.id,
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

      await expect(
        controller.update(id, updateDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
      expect(focusSessionsService.update).toHaveBeenCalledWith(
        id,
        updateDto,
        mockUser.id,
      );
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
        ...completeDto,
      };

      mockFocusSessionsService.complete.mockResolvedValue(completedSession);

      const result = await controller.complete(
        'test-uuid',
        completeDto,
        mockRequest,
      );

      expect(result).toEqual(completedSession);
      expect(focusSessionsService.complete).toHaveBeenCalledWith(
        'test-uuid',
        completeDto,
        mockUser.id,
      );
    });
  });

  describe('remove', () => {
    it('should delete a focus session', async () => {
      await controller.remove('test-uuid', mockRequest);

      expect(focusSessionsService.remove).toHaveBeenCalledWith(
        'test-uuid',
        mockUser.id,
      );
    });
  });
});
