import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';
import { HttpModule } from '@nestjs/axios';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let healthService: HealthService;

  const mockHealthCheckService = {
    check: jest.fn().mockImplementation((checks) => {
      return Promise.resolve({
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
          services: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
          services: { status: 'up' },
        },
      });
    }),
  };

  const mockTypeOrmHealthIndicator = {
    pingCheck: jest.fn().mockResolvedValue({
      database: { status: 'up' },
    }),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: jest.fn().mockResolvedValue({
      memory_heap: { status: 'up' },
    }),
    checkRSS: jest.fn().mockResolvedValue({
      memory_rss: { status: 'up' },
    }),
  };

  const mockDiskHealthIndicator = {
    checkStorage: jest.fn().mockResolvedValue({
      disk: { status: 'up' },
    }),
  };

  const mockHealthService = {
    checkServices: jest.fn().mockResolvedValue({
      services: { status: 'up' },
    }),
    getDetailedHealthInfo: jest.fn().mockResolvedValue({
      name: 'Zenith API',
      status: 'ok',
      timestamp: '2023-01-01T00:00:00.000Z',
      environment: 'test',
      version: '1.0.0',
      uptime: 3600,
      uptime_human: '1h 0m 0s',
      database: {
        status: 'connected',
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeOrmHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check result', async () => {
      const result = await controller.check();

      expect(result).toEqual({
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
          services: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
          services: { status: 'up' },
        },
      });

      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('getDetailedHealthInfo', () => {
    it('should return detailed health information', async () => {
      const result = await controller.getDetailedHealthInfo();

      expect(result).toEqual({
        name: 'Zenith API',
        status: 'ok',
        timestamp: '2023-01-01T00:00:00.000Z',
        environment: 'test',
        version: '1.0.0',
        uptime: 3600,
        uptime_human: '1h 0m 0s',
        database: {
          status: 'connected',
        },
      });

      expect(healthService.getDetailedHealthInfo).toHaveBeenCalled();
    });
  });

  describe('checkDatabase', () => {
    it('should check database health', async () => {
      const result = await controller.checkDatabase();

      expect(result).toEqual({
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
          services: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
          services: { status: 'up' },
        },
      });

      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });
});
