import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const mockAuthService = {
      generateApiToken: jest.fn().mockReturnValue('test-token'),
      verifyToken: jest.fn().mockReturnValue({ sub: 'api-service' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateToken', () => {
    const validServiceKey = 'your-service-key-here';
    process.env.ZENITH_API_KEY = validServiceKey;

    it('should generate a token with valid service key', async () => {
      const dto = {
        serviceName: 'test-service',
        serviceKey: validServiceKey,
      };

      const result = await controller.generateToken(dto);
      expect(result.token).toBe('test-token');
      expect(authService.generateApiToken).toHaveBeenCalledWith(
        dto.serviceName,
      );
    });

    it('should throw UnauthorizedException with invalid service key', async () => {
      const dto = {
        serviceName: 'test-service',
        serviceKey: 'invalid-key',
      };

      await expect(controller.generateToken(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.generateApiToken).not.toHaveBeenCalled();
    });
  });
});
