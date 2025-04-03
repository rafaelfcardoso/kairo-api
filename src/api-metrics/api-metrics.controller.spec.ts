import { Test, TestingModule } from '@nestjs/testing';
import { ApiMetricsController, ParseDatePipe } from './api-metrics.controller';
import { ApiMetricsService } from './api-metrics.service';
import { BadRequestException } from '@nestjs/common';
import { ApiMetrics } from '../entities/api-metrics.entity';

describe('ApiMetricsController', () => {
  let controller: ApiMetricsController;
  let service: ApiMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiMetricsController],
      providers: [
        {
          provide: ApiMetricsService,
          useValue: {
            getMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ApiMetricsController>(ApiMetricsController);
    service = module.get<ApiMetricsService>(ApiMetricsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should call service.getMetrics with correct parameters', async () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const endpoint = '/api/test';
      const method = 'GET';
      const version = '1.0';

      const expectedResult = [{ id: 1 }] as ApiMetrics[];
      jest.spyOn(service, 'getMetrics').mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getMetrics(
        startDate,
        endDate,
        endpoint,
        method,
        version,
      );

      // Assert
      expect(service.getMetrics).toHaveBeenCalledWith(
        startDate,
        endDate,
        endpoint,
        method,
        version,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('ParseDatePipe', () => {
    let pipe: ParseDatePipe;

    beforeEach(() => {
      pipe = new ParseDatePipe();
    });

    it('should transform valid date string into Date object', () => {
      // Arrange
      const dateString = '2023-01-01';
      const metadata = { type: 'query', data: 'startDate' } as any;

      // Act
      const result = pipe.transform(dateString, metadata);

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toContain('2023-01-01');
    });

    it('should throw BadRequestException for invalid date string', () => {
      // Arrange
      const dateString = 'not-a-date';
      const metadata = { type: 'query', data: 'startDate' } as any;

      // Act & Assert
      expect(() => pipe.transform(dateString, metadata)).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform(dateString, metadata)).toThrow(
        'startDate must be a valid date string (YYYY-MM-DD)',
      );
    });
  });
});
