import { Tag } from '../../../../src/tags/tags.entity';
import { Task } from '../../../../src/tasks/tasks.entity';

describe('Tag', () => {
  let tag: Tag;
  let task: Task;

  beforeEach(() => {
    tag = new Tag();
    tag.tasks = [];
    task = new Task();
    task.id = '123';
    task.title = 'Test Task';
    task.tags = [];
  });

  it('should create a tag instance', () => {
    expect(tag).toBeDefined();
  });

  it('should initialize tasks as an empty array', () => {
    expect(tag.tasks).toBeDefined();
    expect(Array.isArray(tag.tasks)).toBe(true);
    expect(tag.tasks.length).toBe(0);
  });

  it('should allow adding tasks', () => {
    tag.tasks.push(task);
    expect(tag.tasks).toContain(task);
  });

  it('should allow removing tasks', () => {
    tag.tasks.push(task);
    expect(tag.tasks).toContain(task);

    tag.tasks = tag.tasks.filter((t) => t.id !== task.id);
    expect(tag.tasks).not.toContain(task);
  });

  it('should allow setting tag properties', () => {
    tag.id = '123';
    tag.name = 'Test Tag';
    tag.color = '#FF0000';
    tag.description = 'Test Description';
    tag.createdAt = new Date();
    tag.updatedAt = new Date();

    expect(tag.id).toBe('123');
    expect(tag.name).toBe('Test Tag');
    expect(tag.color).toBe('#FF0000');
    expect(tag.description).toBe('Test Description');
    expect(tag.createdAt).toBeDefined();
    expect(tag.updatedAt).toBeDefined();
  });

  it('should maintain bidirectional relationship with tasks', () => {
    tag.tasks.push(task);
    task.tags.push(tag);

    expect(tag.tasks[0]).toBe(task);
    expect(task.tags[0]).toBe(tag);
  });

  it('should handle multiple tasks in the relationship', () => {
    const task2 = new Task();
    task2.id = '456';
    task2.title = 'Another Task';
    task2.tags = [];

    tag.tasks.push(task);
    tag.tasks.push(task2);
    task.tags.push(tag);
    task2.tags.push(tag);

    expect(tag.tasks).toContain(task);
    expect(tag.tasks).toContain(task2);
    expect(task.tags).toContain(tag);
    expect(task2.tags).toContain(tag);
  });
});
