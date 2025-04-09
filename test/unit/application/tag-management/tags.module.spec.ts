import { Test, TestingModule } from '@nestjs/testing';
import { TagsModule } from '../../../../src/tags/tags.module';
import { TagsController } from '../../../../src/tags/tags.controller';
import { TagsService } from '../../../../src/tags/tags.service';
import { TagsRepository } from '../../../../src/tags/tags.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tag } from '../../../../src/tags/tags.entity';
import { DataSource, Repository } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';

describe.skip('TagsModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      metadata: {
        columns: [],
        relations: [],
      },
    };

    const mockDataSource = {
      createEntityManager: jest.fn(),
      getRepository: jest.fn().mockReturnValue(mockRepository),
      hasMetadata: jest.fn().mockReturnValue(true),
      getMetadata: jest.fn().mockReturnValue({
        columns: [],
        relations: [],
      }),
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Tag],
          synchronize: true,
        }),
        TagsModule,
      ],
    })
      .overrideProvider(DataSource)
      .useValue(mockDataSource)
      .overrideProvider(getRepositoryToken(Tag))
      .useValue(mockRepository)
      .compile();
  });

  it('should be defined', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should provide TagsController', () => {
    const controller = moduleRef.get(TagsController);
    expect(controller).toBeDefined();
  });

  it('should provide TagsService', () => {
    const service = moduleRef.get(TagsService);
    expect(service).toBeDefined();
  });

  it('should provide TagsRepository', () => {
    const repository = moduleRef.get(TagsRepository);
    expect(repository).toBeDefined();
  });

  it('should export TagsService', () => {
    const service = moduleRef.get(TagsService);
    expect(service).toBeDefined();
  });
});
