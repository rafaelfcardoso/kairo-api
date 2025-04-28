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
import { mockUser } from '../../../mocks/request.mock';

describe.skip('TagsRepository', () => {
  let repository: TagsRepository;
  let mockTypeOrmRepository: jest.Mocked<Repository<Tag>>;
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

      const result = await repository.getTags(testUserId);
      expect(result).toEqual(tags);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where: [{ userId: testUserId }, { isSystem: true }],
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

      const result = await repository.createTag(mockCreateTagDto, testUserId);
      expect(result).toEqual(createdTag);
      expect(mockTypeOrmRepository.create).toHaveBeenCalledWith({
        ...mockCreateTagDto,
        userId: testUserId,
      });
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

      const result = await repository.getTagsByIds(['test-tag-id'], testUserId);
      expect(result).toEqual(tags);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where: { id: In(['test-tag-id']) },
      });
    });

    it('should return empty array if no matching accessible tags are found', async () => {
      const systemTag = {
        ...mockTag,
        id: 'system-tag',
        isSystem: true,
        userId: 'another-user-id',
      };
      const userTagOtherUser = {
        ...mockTag,
        id: 'other-user-tag',
        isSystem: false,
        userId: 'another-user-id',
      };
      mockTypeOrmRepository.find.mockResolvedValue([
        systemTag,
        userTagOtherUser,
      ]);

      const result = await repository.getTagsByIds(
        ['system-tag', 'other-user-tag'],
        testUserId,
      );
      expect(result).toEqual([systemTag]);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where: { id: In(['system-tag', 'other-user-tag']) },
      });
    });

    it('should return accessible tags filtered by userId or isSystem', async () => {
      const userTag = {
        ...mockTag,
        id: 'user-tag',
        userId: testUserId,
        isSystem: false,
      };
      const systemTag = {
        ...mockTag,
        id: 'system-tag',
        userId: 'another-user-id',
        isSystem: true,
      };
      const otherUserTag = {
        ...mockTag,
        id: 'other-user-tag',
        userId: 'another-user-id',
        isSystem: false,
      };

      mockTypeOrmRepository.find.mockResolvedValue([
        userTag,
        systemTag,
        otherUserTag,
      ]);

      const result = await repository.getTagsByIds(
        ['user-tag', 'system-tag', 'other-user-tag'],
        testUserId,
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([userTag, systemTag]));
      expect(result).not.toEqual(expect.arrayContaining([otherUserTag]));

      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where: { id: In(['user-tag', 'system-tag', 'other-user-tag']) },
      });
    });

    it('should return an empty array if ids array is empty', async () => {
      const result = await repository.getTagsByIds([], testUserId);
      expect(result).toEqual([]);
      expect(mockTypeOrmRepository.find).not.toHaveBeenCalled();
    });

    it('should return an empty array if ids array is null', async () => {
      const result = await repository.getTagsByIds(null, testUserId);
      expect(result).toEqual([]);
      expect(mockTypeOrmRepository.find).not.toHaveBeenCalled();
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

      const result = await repository.getTagStats(testUserId);
      expect(result).toEqual([{ tag: tags[0], taskCount: 2 }]);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where: [{ userId: testUserId }, { isSystem: true }],
        relations: ['tasks'],
      });
    });
  });

  describe('findSimilarTags', () => {
    it('should return similar tags by name', async () => {
      const tags = [mockTag];
      mockTypeOrmRepository.find.mockResolvedValue(tags);

      const result = await repository.findSimilarTags('Test', testUserId);
      expect(result).toEqual(tags);
      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where: [
          { name: ILike('%Test%'), userId: testUserId },
          { name: ILike('%Test%'), isSystem: true },
        ],
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
