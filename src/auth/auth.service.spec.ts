import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockJwtService = {
      sign: jest.fn().mockReturnValue('test-token'),
      verify: jest.fn().mockReturnValue({ sub: 'api-service' }),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'test-secret';
          default:
            return null;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate an API token', () => {
    const serviceName = 'test-service';
    const token = service.generateApiToken(serviceName);
    expect(token).toBe('test-token');
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'api-service',
      name: serviceName,
      type: 'service',
    });
  });

  it('should verify a token', () => {
    const token = 'test-token';
    const result = service.verifyToken(token);
    expect(result).toEqual({ sub: 'api-service' });
    expect(jwtService.verify).toHaveBeenCalledWith(token);
  });
});
