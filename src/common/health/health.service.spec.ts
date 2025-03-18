import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemHealth } from '../../entities/system-health.entity';
import { of } from 'rxjs';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: DataSource;
  let systemHealthRepository: Repository<SystemHealth>;

  // Mock implementations
  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === 'nodeEnv') return 'test';
      if (key === 'api.url') return 'http://test-api.example.com';
      return undefined;
    }),
  };

  const mockQueryRunner = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockDataSource = {
    isInitialized: true,
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn().mockImplementation(() => of({ data: { status: 'ok' } })),
  };

  const mockSystemHealthRepository = {
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mock data
    mockQueryRunner.query.mockImplementation((query) => {
      if (query.includes('pg_size_pretty')) {
        return Promise.resolve([{ size: '100 MB' }]);
      }
      if (query.includes('pg_database_size') && query.includes('size_mb')) {
        return Promise.resolve([{ size_mb: '100' }]);
      }
      if (query.includes('pg_stat_activity')) {
        return Promise.resolve([{ count: '5' }]);
      }
      if (query.includes('xact_commit')) {
        return Promise.resolve([{ transactions: '1000' }]);
      }
      if (query === 'SELECT 1') {
        return Promise.resolve([{ 1: 1 }]);
      }
      return Promise.resolve([]);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: getRepositoryToken(SystemHealth),
          useValue: mockSystemHealthRepository,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    dataSource = module.get<DataSource>(DataSource);
    systemHealthRepository = module.get<Repository<SystemHealth>>(
      getRepositoryToken(SystemHealth),
    );

    // Mock intervals to avoid running periodic checks during tests
    jest.spyOn(global, 'setInterval').mockImplementation((fn, ms) => {
      // Return object with unref method to avoid errors
      return {
        unref: jest.fn().mockReturnThis(),
      } as unknown as NodeJS.Timeout;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Clean up any running timers after all tests
  afterAll(() => {
    if (service) {
      service.shutdown();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkServices', () => {
    it('should return service status when database is connected', async () => {
      const result = await service.checkServices();

      expect(result.services.status).toBe('up');
      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should return down status when database check fails', async () => {
      mockQueryRunner.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.checkServices();

      expect(result.services.status).toBe('down');
    });
  });

  describe('getDetailedHealthInfo', () => {
    it('should return detailed health information', async () => {
      const result = await service.getDetailedHealthInfo();

      expect(result.name).toBe('Zenith API');
      expect(result.status).toBe('ok');
      expect(result.environment).toBe('test');
      expect(typeof result.uptime).toBe('number');
      expect(result.database.status).toBe('connected');
      expect(result.database.type).toBe('postgres');

      // Check database metrics were queried
      expect(mockQueryRunner.query).toHaveBeenCalledTimes(3);
    });

    it('should handle database metrics failure gracefully', async () => {
      mockQueryRunner.query.mockRejectedValue(new Error('Database error'));

      const result = await service.getDetailedHealthInfo();

      expect(result.database.status).toBe('connected'); // Still connected because dataSource.isInitialized is true
      expect(result.database).toHaveProperty('error');
    });
  });
});
