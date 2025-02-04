import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { TagsRepository } from '../tags/tags.repository';

describe('TaskService', () => {
  let service: TaskService;
  let tasksRepository: TasksRepository;
  let projectsRepository: ProjectsRepository;
  let tagsRepository: TagsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: TasksRepository,
          useValue: {
            getTasks: jest.fn(),
            getTaskById: jest.fn(),
          },
        },
        {
          provide: ProjectsRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: TagsRepository,
          useValue: {
            findByIds: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    tasksRepository = module.get<TasksRepository>(TasksRepository);
    projectsRepository = module.get<ProjectsRepository>(ProjectsRepository);
    tagsRepository = module.get<TagsRepository>(TagsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
