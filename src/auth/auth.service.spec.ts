import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ProjectsService } from '../projects/projects.service';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let projectsService: ProjectsService;
  let userRepository: Repository<User>;

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

    const mockProjectsService = {
      createProject: jest.fn().mockResolvedValue({ id: 'inbox-id', name: 'Inbox' }),
    };
    const mockUserRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ ...data, id: 'new-user-id' })),
      save: jest.fn().mockImplementation(async (user) => user),
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
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    projectsService = module.get<ProjectsService>(ProjectsService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
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

  it('register should create user and Inbox project', async () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'pass123',
      name: 'Test User',
    };
    // Mock bcrypt.hash
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpw');

    const user = await service.register(registerDto);

    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: registerDto.email } });
    expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    expect(userRepository.create).toHaveBeenCalledWith({
      email: registerDto.email,
      passwordHash: 'hashedpw',
      name: registerDto.name,
    });
    expect(userRepository.save).toHaveBeenCalled();
    expect(projectsService.createProject).toHaveBeenCalledWith(
      {
        name: 'Inbox',
        description: null,
        color: null,
        parentId: null,
      },
      'new-user-id',
    );
    expect(user.passwordHash).toBeUndefined();
  });
});
