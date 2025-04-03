import { Test, TestingModule } from '@nestjs/testing';
import { ApiMetricsService } from './api-metrics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiRequestLog, ApiMetrics } from '../entities/api-metrics.entity';
import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Repository } from 'typeorm';

// Mock request and response objects
const mockRequest = () => {
  const req = {
    path: '/api/v1/test',
    method: 'GET',
    route: { path: '/test' },
    query: { param: 'value' },
    ip: '127.0.0.1',
    user: { id: 'user123' },
    headers: {
      'user-agent': 'test-agent',
    },
  } as unknown as Request;
  return req;
};

const mockResponse = () => {
  const res = {
    statusCode: 200,
    getHeader: jest.fn().mockReturnValue('1.0'),
    setHeader: jest.fn(),
  } as unknown as Response;
  return res;
};

// Mock repositories
const mockApiRequestLogRepository = () => ({
  create: jest.fn(),
  save: jest.fn().mockResolvedValue({}),
});

const mockApiMetricsRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn().mockResolvedValue({}),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('ApiMetricsService', () => {
  let service: ApiMetricsService;
  let requestLogRepo: Repository<ApiRequestLog>;
  let metricsRepo: Repository<ApiMetrics>;
  let module: TestingModule;

  beforeEach(async () => {
    // Create a testing module with mocked dependencies
    module = await Test.createTestingModule({
      providers: [
        ApiMetricsService,
        {
          provide: getRepositoryToken(ApiRequestLog),
          useFactory: mockApiRequestLogRepository,
        },
        {
          provide: getRepositoryToken(ApiMetrics),
          useFactory: mockApiMetricsRepository,
        },
        {
          provide: Logger,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApiMetricsService>(ApiMetricsService);
    requestLogRepo = module.get<Repository<ApiRequestLog>>(
      getRepositoryToken(ApiRequestLog),
    );
    metricsRepo = module.get<Repository<ApiMetrics>>(
      getRepositoryToken(ApiMetrics),
    );

    // Restore all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Make sure pending operations are completed
    await new Promise((resolve) => setTimeout(resolve, 0));
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Close any open handles
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logApiRequest', () => {
    it('should log an API request and update metrics', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      const responseTime = 100;
      const responseSize = 1024;

      const mockRequestLog = { id: 1 };
      const mockMetrics = {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        minResponseTime: null,
        maxResponseTime: null,
      };

      jest
        .spyOn(requestLogRepo, 'create')
        .mockReturnValue(mockRequestLog as any);
      jest
        .spyOn(requestLogRepo, 'save')
        .mockResolvedValue(mockRequestLog as any);
      jest.spyOn(metricsRepo, 'findOne').mockResolvedValue(mockMetrics as any);
      jest.spyOn(metricsRepo, 'save').mockResolvedValue(mockMetrics as any);

      // Act
      await service.logApiRequest(req, res, responseTime, responseSize);

      // Assert
      expect(requestLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/test',
          method: 'GET',
          statusCode: 200,
          responseTime: 100,
          responseSize: 1024,
          userId: 'user123',
        }),
      );
      expect(requestLogRepo.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();
      const responseTime = 100;

      // Create a controlled error that will be properly caught
      const testError = new Error('Test error');
      jest.spyOn(requestLogRepo, 'create').mockImplementation(() => {
        throw testError;
      });

      const errorSpy = jest.spyOn(service['logger'], 'error');

      // Act & Assert - should not throw
      await service.logApiRequest(req, res, responseTime);

      // Ensure the error was logged
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log API request: Test error'),
        expect.any(String),
      );
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for the specified time period', async () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const endpoint = '/api/test';
      const method = 'GET';

      // Create a mock query builder with properly chained methods
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 1, endpoint, method }]),
      };

      jest
        .spyOn(metricsRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getMetrics(
        startDate,
        endDate,
        endpoint,
        method,
      );

      // Assert
      expect(metricsRepo.createQueryBuilder).toHaveBeenCalledWith('metrics');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'metrics.date >= :startDate',
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metrics.date <= :endDate',
        { endDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metrics.endpoint = :endpoint',
        { endpoint },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metrics.method = :method',
        { method },
      );
      expect(result).toEqual([{ id: 1, endpoint, method }]);
    });
  });
});
