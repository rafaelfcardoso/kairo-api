import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

describe('AppController', () => {
  let appController: AppController;
  let configService: ConfigService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'nodeEnv':
                  return 'test';
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: DataSource,
          useValue: {
            isInitialized: true,
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    configService = app.get<ConfigService>(ConfigService);
    dataSource = app.get<DataSource>(DataSource);
  });

  describe('root', () => {
    it('should return "Zenith API is running!"', () => {
      expect(appController.getHello()).toBe('Zenith API is running!');
    });
  });

  describe('health', () => {
    it('should return health check information', async () => {
      const healthCheck = await appController.healthCheck();
      expect(healthCheck).toHaveProperty('status', 'ok');
      expect(healthCheck).toHaveProperty('timestamp');
      expect(healthCheck).toHaveProperty('environment', 'test');
      expect(healthCheck).toHaveProperty('version');
      expect(healthCheck).toHaveProperty('uptime');
      // This property is no longer included in the legacy health endpoint
      // expect(healthCheck).toHaveProperty('memoryUsage');
      expect(healthCheck).toHaveProperty('database.status', 'connected');
      // Check for enhancedEndpoints property which should include the detailed health endpoints
      expect(healthCheck).toHaveProperty('enhancedEndpoints');
      expect(healthCheck.enhancedEndpoints).toHaveProperty('memory');
    });
  });
});
