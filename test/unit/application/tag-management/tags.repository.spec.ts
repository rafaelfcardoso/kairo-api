import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository, ILike, In } from 'typeorm';
import { TagsRepository } from '../../../../src/tags/tags.repository';
import { Tag } from '../../../../src/tags/tags.entity';
import { CreateTagDto, UpdateTagDto } from '../../../../src/tags/tags.dto';
import { NotFoundException } from '@nestjs/common';
import {
  Task,
  TaskStatus,
  TaskPriority,
} from '../../../../src/tasks/tasks.entity';

describe('TagsRepository', () => {
  let repository: TagsRepository;
  let mockTypeOrmRepository: jest.Mocked<Repository<Tag>>;

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
    mockTypeOrmRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<Tag>>;

    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockTypeOrmRepository),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<TagsRepository>(TagsRepository);
  });

  describe('getTags', () => {
    it('should return an array of tags', async () => {
      const tags = [mockTag];
      mockTypeOrmRepository.find.mockResolvedValue(tags);

      const result = await repository.getTags();
      expect(result).toEqual(tags);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        relations: ['tasks'],
        order: { name: 'ASC' },
      });
    });
  });

  describe('getTagById', () => {
    it('should return a tag if found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(mockTag);

      const result = await repository.getTagById('test-tag-id');
      expect(result).toEqual(mockTag);
      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-tag-id' },
        relations: ['tasks'],
      });
    });

    it('should throw NotFoundException if tag not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      await expect(repository.getTagById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTag', () => {
    it('should create and return a new tag', async () => {
      const createdTag = { ...mockTag };
      mockTypeOrmRepository.create.mockReturnValue(createdTag);
      mockTypeOrmRepository.save.mockResolvedValue(createdTag);
      mockTypeOrmRepository.findOne.mockResolvedValue(createdTag);

      const result = await repository.createTag(mockCreateTagDto);
      expect(result).toEqual(createdTag);
      expect(mockTypeOrmRepository.create).toHaveBeenCalledWith(
        mockCreateTagDto,
      );
      expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(createdTag);
    });
  });

  describe('updateTag', () => {
    it('should update and return the updated tag', async () => {
      const updatedTag = { ...mockTag, ...mockUpdateTagDto };
      mockTypeOrmRepository.findOne.mockResolvedValue(mockTag);
      mockTypeOrmRepository.save.mockResolvedValue(updatedTag);

      const result = await repository.updateTag(
        'test-tag-id',
        mockUpdateTagDto,
      );
      expect(result).toEqual(updatedTag);
      expect(mockTypeOrmRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tag to update not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.updateTag('non-existent-id', mockUpdateTagDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(mockTag);
      mockTypeOrmRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await repository.deleteTag('test-tag-id');
      expect(mockTypeOrmRepository.delete).toHaveBeenCalledWith('test-tag-id');
    });

    it('should throw NotFoundException if tag to delete not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      await expect(repository.deleteTag('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTagsByIds', () => {
    it('should return tags by array of ids', async () => {
      const tags = [mockTag];
      mockTypeOrmRepository.find.mockResolvedValue(tags);

      const result = await repository.getTagsByIds(['test-tag-id']);
      expect(result).toEqual(tags);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where: { id: In(['test-tag-id']) },
        relations: ['tasks'],
      });
    });

    it('should throw NotFoundException if not all tags are found', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([mockTag]);

      await expect(
        repository.getTagsByIds(['test-tag-id', 'non-existent-id']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTagStats', () => {
    it('should return tag statistics', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description 1',
          status: TaskStatus.NOT_STARTED,
          priority: TaskPriority.NONE,
          dueDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          project: null,
          tags: [],
          hasTime: false,
          isRecurring: false,
          recurrenceRule: null,
          nextDueDate: null,
          needsReminder: false,
          reminderMessage: null,
          recurrencePattern: null,
          recurrenceDays: null,
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
          estimatedMinutes: 0,
          isArchived: false,
          focusSessions: [],
        } as Task,
        {
          id: 'task-2',
          title: 'Task 2',
          description: 'Description 2',
          status: TaskStatus.NOT_STARTED,
          priority: TaskPriority.NONE,
          dueDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          project: null,
          tags: [],
          hasTime: false,
          isRecurring: false,
          recurrenceRule: null,
          nextDueDate: null,
          needsReminder: false,
          reminderMessage: null,
          recurrencePattern: null,
          recurrenceDays: null,
          recurrenceTimeOfDay: null,
          recurrenceTime: null,
          recurringParentId: null,
          estimatedMinutes: 0,
          isArchived: false,
          focusSessions: [],
        } as Task,
      ];
      const tags = [{ ...mockTag, tasks: mockTasks }];
      mockTypeOrmRepository.find.mockResolvedValue(tags);

      const result = await repository.getTagStats();
      expect(result).toEqual([{ tag: tags[0], taskCount: 2 }]);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        relations: ['tasks'],
      });
    });
  });

  describe('findSimilarTags', () => {
    it('should return similar tags by name', async () => {
      const tags = [mockTag];
      mockTypeOrmRepository.find.mockResolvedValue(tags);

      const result = await repository.findSimilarTags('Test');
      expect(result).toEqual(tags);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where: { name: ILike('%Test%') },
        relations: ['tasks'],
      });
    });
  });

  describe('countTags', () => {
    it('should count tags with given criteria', async () => {
      const count = 5;
      mockTypeOrmRepository.count.mockResolvedValue(count);
      const where = { name: ILike('%Test%') };

      const result = await repository.countTags(where);
      expect(result).toBe(count);
      expect(mockTypeOrmRepository.count).toHaveBeenCalledWith({ where });
    });
  });
});
