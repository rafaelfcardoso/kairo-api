import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from '../../../../src/tags/tags.service';
import { TagsRepository } from '../../../../src/tags/tags.repository';
import { Tag } from '../../../../src/tags/tags.entity';
import { CreateTagDto, UpdateTagDto } from '../../../../src/tags/tags.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ILike } from 'typeorm';
import { User } from '../../../../src/entities/user.entity';

describe('TagsService', () => {
  let service: TagsService;
  let repository: TagsRepository;

  // Mock tag data
  const mockTag: Tag = {
    id: '1',
    name: 'Test Tag',
    color: '#FFFFFF',
    description: 'Test Description',
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
    order: 0,
    user: new User(),
    userId: 'user-1',
  };

  const mockCreateTagDto: CreateTagDto = {
    name: 'New Tag',
    color: '#00FF00',
    description: 'New Description',
  };

  const mockUpdateTagDto: UpdateTagDto = {
    name: 'Updated Tag',
    color: '#0000FF',
    description: 'Updated Description',
  };

  const mockTagStats = [
    { tag: { ...mockTag, name: 'Tag 1' }, taskCount: 5 },
    { tag: { ...mockTag, name: 'Tag 2' }, taskCount: 3 },
    { tag: { ...mockTag, name: 'Tag 3' }, taskCount: 0 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: TagsRepository,
          useValue: {
            getTags: jest.fn(),
            getTagById: jest.fn(),
            createTag: jest.fn(),
            updateTag: jest.fn(),
            deleteTag: jest.fn(),
            getTagsByIds: jest.fn(),
            getTagStats: jest.fn(),
            findSimilarTags: jest.fn(),
            createQueryBuilder: jest.fn(),
            countTags: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    repository = module.get<TagsRepository>(TagsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTags', () => {
    it('should return an array of tags', async () => {
      const tags = [mockTag];
      jest.spyOn(repository, 'getTags').mockResolvedValue(tags);

      const result = await service.getTags();
      expect(result).toEqual(tags);
      expect(repository.getTags).toHaveBeenCalled();
    });
  });

  describe('getTagById', () => {
    it('should return a tag by id', async () => {
      jest.spyOn(repository, 'getTagById').mockResolvedValue(mockTag);

      const result = await service.getTagById(mockTag.id);
      expect(result).toEqual(mockTag);
      expect(repository.getTagById).toHaveBeenCalledWith(mockTag.id);
    });

    it('should throw NotFoundException when tag is not found', async () => {
      jest
        .spyOn(repository, 'getTagById')
        .mockRejectedValue(new NotFoundException());

      await expect(service.getTagById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTag', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create a tag', async () => {
      jest.spyOn(repository, 'createTag').mockResolvedValue(mockTag);

      const mockCreateTagDto: CreateTagDto = {
        name: 'New Tag',
        color: '#000000',
        description: 'New Description',
      };

      const result = await service.createTag(mockCreateTagDto, 'user-1');
      expect(result).toEqual(mockTag);
    });

    it('should throw ConflictException on duplicate tag name', async () => {
      jest
        .spyOn(repository, 'createTag')
        .mockImplementation(async (dto, userId) => {
          if (dto.name === 'Test Tag') {
            throw new ConflictException('Tag with this name already exists');
          }
          return mockTag;
        });

      const newTag: CreateTagDto = {
        name: 'Test Tag',
        color: '#000000',
        description: 'Duplicate Tag',
      };

      await expect(service.createTag(newTag, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateTag', () => {
    it('should update and return a tag', async () => {
      const updatedTag = { ...mockTag, ...mockUpdateTagDto };
      jest.spyOn(repository, 'updateTag').mockResolvedValue(updatedTag);

      const result = await service.updateTag(mockTag.id, mockUpdateTagDto);
      expect(result).toEqual(updatedTag);
      expect(repository.updateTag).toHaveBeenCalledWith(
        mockTag.id,
        mockUpdateTagDto,
      );
    });

    it('should throw NotFoundException when updating non-existent tag', async () => {
      jest
        .spyOn(repository, 'updateTag')
        .mockRejectedValue(new NotFoundException());

      await expect(
        service.updateTag('non-existent-id', mockUpdateTagDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      jest.spyOn(repository, 'deleteTag').mockResolvedValue(undefined);

      await service.deleteTag(mockTag.id);
      expect(repository.deleteTag).toHaveBeenCalledWith(mockTag.id);
    });

    it('should throw NotFoundException when deleting non-existent tag', async () => {
      jest
        .spyOn(repository, 'deleteTag')
        .mockRejectedValue(new NotFoundException());

      await expect(service.deleteTag('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTagsByIds', () => {
    it('should return tags by ids', async () => {
      const tags = [mockTag];
      jest.spyOn(repository, 'getTagsByIds').mockResolvedValue(tags);

      const result = await service.getTagsByIds([mockTag.id]);
      expect(result).toEqual(tags);
      expect(repository.getTagsByIds).toHaveBeenCalledWith([mockTag.id]);
    });

    it('should throw NotFoundException when any tag is not found', async () => {
      jest
        .spyOn(repository, 'getTagsByIds')
        .mockRejectedValue(new NotFoundException());

      await expect(service.getTagsByIds(['non-existent-id'])).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTagStats', () => {
    it('should return tag statistics', async () => {
      jest.spyOn(repository, 'getTagStats').mockResolvedValue(mockTagStats);

      const result = await service.getTagStats();
      expect(result).toEqual(mockTagStats);
      expect(repository.getTagStats).toHaveBeenCalled();
    });

    it('should handle empty repository', async () => {
      jest.spyOn(repository, 'getTagStats').mockResolvedValue([]);

      const result = await service.getTagStats();
      expect(result).toEqual([]);
    });

    it('should return stats sorted by task count', async () => {
      const unsortedStats = [
        { tag: { ...mockTag, name: 'Tag 1' }, taskCount: 1 },
        { tag: { ...mockTag, name: 'Tag 2' }, taskCount: 3 },
        { tag: { ...mockTag, name: 'Tag 3' }, taskCount: 2 },
      ];
      jest.spyOn(repository, 'getTagStats').mockResolvedValue(unsortedStats);

      const result = await service.getTagStats();
      expect(result).toEqual(unsortedStats);
    });
  });

  describe('findSimilarTags', () => {
    it('should return similar tags', async () => {
      const similarTags = [mockTag];
      jest.spyOn(repository, 'findSimilarTags').mockResolvedValue(similarTags);

      const result = await service.findSimilarTags('Test');
      expect(result).toEqual(similarTags);
      expect(repository.findSimilarTags).toHaveBeenCalledWith('Test');
    });

    it('should return empty array when no similar tags found', async () => {
      jest.spyOn(repository, 'findSimilarTags').mockResolvedValue([]);

      const result = await service.findSimilarTags('NonexistentTag');
      expect(result).toEqual([]);
    });

    it('should handle special characters in search', async () => {
      jest.spyOn(repository, 'findSimilarTags').mockResolvedValue([mockTag]);

      await service.findSimilarTags('Test#Tag%');
      expect(repository.findSimilarTags).toHaveBeenCalledWith('Test#Tag%');
    });
  });

  describe('getMostUsedTags', () => {
    it('should return most used tags with default limit', async () => {
      jest.spyOn(repository, 'getTagStats').mockResolvedValue(mockTagStats);

      const result = await service.getMostUsedTags();
      expect(result).toHaveLength(Math.min(5, mockTagStats.length));
      expect(result[0].taskCount).toBeGreaterThanOrEqual(result[1].taskCount);
    });

    it('should return most used tags with custom limit', async () => {
      jest.spyOn(repository, 'getTagStats').mockResolvedValue(mockTagStats);

      const limit = 2;
      const result = await service.getMostUsedTags(limit);
      expect(result).toHaveLength(Math.min(limit, mockTagStats.length));
      expect(result[0].taskCount).toBeGreaterThanOrEqual(result[1].taskCount);
    });

    it('should return empty array when no tags exist', async () => {
      jest.spyOn(repository, 'getTagStats').mockResolvedValue([]);

      const result = await service.getMostUsedTags();
      expect(result).toEqual([]);
    });

    it('should handle invalid limit parameter', async () => {
      const stats = [
        { tag: { ...mockTag, name: 'Tag 1' }, taskCount: 5 },
        { tag: { ...mockTag, name: 'Tag 2' }, taskCount: 3 },
        { tag: { ...mockTag, name: 'Tag 3' }, taskCount: 0 },
      ];
      jest.spyOn(repository, 'getTagStats').mockResolvedValue(stats);

      const result = await service.getMostUsedTags(-1);
      expect(result).toHaveLength(2); // We only have 2 tags in our mock data
      expect(result[0].taskCount).toBe(5);
      expect(result[1].taskCount).toBe(3);
    });
  });

  describe('getUnusedTags', () => {
    it('should return unused tags', async () => {
      jest.spyOn(repository, 'getTagStats').mockResolvedValue(mockTagStats);

      const result = await service.getUnusedTags();
      expect(result).toEqual([mockTagStats[2].tag]); // Only the tag with taskCount 0
      expect(repository.getTagStats).toHaveBeenCalled();
    });
  });

  describe('countTags', () => {
    it('should count tags with filters', async () => {
      jest.spyOn(repository, 'countTags').mockResolvedValue(5);

      const filters = { name: 'Test', color: '#FF0000' };
      const result = await service.countTags(filters);
      expect(result).toBe(5);
      expect(repository.countTags).toHaveBeenCalledWith({
        name: ILike('%Test%'),
        color: '#FF0000',
      });
    });

    it('should count tags without filters', async () => {
      jest.spyOn(repository, 'countTags').mockResolvedValue(10);

      const result = await service.countTags({});
      expect(result).toBe(10);
      expect(repository.countTags).toHaveBeenCalledWith({});
    });
  });
});
