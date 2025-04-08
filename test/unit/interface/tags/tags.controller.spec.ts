import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from '../../../../src/tags/tags.controller';
import { TagsService } from '../../../../src/tags/tags.service';
import { NotFoundException } from '@nestjs/common';
import { CreateTagDto, UpdateTagDto } from '../../../../src/tags/tags.dto';
import { Tag } from '../../../../src/tags/tags.entity';
import { v4 as uuidv4 } from 'uuid';
import { mockRequest, mockUser } from '../../../mocks/request.mock';

describe('TagsController', () => {
  let controller: TagsController;
  let tagsService: TagsService;

  const mockTagsService = {
    getTags: jest.fn(),
    findSimilarTags: jest.fn(),
    getTagStats: jest.fn(),
    getMostUsedTags: jest.fn(),
    getUnusedTags: jest.fn(),
    getTagById: jest.fn(),
    createTag: jest.fn(),
    updateTag: jest.fn(),
    deleteTag: jest.fn(),
  };

  const mockTag: Tag = {
    id: uuidv4(),
    name: 'Important',
    color: '#FF0000',
    description: 'For high-priority items',
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
    isSystem: false,
    isArchived: false,
    order: 0,
    user: mockUser,
    userId: mockUser.id,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: mockTagsService,
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    tagsService = module.get<TagsService>(TagsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTags', () => {
    it('should return all tags', async () => {
      mockTagsService.getTags.mockResolvedValue([mockTag]);

      const result = await controller.getTags(mockRequest);

      expect(result).toEqual([mockTag]);
      expect(tagsService.getTags).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('searchTags', () => {
    it('should return matching tags', async () => {
      const searchTerm = 'import';
      mockTagsService.findSimilarTags.mockResolvedValue([mockTag]);

      const result = await controller.searchTags(searchTerm, mockRequest);

      expect(result).toEqual([mockTag]);
      expect(tagsService.findSimilarTags).toHaveBeenCalledWith(
        searchTerm,
        mockUser.id,
      );
    });
  });

  describe('getTagStats', () => {
    it('should return tag usage statistics', async () => {
      const tagStats = [{ tag: mockTag, taskCount: 5 }];
      mockTagsService.getTagStats.mockResolvedValue(tagStats);

      const result = await controller.getTagStats(mockRequest);

      expect(result).toEqual(tagStats);
      expect(tagsService.getTagStats).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getMostUsedTags', () => {
    it('should return most used tags with default limit', async () => {
      const tagStats = [{ tag: mockTag, taskCount: 10 }];
      mockTagsService.getMostUsedTags.mockResolvedValue(tagStats);

      const result = await controller.getMostUsedTags(mockRequest);

      expect(result).toEqual(tagStats);
      expect(tagsService.getMostUsedTags).toHaveBeenCalledWith(
        undefined,
        mockUser.id,
      );
    });

    it('should return most used tags with specified limit', async () => {
      const limit = 5;
      const tagStats = [{ tag: mockTag, taskCount: 10 }];
      mockTagsService.getMostUsedTags.mockResolvedValue(tagStats);

      const result = await controller.getMostUsedTags(mockRequest, limit);

      expect(result).toEqual(tagStats);
      expect(tagsService.getMostUsedTags).toHaveBeenCalledWith(
        limit,
        mockUser.id,
      );
    });
  });

  describe('getUnusedTags', () => {
    it('should return unused tags', async () => {
      mockTagsService.getUnusedTags.mockResolvedValue([mockTag]);

      const result = await controller.getUnusedTags(mockRequest);

      expect(result).toEqual([mockTag]);
      expect(tagsService.getUnusedTags).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getTagById', () => {
    it('should return a tag by id', async () => {
      mockTagsService.getTagById.mockResolvedValue(mockTag);

      const result = await controller.getTagById(mockTag.id, mockRequest);

      expect(result).toEqual(mockTag);
      expect(tagsService.getTagById).toHaveBeenCalledWith(
        mockTag.id,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when tag is not found', async () => {
      const id = 'non-existent-id';
      mockTagsService.getTagById.mockRejectedValue(new NotFoundException());

      await expect(controller.getTagById(id, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
      expect(tagsService.getTagById).toHaveBeenCalledWith(id, mockUser.id);
    });
  });

  describe('createTag', () => {
    it('should create a tag', async () => {
      const createDto: CreateTagDto = {
        name: 'New Tag',
        color: '#00FF00',
        description: 'A new tag',
      };

      mockTagsService.createTag.mockResolvedValue({
        ...mockTag,
        id: uuidv4(),
        name: createDto.name,
        color: createDto.color,
        description: createDto.description,
      });

      const result = await controller.createTag(createDto, mockRequest);

      expect(result.name).toEqual(createDto.name);
      expect(result.color).toEqual(createDto.color);
      expect(result.description).toEqual(createDto.description);
      expect(tagsService.createTag).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
      );
    });
  });

  describe('updateTag', () => {
    it('should update a tag', async () => {
      const updateDto: UpdateTagDto = {
        name: 'Updated Tag',
        color: '#0000FF',
      };

      const updatedTag = {
        ...mockTag,
        name: updateDto.name,
        color: updateDto.color,
      };

      mockTagsService.updateTag.mockResolvedValue(updatedTag);

      const result = await controller.updateTag(
        mockTag.id,
        updateDto,
        mockRequest,
      );

      expect(result).toEqual(updatedTag);
      expect(tagsService.updateTag).toHaveBeenCalledWith(
        mockTag.id,
        updateDto,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when tag does not exist', async () => {
      const id = 'non-existent-id';
      const updateDto: UpdateTagDto = {
        name: 'Updated Tag',
      };

      mockTagsService.updateTag.mockRejectedValue(new NotFoundException());

      await expect(
        controller.updateTag(id, updateDto, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      mockTagsService.deleteTag.mockResolvedValue(undefined);

      await controller.deleteTag(mockTag.id, mockRequest);

      expect(tagsService.deleteTag).toHaveBeenCalledWith(
        mockTag.id,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when tag does not exist', async () => {
      const id = 'non-existent-id';
      mockTagsService.deleteTag.mockRejectedValue(new NotFoundException());

      await expect(controller.deleteTag(id, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
      expect(tagsService.deleteTag).toHaveBeenCalledWith(id, mockUser.id);
    });
  });
});
