import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

describe('AppController', () => {
  let appController: AppController;
  let configService: ConfigService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'NODE_ENV':
                  return 'test';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    configService = app.get<ConfigService>(ConfigService);
  });

  describe('root', () => {
    it('should return "Zenith API is running!"', () => {
      expect(appController.getHello()).toBe('Zenith API is running!');
    });
  });

  describe('health', () => {
    it('should return health check information', () => {
      const healthCheck = appController.healthCheck();
      expect(healthCheck).toHaveProperty('status', 'ok');
      expect(healthCheck).toHaveProperty('timestamp');
      expect(healthCheck).toHaveProperty('environment', 'test');
      expect(healthCheck).toHaveProperty('version');
      expect(healthCheck).toHaveProperty('uptime');
      expect(healthCheck).toHaveProperty('memoryUsage');
    });
  });
});
