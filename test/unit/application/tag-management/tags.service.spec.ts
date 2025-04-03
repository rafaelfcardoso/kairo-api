import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from '../../../../src/tags/tags.service';
import { TagsRepository } from '../../../../src/tags/tags.repository';
import { Tag } from '../../../../src/tags/tags.entity';
import { CreateTagDto, UpdateTagDto } from '../../../../src/tags/tags.dto';
import { ILike } from 'typeorm';

describe('TagsService', () => {
  let service: TagsService;
  let repository: {
    getTags: jest.Mock<Promise<Tag[]>>;
    getTagById: jest.Mock<Promise<Tag>, [string]>;
    createTag: jest.Mock<Promise<Tag>, [CreateTagDto]>;
    updateTag: jest.Mock<Promise<Tag>, [string, UpdateTagDto]>;
    deleteTag: jest.Mock<Promise<void>, [string]>;
    getTagsByIds: jest.Mock<Promise<Tag[]>, [string[]]>;
    getTagStats: jest.Mock<Promise<Array<{ tag: Tag; taskCount: number }>>>;
    findSimilarTags: jest.Mock<Promise<Tag[]>, [string]>;
    countTags: jest.Mock<Promise<number>, [Record<string, any>]>;
  };

  const mockTag: Tag = {
    id: 'test-tag-id',
    name: 'Test Tag',
    description: null,
    color: '#FF0000',
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
  };

  const mockCreateTagDto: CreateTagDto = {
    name: 'Test Tag',
    color: '#FF0000',
  };

  const mockUpdateTagDto: UpdateTagDto = {
    name: 'Updated Tag',
    color: '#00FF00',
  };

  beforeEach(async () => {
    // Create mock repository
    repository = {
      getTags: jest.fn(),
      getTagById: jest.fn(),
      createTag: jest.fn(),
      updateTag: jest.fn(),
      deleteTag: jest.fn(),
      getTagsByIds: jest.fn(),
      getTagStats: jest.fn(),
      findSimilarTags: jest.fn(),
      countTags: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: TagsRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  describe('CRUD Operations', () => {
    describe('getTags', () => {
      it('should return an array of tags', async () => {
        const tags = [mockTag];
        repository.getTags.mockResolvedValue(tags);

        const result = await service.getTags();
        expect(result).toEqual(tags);
        expect(repository.getTags).toHaveBeenCalled();
      });
    });

    describe('getTagById', () => {
      it('should return a single tag by id', async () => {
        repository.getTagById.mockResolvedValue(mockTag);

        const result = await service.getTagById('test-tag-id');
        expect(result).toEqual(mockTag);
        expect(repository.getTagById).toHaveBeenCalledWith('test-tag-id');
      });
    });

    describe('createTag', () => {
      it('should create and return a new tag', async () => {
        repository.createTag.mockResolvedValue(mockTag);

        const result = await service.createTag(mockCreateTagDto);
        expect(result).toEqual(mockTag);
        expect(repository.createTag).toHaveBeenCalledWith(mockCreateTagDto);
      });
    });

    describe('updateTag', () => {
      it('should update and return the updated tag', async () => {
        const updatedTag = { ...mockTag, ...mockUpdateTagDto };
        repository.updateTag.mockResolvedValue(updatedTag);

        const result = await service.updateTag('test-tag-id', mockUpdateTagDto);
        expect(result).toEqual(updatedTag);
        expect(repository.updateTag).toHaveBeenCalledWith(
          'test-tag-id',
          mockUpdateTagDto,
        );
      });
    });

    describe('deleteTag', () => {
      it('should delete a tag', async () => {
        repository.deleteTag.mockResolvedValue(undefined);

        await service.deleteTag('test-tag-id');
        expect(repository.deleteTag).toHaveBeenCalledWith('test-tag-id');
      });
    });
  });

  describe('Tag Retrieval', () => {
    describe('getTagsByIds', () => {
      it('should return tags by array of ids', async () => {
        const tags = [mockTag];
        repository.getTagsByIds.mockResolvedValue(tags);

        const result = await service.getTagsByIds(['test-tag-id']);
        expect(result).toEqual(tags);
        expect(repository.getTagsByIds).toHaveBeenCalledWith(['test-tag-id']);
      });
    });

    describe('findSimilarTags', () => {
      it('should return similar tags by name', async () => {
        const tags = [mockTag];
        repository.findSimilarTags.mockResolvedValue(tags);

        const result = await service.findSimilarTags('Test');
        expect(result).toEqual(tags);
        expect(repository.findSimilarTags).toHaveBeenCalledWith('Test');
      });
    });
  });

  describe('Tag Statistics', () => {
    describe('getTagStats', () => {
      it('should return tag statistics', async () => {
        const stats = [{ tag: mockTag, taskCount: 5 }];
        repository.getTagStats.mockResolvedValue(stats);

        const result = await service.getTagStats();
        expect(result).toEqual(stats);
        expect(repository.getTagStats).toHaveBeenCalled();
      });
    });

    describe('getMostUsedTags', () => {
      it('should return most used tags with default limit', async () => {
        const stats = [
          { tag: { ...mockTag, name: 'Tag1' }, taskCount: 5 },
          { tag: { ...mockTag, name: 'Tag2' }, taskCount: 3 },
          { tag: { ...mockTag, name: 'Tag3' }, taskCount: 7 },
          { tag: { ...mockTag, name: 'Tag4' }, taskCount: 4 },
          { tag: { ...mockTag, name: 'Tag5' }, taskCount: 3 },
          { tag: { ...mockTag, name: 'Tag6' }, taskCount: 1 },
        ];
        repository.getTagStats.mockResolvedValue(stats);

        const result = await service.getMostUsedTags();
        expect(result).toHaveLength(5); // Default limit
        expect(result[0].taskCount).toBe(7); // Most used first
        expect(result[4].taskCount).toBe(3); // Least used of top 5
      });

      it('should respect custom limit', async () => {
        const stats = [
          { tag: { ...mockTag, name: 'Tag1' }, taskCount: 5 },
          { tag: { ...mockTag, name: 'Tag2' }, taskCount: 3 },
          { tag: { ...mockTag, name: 'Tag3' }, taskCount: 7 },
        ];
        repository.getTagStats.mockResolvedValue(stats);

        const result = await service.getMostUsedTags(2);
        expect(result).toHaveLength(2);
        expect(result[0].taskCount).toBe(7);
        expect(result[1].taskCount).toBe(5);
      });
    });

    describe('getUnusedTags', () => {
      it('should return tags with no tasks', async () => {
        const stats = [
          { tag: { ...mockTag, name: 'Tag1' }, taskCount: 0 },
          { tag: { ...mockTag, name: 'Tag2' }, taskCount: 3 },
          { tag: { ...mockTag, name: 'Tag3' }, taskCount: 0 },
        ];
        repository.getTagStats.mockResolvedValue(stats);

        const result = await service.getUnusedTags();
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Tag1');
        expect(result[1].name).toBe('Tag3');
      });
    });
  });

  describe('Tag Filtering', () => {
    describe('countTags', () => {
      it('should count tags with name filter', async () => {
        repository.countTags.mockResolvedValue(5);

        const filters = { name: 'Test' };
        const result = await service.countTags(filters);

        expect(result).toBe(5);
        expect(repository.countTags).toHaveBeenCalledWith({
          name: ILike('%Test%'),
        });
      });

      it('should count tags with color filter', async () => {
        repository.countTags.mockResolvedValue(3);

        const filters = { color: '#FF0000' };
        const result = await service.countTags(filters);

        expect(result).toBe(3);
        expect(repository.countTags).toHaveBeenCalledWith({
          color: '#FF0000',
        });
      });

      it('should count tags with both name and color filters', async () => {
        repository.countTags.mockResolvedValue(2);

        const filters = { name: 'Test', color: '#FF0000' };
        const result = await service.countTags(filters);

        expect(result).toBe(2);
        expect(repository.countTags).toHaveBeenCalledWith({
          name: ILike('%Test%'),
          color: '#FF0000',
        });
      });
    });
  });
});
