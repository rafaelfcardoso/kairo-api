import { Project, ProjectType } from '../../../../src/projects/projects.entity';
import { Task, TaskStatus } from '../../../../src/tasks/tasks.entity';

describe('Project Entity', () => {
  let project: Project;

  beforeEach(() => {
    project = new Project();
    project.id = 'test-uuid';
    project.name = 'Test Project';
    project.description = 'Test Description';
    project.isArchived = false;
    project.isSystem = false;
    project.type = ProjectType.REGULAR;
    project.color = '#FF5733';
    project.order = 1;
    project.createdAt = new Date();
    project.updatedAt = new Date();
  });

  describe('Basic Properties', () => {
    it('should have correct property values', () => {
      expect(project.id).toEqual('test-uuid');
      expect(project.name).toEqual('Test Project');
      expect(project.description).toEqual('Test Description');
      expect(project.isArchived).toEqual(false);
      expect(project.isSystem).toEqual(false);
      expect(project.type).toEqual(ProjectType.REGULAR);
      expect(project.color).toEqual('#FF5733');
      expect(project.order).toEqual(1);
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Project Types', () => {
    it('should support INBOX project type', () => {
      project.type = ProjectType.INBOX;
      expect(project.type).toEqual(ProjectType.INBOX);
    });

    it('should support REGULAR project type', () => {
      project.type = ProjectType.REGULAR;
      expect(project.type).toEqual(ProjectType.REGULAR);
    });

    it('should support ARCHIVE project type', () => {
      project.type = ProjectType.ARCHIVE;
      expect(project.type).toEqual(ProjectType.ARCHIVE);
    });
  });

  describe('Tree Structure', () => {
    it('should support parent-child relationships', () => {
      const parentProject = new Project();
      parentProject.id = 'parent-uuid';
      parentProject.name = 'Parent Project';

      const childProject1 = new Project();
      childProject1.id = 'child1-uuid';
      childProject1.name = 'Child Project 1';

      const childProject2 = new Project();
      childProject2.id = 'child2-uuid';
      childProject2.name = 'Child Project 2';

      // Set up relationships
      parentProject.children = [childProject1, childProject2];
      childProject1.parent = parentProject;
      childProject2.parent = parentProject;

      // Verify parent-child relationships
      expect(parentProject.children).toHaveLength(2);
      expect(parentProject.children[0].id).toEqual('child1-uuid');
      expect(parentProject.children[1].id).toEqual('child2-uuid');

      expect(childProject1.parent).toBe(parentProject);
      expect(childProject2.parent).toBe(parentProject);
    });

    it('should support nested hierarchies', () => {
      const grandparentProject = new Project();
      grandparentProject.id = 'grandparent-uuid';
      grandparentProject.name = 'Grandparent Project';

      const parentProject = new Project();
      parentProject.id = 'parent-uuid';
      parentProject.name = 'Parent Project';

      const childProject = new Project();
      childProject.id = 'child-uuid';
      childProject.name = 'Child Project';

      // Set up relationships
      grandparentProject.children = [parentProject];
      parentProject.parent = grandparentProject;
      parentProject.children = [childProject];
      childProject.parent = parentProject;

      // Verify hierarchical relationships
      expect(grandparentProject.children).toHaveLength(1);
      expect(grandparentProject.children[0].id).toEqual('parent-uuid');
      expect(grandparentProject.children[0].children).toHaveLength(1);
      expect(grandparentProject.children[0].children[0].id).toEqual(
        'child-uuid',
      );

      expect(childProject.parent).toBe(parentProject);
      expect(parentProject.parent).toBe(grandparentProject);
    });
  });

  describe('Task Relationship', () => {
    it('should manage a collection of tasks', () => {
      const task1 = new Task();
      task1.id = 'task1-uuid';
      task1.title = 'Task 1';
      task1.status = TaskStatus.NOT_STARTED;

      const task2 = new Task();
      task2.id = 'task2-uuid';
      task2.title = 'Task 2';
      task2.status = TaskStatus.COMPLETED;

      // Set up relationship
      project.tasks = [task1, task2];
      task1.project = project;
      task2.project = project;

      // Verify relationship
      expect(project.tasks).toHaveLength(2);
      expect(project.tasks[0].id).toEqual('task1-uuid');
      expect(project.tasks[1].id).toEqual('task2-uuid');

      expect(task1.project).toBe(project);
      expect(task2.project).toBe(project);
    });
  });

  describe('Computed Properties', () => {
    it('should calculate task counts correctly', () => {
      // Set up tasks
      const task1 = new Task();
      task1.id = 'task1-uuid';
      task1.title = 'Task 1';
      task1.status = TaskStatus.NOT_STARTED;

      const task2 = new Task();
      task2.id = 'task2-uuid';
      task2.title = 'Task 2';
      task2.status = TaskStatus.COMPLETED;

      const task3 = new Task();
      task3.id = 'task3-uuid';
      task3.title = 'Task 3';
      task3.status = TaskStatus.COMPLETED;

      // Set up relationship
      project.tasks = [task1, task2, task3];

      // Set computed properties (these would normally be calculated by a service)
      project.tasksCount = project.tasks.length;
      project.completedTasksCount = project.tasks.filter(
        (task) => task.status === TaskStatus.COMPLETED,
      ).length;
      project.progress =
        (project.completedTasksCount / project.tasksCount) * 100;

      // Verify computed properties
      expect(project.tasksCount).toEqual(3);
      expect(project.completedTasksCount).toEqual(2);
      expect(project.progress).toBeCloseTo(66.67, 2);
    });
  });

  describe('System Projects', () => {
    it('should properly identify system projects', () => {
      const inboxProject = new Project();
      inboxProject.name = 'Inbox';
      inboxProject.type = ProjectType.INBOX;
      inboxProject.isSystem = true;

      expect(inboxProject.isSystem).toEqual(true);
      expect(inboxProject.type).toEqual(ProjectType.INBOX);
    });
  });
});
