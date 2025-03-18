import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AbTestingService } from './ab-testing.service';
import { NlpModelPerformance } from '../entities/model-performance.entity';
import { Repository } from 'typeorm';

describe('AbTestingService', () => {
  let service: AbTestingService;
  let mockRepository: Partial<Repository<NlpModelPerformance>>;

  beforeEach(async () => {
    // Create a mock repository
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbTestingService,
        {
          provide: getRepositoryToken(NlpModelPerformance),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AbTestingService>(AbTestingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('selectModel', () => {
    it('should return a default model when no models are configured', () => {
      // Set empty models array by manipulating private property
      (service as any).modelConfigs = [];

      const result = service.selectModel();

      expect(result).toBeDefined();
      expect(result.modelId).toBe('default');
      expect(result.modelVersion).toBe('1.0.0');
      expect(result.isActive).toBe(true);
    });

    it('should return the first model when only one is configured', () => {
      // Set single model in array
      const testModel = {
        modelId: 'test-model',
        modelVersion: '2.0.0',
        description: 'Test model',
        trafficPercentage: 100,
        isActive: true,
      };

      (service as any).modelConfigs = [testModel];

      const result = service.selectModel();

      expect(result).toBe(testModel);
    });

    it('should return a consistent model for the same user ID', () => {
      const userId = 'test-user-123';

      // Call selectModel multiple times with same userId
      const result1 = service.selectModel(userId);
      const result2 = service.selectModel(userId);

      expect(result1).toEqual(result2);
    });
  });

  describe('recordModelPerformance', () => {
    it('should save model performance metrics', async () => {
      const performanceData = {
        modelId: 'test-model',
        modelVersion: '1.0.0',
        operationType: 'task_parsing',
        requestId: 'req-123',
        confidenceScore: 0.85,
        processingTimeMs: 120,
      };

      (mockRepository.create as jest.Mock).mockReturnValue(performanceData);
      (mockRepository.save as jest.Mock).mockResolvedValue(performanceData);

      await service.recordModelPerformance(performanceData);

      expect(mockRepository.create).toHaveBeenCalledWith(performanceData);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle errors when saving performance metrics', async () => {
      const error = new Error('Database error');
      (mockRepository.create as jest.Mock).mockReturnValue({});
      (mockRepository.save as jest.Mock).mockRejectedValue(error);

      // Spy on logger to verify error is logged
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await service.recordModelPerformance({});

      expect(loggerSpy).toHaveBeenCalled();
      expect(loggerSpy.mock.calls[0][0]).toContain(
        'Error recording model performance',
      );
    });
  });

  describe('getModelPerformanceMetrics', () => {
    it('should return model performance metrics', async () => {
      const mockMetrics = [
        {
          modelId: 'default',
          modelVersion: '1.0.0',
          requestCount: '245',
          avgConfidence: '0.87',
          avgProcessingTime: '142.5',
          helpfulCount: '180',
          unhelpfulCount: '20',
          clarificationCount: '15',
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockMetrics),
      };

      (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getModelPerformanceMetrics(7);

      expect(result).toEqual(mockMetrics);
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();
    });

    it('should filter by operation type if provided', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      await service.getModelPerformanceMetrics(7, 'task_parsing');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'performance.operationType = :operationType',
        { operationType: 'task_parsing' },
      );
    });
  });
});
