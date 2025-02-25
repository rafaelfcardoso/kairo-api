// src/focus-sessions/tests/focus-sessions.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FocusSessionsController } from '../focus-sessions.controller';
import { FocusSessionsService } from '../focus-sessions.service';
import { FocusSessionsRepository } from '../focus-sessions.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FocusSession } from '../focus-sessions.entity';
import { Task } from '../../tasks/tasks.entity';

describe('FocusSessionsController', () => {
  let controller: FocusSessionsController;
  let service: FocusSessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FocusSessionsController],
      providers: [
        FocusSessionsService,
        FocusSessionsRepository,
        {
          provide: getRepositoryToken(FocusSession),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            findByIds: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    controller = module.get<FocusSessionsController>(FocusSessionsController);
    service = module.get<FocusSessionsService>(FocusSessionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests as needed for your controller methods
});
