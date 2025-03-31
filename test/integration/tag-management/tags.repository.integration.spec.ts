import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { TagsRepository } from '../../../src/tags/tags.repository';
import { Tag } from '../../database/test-entities/tag.entity';
import { TestDatabaseModule } from '../../database/test-database.module';
import { NotFoundException } from '@nestjs/common';
import { TEST_DATA_SOURCE } from '../../database/test-database.providers';

describe('TagsRepository Integration Tests', () => {
  let repository: TagsRepository;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TestDatabaseModule],
      providers: [
        {
          provide: DataSource,
          useFactory: (dataSource: DataSource) => dataSource,
          inject: [TEST_DATA_SOURCE],
        },
        TagsRepository,
      ],
    }).compile();

    repository = module.get<TagsRepository>(TagsRepository);
    dataSource = module.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Start a new transaction before each test
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Replace the repository's DataSource with our transaction's manager
    const repoInstance = module.get<TagsRepository>(TagsRepository);
    Object.defineProperty(repoInstance, 'repository', {
      value: queryRunner.manager.getRepository(Tag),
      writable: true,
    });
  });

  afterEach(async () => {
    // Rollback transaction after each test
    if (queryRunner?.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    if (queryRunner) {
      await queryRunner.release();
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('Transaction Management', () => {
    it('should rollback changes when operation fails', async () => {
      // Create initial tag
      const tag = await repository.createTag({
        name: 'Test Tag',
        color: '#FF0000',
        description: 'Test Description',
      });

      try {
        // Start a transaction
        await queryRunner.startTransaction();

        // Update tag
        await repository.updateTag(tag.id, {
          name: 'Updated Tag',
        });

        // Force an error
        throw new Error('Simulated error');
      } catch (error) {
        await queryRunner.rollbackTransaction();
      }

      // Verify tag wasn't updated
      const unchangedTag = await repository.getTagById(tag.id);
      expect(unchangedTag.name).toBe('Test Tag');
    });

    it('should commit all changes when operation succeeds', async () => {
      // Start a transaction
      await queryRunner.startTransaction();

      // Create a tag
      const tag = await repository.createTag({
        name: 'Transaction Test Tag',
        color: '#00FF00',
        description: 'Test Description',
      });

      // Update the tag
      await repository.updateTag(tag.id, {
        name: 'Updated Transaction Tag',
      });

      // Commit the transaction
      await queryRunner.commitTransaction();

      // Verify changes persisted
      const persistedTag = await repository.getTagById(tag.id);
      expect(persistedTag.name).toBe('Updated Transaction Tag');
    });

    it('should handle concurrent operations', async () => {
      // Create initial tag
      const tag = await repository.createTag({
        name: 'Concurrent Test Tag',
        color: '#0000FF',
        description: 'Test Description',
      });

      // Create two separate query runners for concurrent operations
      const queryRunner1 = dataSource.createQueryRunner();
      const queryRunner2 = dataSource.createQueryRunner();

      await queryRunner1.connect();
      await queryRunner2.connect();

      await queryRunner1.startTransaction();
      await queryRunner2.startTransaction();

      try {
        // Both transactions try to update the same tag
        await Promise.all([
          repository.updateTag(tag.id, { name: 'Update 1' }),
          repository.updateTag(tag.id, { name: 'Update 2' }),
        ]);

        await queryRunner1.commitTransaction();
        await queryRunner2.commitTransaction();
      } catch (error) {
        await queryRunner1.rollbackTransaction();
        await queryRunner2.rollbackTransaction();
      } finally {
        await queryRunner1.release();
        await queryRunner2.release();
      }

      // Verify final state
      const finalTag = await repository.getTagById(tag.id);
      expect(['Update 1', 'Update 2']).toContain(finalTag.name);
    });
  });

  describe('Database Integration', () => {
    it('should perform real database operations', async () => {
      // Create
      const tag = await repository.createTag({
        name: 'Integration Test Tag',
        color: '#FF00FF',
        description: 'Integration Test Description',
      });
      expect(tag.id).toBeDefined();

      // Read
      const foundTag = await repository.getTagById(tag.id);
      expect(foundTag).toBeDefined();
      expect(foundTag.name).toBe('Integration Test Tag');

      // Update
      const updatedTag = await repository.updateTag(tag.id, {
        name: 'Updated Integration Tag',
      });
      expect(updatedTag.name).toBe('Updated Integration Tag');

      // Delete
      await repository.deleteTag(tag.id);
      await expect(repository.getTagById(tag.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle database-specific errors', async () => {
      // Test duplicate name constraint
      const tagData = {
        name: 'Unique Test Tag',
        color: '#FFFFFF',
        description: 'Test Description',
      };

      await repository.createTag(tagData);
      await expect(repository.createTag(tagData)).rejects.toThrow();
    });

    it('should handle complex queries with relations', async () => {
      // Create multiple tags
      const tags = await Promise.all([
        repository.createTag({ name: 'Tag 1', color: '#111111' }),
        repository.createTag({ name: 'Tag 2', color: '#222222' }),
        repository.createTag({ name: 'Tag 3', color: '#333333' }),
      ]);

      // Test getTagStats
      const stats = await repository.getTagStats();
      expect(stats).toHaveLength(3);
      expect(stats[0].tag).toBeDefined();
      expect(typeof stats[0].taskCount).toBe('number');

      // Test findSimilarTags
      const similarTags = await repository.findSimilarTags('Tag');
      expect(similarTags.length).toBeGreaterThan(0);
      expect(similarTags[0].name).toContain('Tag');
    });

    it('should maintain data consistency across operations', async () => {
      // Create initial data
      const tag = await repository.createTag({
        name: 'Consistency Test Tag',
        color: '#CCCCCC',
        description: 'Test Description',
      });

      // Perform multiple operations in transaction
      await queryRunner.startTransaction();
      try {
        await repository.updateTag(tag.id, { name: 'Updated Name' });
        await repository.updateTag(tag.id, { color: '#DDDDDD' });
        await repository.updateTag(tag.id, {
          description: 'Updated Description',
        });
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      }

      // Verify final state
      const finalTag = await repository.getTagById(tag.id);
      expect(finalTag).toEqual(
        expect.objectContaining({
          name: 'Updated Name',
          color: '#DDDDDD',
          description: 'Updated Description',
        }),
      );
    });
  });
});
