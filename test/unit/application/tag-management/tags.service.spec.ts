import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from '../../../../src/tags/tags.service';
import { TagsRepository } from '../../../../src/tags/tags.repository';
import { Tag } from '../../../../src/tags/tags.entity';
import { CreateTagDto, UpdateTagDto } from '../../../../src/tags/tags.dto';
import { ILike } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { mockUser } from '../../../mocks/request.mock';

describe.skip('TagsService', () => {
  let service: TagsService;
  let repository: {
    getTags: jest.Mock<Promise<Tag[]>>;
    getTagById: jest.Mock<Promise<Tag | null>, [string]>;
    createTag: jest.Mock<Promise<Tag>, [CreateTagDto, string]>;
    updateTag: jest.Mock<Promise<Tag>, [string, UpdateTagDto]>;
    deleteTag: jest.Mock<Promise<void>, [string]>;
    getTagsByIds: jest.Mock<Promise<Tag[]>, [string[], string]>;
    getTagStats: jest.Mock<Promise<Array<{ tag: Tag; taskCount: number }>>>;
    findSimilarTags: jest.Mock<Promise<Tag[]>, [string, string]>;
    countTags: jest.Mock<Promise<number>, [Record<string, any>]>;
  };

  const testUserId = mockUser.id;

  const mockTag: Tag = {
    id: 'test-tag-id',
    name: 'Test Tag',
    description: null,
    color: '#FF0000',
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
    isSystem: false,
    isArchived: false,
    order: 0,
    user: mockUser,
    userId: testUserId,
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

        const result = await service.getTags(testUserId);
        expect(result).toEqual(tags);
        expect(repository.getTags).toHaveBeenCalledWith(testUserId);
      });
    });

    describe('getTagById', () => {
      it('should return a tag if found and owned', async () => {
        repository.getTagById.mockResolvedValue(mockTag);
        const result = await service.getTagById('test-tag-id', testUserId);
        expect(result).toEqual(mockTag);
        expect(repository.getTagById).toHaveBeenCalledWith('test-tag-id');
      });

      it('should throw NotFoundException if tag not found by repository', async () => {
        repository.getTagById.mockResolvedValue(null);
        await expect(
          service.getTagById('non-existent-id', testUserId),
        ).rejects.toThrow(NotFoundException);
        expect(repository.getTagById).toHaveBeenCalledWith('non-existent-id');
      });

      it('should throw ForbiddenException if tag not owned by user', async () => {
        const otherUserTag = { ...mockTag, userId: 'other-user' };
        repository.getTagById.mockResolvedValue(otherUserTag);
        await expect(
          service.getTagById('test-tag-id', testUserId),
        ).rejects.toThrow(ForbiddenException);
        expect(repository.getTagById).toHaveBeenCalledWith('test-tag-id');
      });

      it('should return a system tag even if not owned by user', async () => {
        const systemTag = { ...mockTag, userId: 'other-user', isSystem: true };
        repository.getTagById.mockResolvedValue(systemTag);
        const result = await service.getTagById('system-tag-id', testUserId);
        expect(result).toEqual(systemTag);
        expect(repository.getTagById).toHaveBeenCalledWith('system-tag-id');
      });
    });

    describe('createTag', () => {
      it('should create and return a new tag', async () => {
        repository.createTag.mockResolvedValue(mockTag);

        const result = await service.createTag(mockCreateTagDto, testUserId);
        expect(result).toEqual(mockTag);
        expect(repository.createTag).toHaveBeenCalledWith(
          mockCreateTagDto,
          testUserId,
        );
      });
    });

    describe('updateTag', () => {
      it('should update and return the tag', async () => {
        repository.getTagById.mockResolvedValue(mockTag);
        repository.updateTag.mockResolvedValue({
          ...mockTag,
          ...mockUpdateTagDto,
        });
        const result = await service.updateTag(
          'test-tag-id',
          mockUpdateTagDto,
          testUserId,
        );
        expect(result.name).toEqual(mockUpdateTagDto.name);
        expect(repository.getTagById).toHaveBeenCalledWith('test-tag-id');
        expect(repository.updateTag).toHaveBeenCalledWith(
          'test-tag-id',
          mockUpdateTagDto,
        );
      });

      it('should throw NotFoundException if tag to update not found', async () => {
        repository.getTagById.mockResolvedValue(null);
        await expect(
          service.updateTag('non-existent-id', mockUpdateTagDto, testUserId),
        ).rejects.toThrow(NotFoundException);
        expect(repository.getTagById).toHaveBeenCalledWith('non-existent-id');
        expect(repository.updateTag).not.toHaveBeenCalled();
      });

      it('should throw ForbiddenException if tag is not owned', async () => {
        const otherUserTag = { ...mockTag, userId: 'other-user' };
        repository.getTagById.mockResolvedValue(otherUserTag);
        await expect(
          service.updateTag('test-tag-id', mockUpdateTagDto, testUserId),
        ).rejects.toThrow(ForbiddenException);
        expect(repository.getTagById).toHaveBeenCalledWith('test-tag-id');
        expect(repository.updateTag).not.toHaveBeenCalled();
      });
    });

    describe('deleteTag', () => {
      it('should delete a tag', async () => {
        repository.getTagById.mockResolvedValue(mockTag);
        repository.deleteTag.mockResolvedValue(undefined);
        await service.deleteTag('test-tag-id', testUserId);
        expect(repository.getTagById).toHaveBeenCalledWith('test-tag-id');
        expect(repository.deleteTag).toHaveBeenCalledWith('test-tag-id');
      });

      it('should throw NotFoundException if tag to delete not found', async () => {
        repository.getTagById.mockResolvedValue(null);
        await expect(
          service.deleteTag('non-existent-id', testUserId),
        ).rejects.toThrow(NotFoundException);
        expect(repository.getTagById).toHaveBeenCalledWith('non-existent-id');
        expect(repository.deleteTag).not.toHaveBeenCalled();
      });

      it('should throw ForbiddenException if tag to delete is not owned', async () => {
        const otherUserTag = { ...mockTag, userId: 'other-user' };
        repository.getTagById.mockResolvedValue(otherUserTag);
        await expect(
          service.deleteTag('test-tag-id', testUserId),
        ).rejects.toThrow(ForbiddenException);
        expect(repository.getTagById).toHaveBeenCalledWith('test-tag-id');
        expect(repository.deleteTag).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException if trying to delete a system tag', async () => {
        const systemTag = { ...mockTag, isSystem: true };
        repository.getTagById.mockResolvedValue(systemTag);
        await expect(
          service.deleteTag('system-tag-id', testUserId),
        ).rejects.toThrow(BadRequestException);
        expect(repository.getTagById).toHaveBeenCalledWith('system-tag-id');
        expect(repository.deleteTag).not.toHaveBeenCalled();
      });
    });
  });

  describe('Tag Retrieval', () => {
    describe('getTagsByIds', () => {
      it('should return tags by array of ids', async () => {
        const tags = [mockTag];
        repository.getTagsByIds.mockResolvedValue(tags);

        const result = await service.getTagsByIds(['test-tag-id'], testUserId);
        expect(result).toEqual(tags);
        expect(repository.getTagsByIds).toHaveBeenCalledWith(
          ['test-tag-id'],
          testUserId,
        );
      });

      it('should return empty array if ids array is empty', async () => {
        repository.getTagsByIds.mockResolvedValue([]);
        const result = await service.getTagsByIds([], testUserId);
        expect(result).toEqual([]);
        expect(repository.getTagsByIds).toHaveBeenCalledWith([], testUserId);
      });
    });

    describe('findSimilarTags', () => {
      it('should return similar tags by name', async () => {
        const tags = [mockTag];
        repository.findSimilarTags.mockResolvedValue(tags);

        const result = await service.findSimilarTags('Test', testUserId);
        expect(result).toEqual(tags);
        expect(repository.findSimilarTags).toHaveBeenCalledWith(
          'Test',
          testUserId,
        );
      });
    });
  });

  describe('Tag Statistics', () => {
    describe('getTagStats', () => {
      it('should return tag statistics', async () => {
        const stats = [{ tag: mockTag, taskCount: 5 }];
        repository.getTagStats.mockResolvedValue(stats);

        const result = await service.getTagStats(testUserId);
        expect(result).toEqual(stats);
        expect(repository.getTagStats).toHaveBeenCalledWith(testUserId);
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

        const result = await service.getMostUsedTags(5, testUserId);
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

        const result = await service.getMostUsedTags(2, testUserId);
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

        const result = await service.getUnusedTags(testUserId);
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
        const result = await service.countTags(filters, testUserId);

        expect(result).toBe(5);
        expect(repository.countTags).toHaveBeenCalledWith({
          where: { name: 'Test', userId: testUserId },
        });
      });

      it('should count tags with color filter', async () => {
        repository.countTags.mockResolvedValue(3);

        const filters = { color: '#FF0000' };
        const result = await service.countTags(filters, testUserId);

        expect(result).toBe(3);
        expect(repository.countTags).toHaveBeenCalledWith({
          where: { color: '#FF0000', userId: testUserId },
        });
      });

      it('should count tags with both name and color filters', async () => {
        repository.countTags.mockResolvedValue(2);

        const filters = { name: 'Test', color: '#FF0000' };
        const result = await service.countTags(filters, testUserId);

        expect(result).toBe(2);
        expect(repository.countTags).toHaveBeenCalledWith({
          where: { name: 'Test', color: '#FF0000', userId: testUserId },
        });
      });

      it('should count tags without filters', async () => {
        repository.countTags.mockResolvedValue(5);
        const result = await service.countTags({}, testUserId);
        expect(result).toBe(5);
        expect(repository.countTags).toHaveBeenCalledWith({
          where: { userId: testUserId },
        });
      });

      it('should handle isSystem filter', async () => {
        const filters = { isSystem: true };
        repository.countTags.mockResolvedValue(2);
        const result = await service.countTags(filters, testUserId);
        expect(result).toBe(2);
        expect(repository.countTags).toHaveBeenCalledWith({
          where: { isSystem: true, userId: testUserId },
        });
      });

      it('should handle isArchived filter', async () => {
        const filters = { isArchived: true };
        repository.countTags.mockResolvedValue(3);
        const result = await service.countTags(filters, testUserId);
        expect(result).toBe(3);
        expect(repository.countTags).toHaveBeenCalledWith({
          where: { isArchived: true, userId: testUserId },
        });
      });

      it('should handle multiple filters', async () => {
        const filters = { name: 'Test', isSystem: false };
        repository.countTags.mockResolvedValue(1);
        const result = await service.countTags(filters, testUserId);
        expect(result).toBe(1);
        expect(repository.countTags).toHaveBeenCalledWith({
          where: { name: 'Test', isSystem: false, userId: testUserId },
        });
      });
    });
  });
});
