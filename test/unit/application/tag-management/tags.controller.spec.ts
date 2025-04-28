import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from '../../../../src/tags/tags.controller';
import { TagsService } from '../../../../src/tags/tags.service';
import { Tag } from '../../../../src/tags/tags.entity';
import { CreateTagDto, UpdateTagDto } from '../../../../src/tags/tags.dto';

describe.skip('TagsController', () => {
  let controller: TagsController;
  let service: jest.Mocked<TagsService>;

  const mockTag: Tag = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Tag',
    color: '#FF0000',
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
    isArchived: false,
    order: 0,
    user: undefined,
    userId: '',
  };

  const mockCreateTagDto: CreateTagDto = {
    name: 'Test Tag',
    color: '#FF0000',
    description: undefined,
  };

  const mockUpdateTagDto: UpdateTagDto = {
    name: 'Updated Tag',
    color: '#00FF00',
    description: 'Updated description',
  };

  beforeEach(async () => {
    const mockTagsService = {
      getTags: jest.fn(),
      getTagById: jest.fn(),
      createTag: jest.fn(),
      updateTag: jest.fn(),
      deleteTag: jest.fn(),
      findSimilarTags: jest.fn(),
      getTagStats: jest.fn(),
      getMostUsedTags: jest.fn(),
      getUnusedTags: jest.fn(),
    };

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
    service = module.get(TagsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe.skip('getTags', () => {
    it('should return an array of tags', async () => {
      const tags = [mockTag];
      service.getTags.mockResolvedValue(tags);

      const result = await controller.getTags();
      expect(result).toEqual(tags);
      expect(service.getTags).toHaveBeenCalled();
    });
  });

  describe.skip('getTagById', () => {
    it('should return a tag by id', async () => {
      service.getTagById.mockResolvedValue(mockTag);

      const result = await controller.getTagById(mockTag.id);
      expect(result).toEqual(mockTag);
      expect(service.getTagById).toHaveBeenCalledWith(mockTag.id);
    });
  });

  describe.skip('createTag', () => {
    it('should create a new tag', async () => {
      service.createTag.mockResolvedValue(mockTag);

      const result = await controller.createTag(mockCreateTagDto);
      expect(result).toEqual(mockTag);
      expect(service.createTag).toHaveBeenCalledWith(mockCreateTagDto);
    });
  });

  describe.skip('updateTag', () => {
    it('should update a tag', async () => {
      const updatedTag = { ...mockTag, ...mockUpdateTagDto };
      service.updateTag.mockResolvedValue(updatedTag);

      const result = await controller.updateTag(mockTag.id, mockUpdateTagDto);
      expect(result).toEqual(updatedTag);
      expect(service.updateTag).toHaveBeenCalledWith(
        mockTag.id,
        mockUpdateTagDto,
      );
    });
  });

  describe.skip('deleteTag', () => {
    it('should delete a tag', async () => {
      service.deleteTag.mockResolvedValue(undefined);

      await controller.deleteTag(mockTag.id);
      expect(service.deleteTag).toHaveBeenCalledWith(mockTag.id);
    });
  });

  describe.skip('searchTags', () => {
    it('should search tags by name', async () => {
      const searchName = 'Test';
      const tags = [mockTag];
      service.findSimilarTags.mockResolvedValue(tags);

      const result = await controller.searchTags(searchName);
      expect(result).toEqual(tags);
      expect(service.findSimilarTags).toHaveBeenCalledWith(searchName);
    });
  });

  describe.skip('getTagStats', () => {
    it('should return tag statistics', async () => {
      const stats = [{ tag: mockTag, taskCount: 5 }];
      service.getTagStats.mockResolvedValue(stats);

      const result = await controller.getTagStats();
      expect(result).toEqual(stats);
      expect(service.getTagStats).toHaveBeenCalled();
    });
  });

  describe.skip('getMostUsedTags', () => {
    it('should return most used tags with limit', async () => {
      const limit = 5;
      const stats = [{ tag: mockTag, taskCount: 10 }];
      service.getMostUsedTags.mockResolvedValue(stats);

      const result = await controller.getMostUsedTags(limit);
      expect(result).toEqual(stats);
      expect(service.getMostUsedTags).toHaveBeenCalledWith(limit);
    });

    it('should return most used tags without limit', async () => {
      const stats = [{ tag: mockTag, taskCount: 10 }];
      service.getMostUsedTags.mockResolvedValue(stats);

      const result = await controller.getMostUsedTags(undefined);
      expect(result).toEqual(stats);
      expect(service.getMostUsedTags).toHaveBeenCalledWith(undefined);
    });
  });

  describe.skip('getUnusedTags', () => {
    it('should return unused tags', async () => {
      const tags = [mockTag];
      service.getUnusedTags.mockResolvedValue(tags);

      const result = await controller.getUnusedTags();
      expect(result).toEqual(tags);
      expect(service.getUnusedTags).toHaveBeenCalled();
    });
  });
});
