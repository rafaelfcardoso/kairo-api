import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository, In, ILike } from 'typeorm';
import { TagsRepository } from '../../../../src/tags/tags.repository';
import { Tag } from '../../../../src/tags/tags.entity';
import { NotFoundException } from '@nestjs/common';
import { CreateTagDto, UpdateTagDto } from '../../../../src/tags/tags.dto';
import {
  Task,
  TaskStatus,
  TaskPriority,
} from '../../../../src/tasks/tasks.entity';

describe('TagsRepository', () => {
  let repository: TagsRepository;
  let mockRepository: jest.Mocked<Repository<Tag>>;
  let dataSource: jest.Mocked<DataSource>;

  // Mock task data
  const mockTask: Task = {
    id: 'test-task-id',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.NOT_STARTED,
    priority: TaskPriority.NONE,
    needsReminder: false,
    reminderMessage: null,
    recurrenceRule: null,
    dueDate: null,
    nextDueDate: null,
    hasTime: false,
    isRecurring: false,
    recurrencePattern: null,
    recurrenceDays: null,
    recurrenceTimeOfDay: null,
    recurrenceTime: null,
    recurringParentId: null,
    estimatedMinutes: 0,
    isArchived: false,
    project: null,
    tags: [],
    focusSessions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    isCompleted: false,
  };

  // Mock tag data
  const mockTag: Tag = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Tag',
    color: '#FF0000',
    description: 'Test Description',
    createdAt: new Date('2025-03-31T10:50:25.376Z'),
    updatedAt: new Date('2025-03-31T10:50:25.376Z'),
    tasks: [],
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

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<Tag>>;

    dataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = module.get<TagsRepository>(TagsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getTags', () => {
    it('should return all tags with tasks', async () => {
      mockRepository.find.mockResolvedValue([mockTag]);

      const result = await repository.getTags();

      expect(result).toEqual([mockTag]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ['tasks'],
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no tags exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await repository.getTags();

      expect(result).toEqual([]);
    });
  });

  describe('getTagById', () => {
    it('should return a tag by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockTag);

      const result = await repository.getTagById(mockTag.id);

      expect(result).toEqual(mockTag);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTag.id },
        relations: ['tasks'],
      });
    });

    it('should throw NotFoundException when tag not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(repository.getTagById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTag', () => {
    it('should create and return a new tag', async () => {
      const createdTag = { ...mockTag, ...mockCreateTagDto };
      mockRepository.create.mockReturnValue(createdTag);
      mockRepository.save.mockResolvedValue(createdTag);
      mockRepository.findOne.mockResolvedValue(createdTag);

      const result = await repository.createTag(mockCreateTagDto);

      expect(result).toEqual(createdTag);
      expect(mockRepository.create).toHaveBeenCalledWith(mockCreateTagDto);
      expect(mockRepository.save).toHaveBeenCalledWith(createdTag);
    });

    it('should throw error if save fails', async () => {
      mockRepository.create.mockReturnValue(mockTag);
      mockRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(repository.createTag(mockCreateTagDto)).rejects.toThrow(
        'Save failed',
      );
    });
  });

  describe('updateTag', () => {
    it('should update and return a tag', async () => {
      const updatedTag = { ...mockTag, ...mockUpdateTagDto };
      mockRepository.findOne.mockResolvedValueOnce(mockTag);
      mockRepository.save.mockResolvedValue(updatedTag);
      mockRepository.findOne.mockResolvedValueOnce(updatedTag);

      const result = await repository.updateTag(mockTag.id, mockUpdateTagDto);

      expect(result).toEqual(updatedTag);
      expect(mockRepository.save).toHaveBeenCalledWith(updatedTag);
    });

    it('should throw NotFoundException when updating non-existent tag', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.updateTag('non-existent-id', mockUpdateTagDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      mockRepository.findOne.mockResolvedValue(mockTag);
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await repository.deleteTag(mockTag.id);

      expect(mockRepository.delete).toHaveBeenCalledWith(mockTag.id);
    });

    it('should throw NotFoundException when deleting non-existent tag', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(repository.deleteTag('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTagsByIds', () => {
    it('should return tags by ids', async () => {
      const tags = [mockTag];
      mockRepository.find.mockResolvedValue(tags);

      const result = await repository.getTagsByIds([mockTag.id]);

      expect(result).toEqual(tags);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { id: In([mockTag.id]) },
        relations: ['tasks'],
      });
    });

    it('should throw NotFoundException when not all tags are found', async () => {
      mockRepository.find.mockResolvedValue([mockTag]); // Only one tag found

      await expect(
        repository.getTagsByIds([mockTag.id, 'non-existent-id']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTagStats', () => {
    it('should return tag statistics', async () => {
      const tagWithTasks = {
        ...mockTag,
        tasks: [mockTask, mockTask],
      };
      mockRepository.find.mockResolvedValue([tagWithTasks]);

      const result = await repository.getTagStats();

      expect(result).toEqual([
        {
          tag: tagWithTasks,
          taskCount: 2,
        },
      ]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ['tasks'],
      });
    });

    it('should handle tags with no tasks', async () => {
      mockRepository.find.mockResolvedValue([mockTag]);

      const result = await repository.getTagStats();

      expect(result).toEqual([
        {
          tag: mockTag,
          taskCount: 0,
        },
      ]);
    });
  });

  describe('findSimilarTags', () => {
    it('should return similar tags', async () => {
      mockRepository.find.mockResolvedValue([mockTag]);

      const result = await repository.findSimilarTags('Test');

      expect(result).toEqual([mockTag]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { name: ILike('%Test%') },
        relations: ['tasks'],
      });
    });

    it('should handle special characters in search', async () => {
      mockRepository.find.mockResolvedValue([]);

      await repository.findSimilarTags('Test#Tag%');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { name: ILike('%Test#Tag%%') },
        relations: ['tasks'],
      });
    });
  });

  describe('countTags', () => {
    it('should count tags with filters', async () => {
      mockRepository.count.mockResolvedValue(5);
      const where = { name: ILike('%Test%'), color: '#FF0000' };

      const result = await repository.countTags(where);

      expect(result).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({ where });
    });

    it('should count all tags when no filters provided', async () => {
      mockRepository.count.mockResolvedValue(10);

      const result = await repository.countTags({});

      expect(result).toBe(10);
      expect(mockRepository.count).toHaveBeenCalledWith({ where: {} });
    });
  });
});
