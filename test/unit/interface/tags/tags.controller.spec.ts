import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from '../../../../src/tags/tags.controller';
import { TagsService } from '../../../../src/tags/tags.service';
import { NotFoundException } from '@nestjs/common';
import { CreateTagDto, UpdateTagDto } from '../../../../src/tags/tags.dto';
import { Tag } from '../../../../src/tags/tags.entity';
import { v4 as uuidv4 } from 'uuid';

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
    getGoalTags: jest.fn(),
    toggleGoalStatus: jest.fn(),
  };

  const mockTag: Tag = {
    id: uuidv4(),
    name: 'Important',
    color: '#FF0000',
    description: 'For high-priority items',
    isGoal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
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

      const result = await controller.getTags();

      expect(result).toEqual([mockTag]);
      expect(tagsService.getTags).toHaveBeenCalled();
    });
  });

  describe('searchTags', () => {
    it('should return matching tags', async () => {
      const searchTerm = 'import';
      mockTagsService.findSimilarTags.mockResolvedValue([mockTag]);

      const result = await controller.searchTags(searchTerm);

      expect(result).toEqual([mockTag]);
      expect(tagsService.findSimilarTags).toHaveBeenCalledWith(searchTerm);
    });
  });

  describe('getTagStats', () => {
    it('should return tag usage statistics', async () => {
      const tagStats = [{ tag: mockTag, taskCount: 5 }];
      mockTagsService.getTagStats.mockResolvedValue(tagStats);

      const result = await controller.getTagStats();

      expect(result).toEqual(tagStats);
      expect(tagsService.getTagStats).toHaveBeenCalled();
    });
  });

  describe('getMostUsedTags', () => {
    it('should return most used tags with default limit', async () => {
      const tagStats = [{ tag: mockTag, taskCount: 10 }];
      mockTagsService.getMostUsedTags.mockResolvedValue(tagStats);

      const result = await controller.getMostUsedTags();

      expect(result).toEqual(tagStats);
      expect(tagsService.getMostUsedTags).toHaveBeenCalledWith(undefined);
    });

    it('should return most used tags with specified limit', async () => {
      const limit = 5;
      const tagStats = [{ tag: mockTag, taskCount: 10 }];
      mockTagsService.getMostUsedTags.mockResolvedValue(tagStats);

      const result = await controller.getMostUsedTags(limit);

      expect(result).toEqual(tagStats);
      expect(tagsService.getMostUsedTags).toHaveBeenCalledWith(limit);
    });
  });

  describe('getUnusedTags', () => {
    it('should return unused tags', async () => {
      mockTagsService.getUnusedTags.mockResolvedValue([mockTag]);

      const result = await controller.getUnusedTags();

      expect(result).toEqual([mockTag]);
      expect(tagsService.getUnusedTags).toHaveBeenCalled();
    });
  });

  describe('getTagById', () => {
    it('should return a tag by id', async () => {
      mockTagsService.getTagById.mockResolvedValue(mockTag);

      const result = await controller.getTagById(mockTag.id);

      expect(result).toEqual(mockTag);
      expect(tagsService.getTagById).toHaveBeenCalledWith(mockTag.id);
    });

    it('should throw NotFoundException when tag is not found', async () => {
      const id = 'non-existent-id';
      mockTagsService.getTagById.mockRejectedValue(new NotFoundException());

      await expect(controller.getTagById(id)).rejects.toThrow(
        NotFoundException,
      );
      expect(tagsService.getTagById).toHaveBeenCalledWith(id);
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

      const result = await controller.createTag(createDto);

      expect(result.name).toEqual(createDto.name);
      expect(result.color).toEqual(createDto.color);
      expect(result.description).toEqual(createDto.description);
      expect(tagsService.createTag).toHaveBeenCalledWith(createDto);
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

      const result = await controller.updateTag(mockTag.id, updateDto);

      expect(result).toEqual(updatedTag);
      expect(tagsService.updateTag).toHaveBeenCalledWith(mockTag.id, updateDto);
    });

    it('should throw NotFoundException when tag does not exist', async () => {
      const id = 'non-existent-id';
      const updateDto: UpdateTagDto = {
        name: 'Updated Tag',
      };

      mockTagsService.updateTag.mockRejectedValue(new NotFoundException());

      await expect(controller.updateTag(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(tagsService.updateTag).toHaveBeenCalledWith(id, updateDto);
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      mockTagsService.deleteTag.mockResolvedValue(undefined);

      await controller.deleteTag(mockTag.id);

      expect(tagsService.deleteTag).toHaveBeenCalledWith(mockTag.id);
    });

    it('should throw NotFoundException when tag does not exist', async () => {
      const id = 'non-existent-id';

      mockTagsService.deleteTag.mockRejectedValue(new NotFoundException());

      await expect(controller.deleteTag(id)).rejects.toThrow(NotFoundException);
      expect(tagsService.deleteTag).toHaveBeenCalledWith(id);
    });
  });

  describe('getGoalTags', () => {
    it('should return all goal tags', async () => {
      const goalTag = { ...mockTag, isGoal: true };
      mockTagsService.getGoalTags.mockResolvedValue([goalTag]);

      const result = await controller.getGoalTags();

      expect(result).toEqual([goalTag]);
      expect(tagsService.getGoalTags).toHaveBeenCalled();
    });
  });

  describe('toggleGoalStatus', () => {
    it('should toggle goal status of a tag', async () => {
      const toggled = { ...mockTag, isGoal: true };
      mockTagsService.toggleGoalStatus.mockResolvedValue(toggled);

      const result = await controller.toggleGoalStatus(mockTag.id);

      expect(result).toEqual(toggled);
      expect(tagsService.toggleGoalStatus).toHaveBeenCalledWith(mockTag.id);
    });

    it('should throw NotFoundException when tag does not exist', async () => {
      const id = 'non-existent-id';
      mockTagsService.toggleGoalStatus.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.toggleGoalStatus(id)).rejects.toThrow(
        NotFoundException,
      );
      expect(tagsService.toggleGoalStatus).toHaveBeenCalledWith(id);
    });
  });
});
