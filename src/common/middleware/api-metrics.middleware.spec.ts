import { Test, TestingModule } from '@nestjs/testing';
import { ApiMetricsMiddleware } from './api-metrics.middleware';
import { ApiMetricsService } from '../../api-metrics/api-metrics.service';
import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

describe('ApiMetricsMiddleware', () => {
  let middleware: ApiMetricsMiddleware;
  let metricsService: ApiMetricsService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ApiMetricsMiddleware,
        {
          provide: ApiMetricsService,
          useValue: {
            logApiRequest: jest.fn().mockResolvedValue(undefined),
          },
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

    middleware = module.get<ApiMetricsMiddleware>(ApiMetricsMiddleware);
    metricsService = module.get<ApiMetricsService>(ApiMetricsService);

    // Mock Date.now to return consistent values for testing
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Allow any microtasks to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should add API version header and call next', () => {
      // Arrange
      const req = {} as Request;
      const res = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      // Act
      middleware.use(req, res, next);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', '1.0');
      expect(next).toHaveBeenCalled();
    });

    it('should override write and end methods to track metrics', async () => {
      // Arrange
      const req = {} as Request;
      const originalWrite = jest.fn().mockReturnValue(true);
      const originalEnd = jest.fn().mockReturnValue(true);
      const res = {
        setHeader: jest.fn(),
        write: originalWrite,
        end: originalEnd,
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      // Set up spies
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // First call during middleware initialization
        .mockReturnValueOnce(1100); // Second call when res.end is called

      // Act
      middleware.use(req, res, next);

      // Assert overrides were created
      expect(res.write).not.toBe(originalWrite);
      expect(res.end).not.toBe(originalEnd);

      // Test the write method with a chunk
      const chunk = Buffer.from('test data');
      res.write(chunk);
      expect(originalWrite).toHaveBeenCalledWith(chunk);

      // Test the end method
      res.end();

      // Should restore original methods
      expect(res.write).toBe(originalWrite);
      expect(res.end).toBe(originalEnd);

      // Allow time for any promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should call logApiRequest with the right timing
      expect(metricsService.logApiRequest).toHaveBeenCalled();

      // First argument should be req, second should be res,
      // third should be responseTime (100ms)
      const args = (metricsService.logApiRequest as jest.Mock).mock.calls[0];
      expect(args[0]).toBe(req);
      expect(args[1]).toBe(res);
      expect(args[2]).toBe(100); // 1100 - 1000 = 100
    });

    it('should handle errors in logApiRequest gracefully', async () => {
      // Arrange
      const req = {} as Request;
      const res = {
        setHeader: jest.fn(),
        write: jest.fn().mockReturnValue(true),
        end: jest.fn().mockReturnValue(true),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      // Make the service throw an error
      const testError = new Error('Test error');
      jest.spyOn(metricsService, 'logApiRequest').mockImplementation(() => {
        throw testError;
      });

      const errorSpy = jest.spyOn(middleware['logger'], 'error');

      // Act
      middleware.use(req, res, next);

      // Call end to trigger error
      res.end();

      // Allow time for any promises to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert error was logged but didn't break execution
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error logging API metrics: Test error'),
        expect.any(String),
      );
      expect(next).toHaveBeenCalled();
    });
  });
});
