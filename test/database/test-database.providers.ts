import { DataSource } from 'typeorm';
import { Tag } from './test-entities/tag.entity';
import { Task } from './test-entities/task.entity';
import { Project } from './test-entities/project.entity';
import { FocusSession } from './test-entities/focus-session.entity';

export const TEST_DATA_SOURCE = 'DATA_SOURCE';

export const testDatabaseProviders = [
  {
    provide: TEST_DATA_SOURCE,
    useFactory: async () => {
      const dataSource = new DataSource({
        type: 'sqlite',
        database: ':memory:',
        entities: [Tag, Task, Project, FocusSession],
        synchronize: true,
        dropSchema: true,
        logging: false,
      });

      return dataSource.initialize();
    },
  },
];
