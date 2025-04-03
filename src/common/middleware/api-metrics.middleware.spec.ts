import { Test, TestingModule } from '@nestjs/testing';
import { ApiMetricsMiddleware } from './api-metrics.middleware';
import { ApiMetricsService } from '../../api-metrics/api-metrics.service';
import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

describe('ApiMetricsMiddleware', () => {
  let middleware: ApiMetricsMiddleware;
  let metricsService: ApiMetricsService;
  let module: TestingModule;
  let originalSetImmediate: typeof setImmediate;

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

    // Store original setImmediate without mocking it for TypeScript purposes
    // Just use spies in individual tests as needed
    originalSetImmediate = global.setImmediate;
  });

  afterEach(async () => {
    // Allow any microtasks to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
    jest.clearAllMocks();
    // No need to restore setImmediate as we're not changing it globally
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
        on: jest.fn(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      // Act
      middleware.use(req, res, next);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', '1.0');
      expect(next).toHaveBeenCalled();
    });

    it('should listen for finish event to track metrics', async () => {
      const mockNext = jest.fn();
      // Use proper Request type
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/tasks',
        ip: '127.0.0.1',
        startTime: Date.now(),
      } as unknown as Request;

      // Use specific function types instead of Function
      const mockWrite: (chunk: any, encoding?: BufferEncoding) => void =
        jest.fn();
      const mockEnd: (chunk?: any, encoding?: BufferEncoding) => void =
        jest.fn();

      const res = {
        setHeader: jest.fn(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            callback(mockWrite, mockEnd);
          }
        }),
      } as unknown as Response;

      // Set up spies
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // First call during middleware initialization
        .mockReturnValueOnce(1100); // Second call when finish event is triggered

      // Act
      middleware.use(req, res, mockNext);

      // Assert event listener was added
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));

      // Trigger the finish event
      mockEnd();

      // Allow time for any promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should call logApiRequest with the right timing
      expect(metricsService.logApiRequest).toHaveBeenCalled();

      // First argument should be req, second should be res,
      // third should be responseTime (100ms)
      const args = (metricsService.logApiRequest as jest.Mock).mock.calls[0];
      expect(args[0]).toBe(req);
      expect(args[1]).toBe(res);
      expect(args[2]).toBe(100); // 1100 - 1000 = 100
    });

    it('should handle errors in setImmediate callback gracefully', async () => {
      // Arrange
      const req = {} as Request;
      // Use specific function type instead of generic Function
      let finishCallback: (arg?: any) => void;
      const res = {
        setHeader: jest.fn(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            finishCallback = callback;
          }
        }),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      // Make the service throw an error
      const testError = new Error('Test error');
      jest.spyOn(metricsService, 'logApiRequest').mockImplementation(() => {
        throw testError;
      });

      // Instead of mocking setImmediate globally, we'll spy on it
      // and directly call the callback passed to it
      const setImmediateSpy = jest
        .spyOn(global, 'setImmediate')
        .mockImplementation((cb: any) => {
          cb();
          return {} as NodeJS.Immediate;
        });

      const errorSpy = jest.spyOn(middleware['logger'], 'error');

      // Act
      middleware.use(req, res, next);

      // Trigger the finish event
      finishCallback!();

      // Allow time for any promises to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert error was logged but didn't break execution
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error logging API metrics: Test error'),
        expect.any(String),
      );
      expect(next).toHaveBeenCalled();

      // Restore the spy
      setImmediateSpy.mockRestore();
    });

    it('should handle errors in response.on setup gracefully', async () => {
      // Arrange
      const req = {} as Request;
      const res = {
        setHeader: jest.fn(),
        on: jest.fn().mockImplementation(() => {
          throw new Error('on method error');
        }),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      const errorSpy = jest.spyOn(middleware['logger'], 'error');

      // Act
      middleware.use(req, res, next);

      // Assert error was logged but next was still called
      expect(errorSpy).toHaveBeenCalledWith(
        'Error in API metrics middleware setup: on method error',
      );
      expect(next).toHaveBeenCalled();
    });

    it('should handle errors in logApiRequest gracefully', async () => {
      const mockNext = jest.fn();
      // Use proper Request type
      const req = {
        method: 'GET',
        originalUrl: '/api/v1/tasks',
        ip: '127.0.0.1',
        startTime: Date.now(),
      } as unknown as Request;

      // Use specific function types instead of Function
      const mockWrite: (chunk: any, encoding?: BufferEncoding) => void =
        jest.fn();
      const mockEnd: (chunk?: any, encoding?: BufferEncoding) => void =
        jest.fn();

      const res = {
        setHeader: jest.fn(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            callback(mockWrite, mockEnd);
          }
        }),
      } as unknown as Response;

      // Make the service throw an error
      const testError = new Error('Test error');
      jest.spyOn(metricsService, 'logApiRequest').mockImplementation(() => {
        throw testError;
      });

      const errorSpy = jest.spyOn(middleware['logger'], 'error');

      // Act
      middleware.use(req, res, mockNext);

      // Trigger the finish event
      mockEnd();

      // Allow time for any promises to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert error was logged but didn't break execution
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error logging API metrics: Test error'),
        expect.any(String),
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
