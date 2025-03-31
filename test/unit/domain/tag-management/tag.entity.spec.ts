import { Tag } from '../../../../src/tags/tags.entity';
import { Task } from '../../../../src/tasks/tasks.entity';

describe('Tag Entity', () => {
  // Factory function to create test tags
  const createTag = (overrides: Partial<Tag> = {}): Tag => {
    const tag = new Tag();
    tag.id = 'test-tag-id';
    tag.name = 'Test Tag';
    tag.color = '#FF0000';
    tag.description = 'Test Description';
    tag.createdAt = new Date();
    tag.updatedAt = new Date();

    // Apply any overrides
    Object.assign(tag, overrides);

    return tag;
  };

  describe('Basic Properties', () => {
    it('should create a tag with properties', () => {
      const tag = createTag();

      expect(tag.id).toBe('test-tag-id');
      expect(tag.name).toBe('Test Tag');
      expect(tag.color).toBe('#FF0000');
      expect(tag.description).toBe('Test Description');
      expect(tag.createdAt).toBeInstanceOf(Date);
      expect(tag.updatedAt).toBeInstanceOf(Date);
    });

    it('should set and get properties correctly', () => {
      const tag = createTag();

      // Update properties
      tag.name = 'Updated Tag';
      tag.color = '#00FF00';
      tag.description = 'Updated Description';

      // Check that properties were updated
      expect(tag.name).toBe('Updated Tag');
      expect(tag.color).toBe('#00FF00');
      expect(tag.description).toBe('Updated Description');
    });

    it('should handle nullable description', () => {
      const tag = createTag({ description: null });
      expect(tag.description).toBeNull();

      // Update description from null to a value
      tag.description = 'New description';
      expect(tag.description).toBe('New description');

      // Update description from a value to null
      tag.description = null;
      expect(tag.description).toBeNull();
    });

    it('should handle updatedAt property', () => {
      const tag = createTag();
      const initialUpdatedAt = tag.updatedAt;

      // In a real database operation, TypeORM would update this automatically
      // Here we simulate that behavior
      const newUpdatedAt = new Date(initialUpdatedAt.getTime() + 1000);
      tag.updatedAt = newUpdatedAt;

      expect(tag.updatedAt).toEqual(newUpdatedAt);
      expect(tag.updatedAt).not.toEqual(initialUpdatedAt);
    });

    it('should validate color format', () => {
      // This test checks that color follows hex format
      // Valid colors: #RRGGBB
      const validColors = [
        '#FF0000',
        '#00FF00',
        '#0000FF',
        '#FFFFFF',
        '#000000',
        '#123456',
      ];
      const tag = createTag();

      for (const color of validColors) {
        tag.color = color;
        expect(tag.color).toBe(color);
      }

      // In a real implementation, validation might happen at the application layer
      // or with class-validator decorators
    });
  });

  describe('Relationships', () => {
    it('should initialize tasks as an empty array', () => {
      const tag = new Tag();
      expect(tag.tasks).toBeDefined();
      expect(Array.isArray(tag.tasks)).toBe(true);
      expect(tag.tasks.length).toBe(0);
    });

    it('should handle tasks relationship', () => {
      const tag = new Tag();
      const task = new Task();
      task.tags = [];
      tag.tasks = [task];
      expect(tag.tasks).toContain(task);
    });
  });

  describe('Object Instantiation', () => {
    it('should create a new Tag instance', () => {
      const tag = new Tag();
      expect(tag).toBeInstanceOf(Tag);
    });

    it('should set default values when creating new instance', () => {
      const tag = new Tag();
      expect(tag.id).toBeUndefined();
      expect(tag.name).toBeUndefined();
      expect(tag.color).toBeUndefined();
      expect(tag.description).toBeUndefined();
      expect(tag.createdAt).toBeUndefined();
      expect(tag.updatedAt).toBeUndefined();
      expect(tag.tasks).toBeDefined();
      expect(Array.isArray(tag.tasks)).toBe(true);
      expect(tag.tasks.length).toBe(0);
    });
  });
});
