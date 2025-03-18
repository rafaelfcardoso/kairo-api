import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NlpService } from './nlp.service';
import { NlpFeedback, FeedbackType } from './entities/nlp-feedback.entity';
import { AiService } from '../common/services/ai.service';
import { TaskService } from '../tasks/tasks.service';
import { ProjectsService } from '../projects/projects.service';
import { TagsService } from '../tags/tags.service';
import { AbTestingService } from './services/ab-testing.service';

describe('NlpService', () => {
  let service: NlpService;
  let aiService: AiService;
  let taskService: TaskService;
  let feedbackRepository: Repository<NlpFeedback>;
  let abTestingService: AbTestingService;

  const mockAiService = {
    processNaturalLanguage: jest.fn(),
  };

  const mockTaskService = {
    getTasks: jest.fn(),
  };

  const mockProjectsService = {
    // Add methods as needed
  };

  const mockTagsService = {
    // Add methods as needed
  };

  const mockFeedbackRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockAbTestingService = {
    selectModel: jest.fn().mockReturnValue({
      modelId: 'test-model',
      modelVersion: '1.0.0',
      description: 'Test Model',
      trafficPercentage: 100,
      isActive: true,
    }),
    recordModelPerformance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NlpService,
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: TaskService,
          useValue: mockTaskService,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: TagsService,
          useValue: mockTagsService,
        },
        {
          provide: AbTestingService,
          useValue: mockAbTestingService,
        },
        {
          provide: getRepositoryToken(NlpFeedback),
          useValue: mockFeedbackRepository,
        },
      ],
    }).compile();

    service = module.get<NlpService>(NlpService);
    aiService = module.get<AiService>(AiService);
    taskService = module.get<TaskService>(TaskService);
    feedbackRepository = module.get<Repository<NlpFeedback>>(
      getRepositoryToken(NlpFeedback),
    );
    abTestingService = module.get<AbTestingService>(AbTestingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseTask', () => {
    it('should process natural language and return structured task data', async () => {
      // Arrange
      const request = {
        text: 'Finish project report by Friday',
        userId: 'test-user-id',
        parseRecurrence: true,
      };

      const mockAiResponse = {
        analysis: {
          title: 'Finish project report',
          description: '',
          due_date: '2023-08-25T00:00:00.000Z',
          priority: 'medium',
          projects: ['work'],
          tags: ['reports'],
          warning: null,
        },
        time_estimate: 120,
        tokens_used: {
          prompt_tokens: 25,
          completion_tokens: 35,
          total_tokens: 60,
        },
      };

      mockAiService.processNaturalLanguage.mockResolvedValue(mockAiResponse);

      // Act
      const result = await service.parseTask(request);

      // Assert
      expect(mockAiService.processNaturalLanguage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'parse_task',
          context: expect.objectContaining({
            input: request.text,
            userId: request.userId,
            parseRecurrence: request.parseRecurrence,
          }),
        }),
      );

      expect(result).toMatchObject({
        parsed_task: {
          title: 'Finish project report',
          description: '',
          due_date: '2023-08-25T00:00:00.000Z',
          priority: 'medium',
          estimated_duration_minutes: 120,
        },
        meta: {
          model_version: 'test-model-1.0.0',
          tokens_used: 60,
        },
      });

      expect(result).toHaveProperty('request_id');
      expect(result).toHaveProperty('meta.processing_time_ms');
      expect(result).toHaveProperty('extracted_entities');
    });
  });

  describe('extractEntities', () => {
    it('should extract and enrich entities from text', async () => {
      // Arrange
      const request = {
        text: 'Schedule team meeting for project zenith next week',
        userId: 'test-user-id',
        entityTypes: ['date', 'project', 'tag'],
      };

      const mockAiResponse = {
        analysis: {
          projects: [{ name: 'zenith', confidence: 0.9 }],
          tags: [{ name: 'meeting', confidence: 0.8 }],
          dates: [
            {
              value: '2023-08-30T10:00:00.000Z',
              type: 'start_date',
              confidence: 0.85,
            },
          ],
        },
        tokens_used: {
          prompt_tokens: 20,
          completion_tokens: 30,
          total_tokens: 50,
        },
      };

      mockAiService.processNaturalLanguage.mockResolvedValue(mockAiResponse);

      // Act
      const result = await service.extractEntities(request);

      // Assert
      expect(mockAiService.processNaturalLanguage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'extract_entities',
          context: expect.objectContaining({
            input: request.text,
            userId: request.userId,
            entityTypes: request.entityTypes,
          }),
        }),
      );

      expect(result).toHaveProperty('request_id');
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('model_version', 'test-model-1.0.0');
      expect(result.meta).toHaveProperty('tokens_used', 50);
      expect(result.meta).toHaveProperty(
        'processing_time_ms',
        expect.any(Number),
      );
    });
  });

  describe('understandQuery', () => {
    it('should understand a query and return structured data with suggestions', async () => {
      // Arrange
      const request = {
        text: 'Show me all high priority tasks due this week',
        userId: 'test-user-id',
      };

      const mockAiResponse = {
        analysis: {
          title: 'high priority tasks due this week',
        },
        tokens_used: {
          prompt_tokens: 18,
          completion_tokens: 22,
          total_tokens: 40,
        },
      };

      const mockTasks = [
        { id: 'task-1', title: 'Complete API docs' },
        { id: 'task-2', title: 'Review pull requests' },
      ];

      mockAiService.processNaturalLanguage.mockResolvedValue(mockAiResponse);
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      // Act
      const result = await service.understandQuery(request);

      // Assert
      expect(mockAiService.processNaturalLanguage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'understand_query',
          context: expect.objectContaining({
            input: request.text,
            userId: request.userId,
          }),
        }),
      );

      expect(mockTaskService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'high priority tasks due this week',
          status: 'not_started',
        }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          request_id: expect.any(String),
          understood_query: expect.objectContaining({
            intent: 'find_tasks',
            confidence: 0.8,
            parameters: expect.objectContaining({
              query: 'high priority tasks due this week',
            }),
          }),
          suggested_tasks: expect.arrayContaining([
            expect.objectContaining({
              id: 'task-1',
              title: 'Complete API docs',
              score: 1,
            }),
            expect.objectContaining({
              id: 'task-2',
              title: 'Review pull requests',
              score: 0.9,
            }),
          ]),
          meta: {
            model_version: 'default-1.0.0',
            tokens_used: 40,
            processing_time_ms: expect.any(Number),
          },
          clarification_needed: false,
        }),
      );
    });
  });

  describe('saveFeedback', () => {
    it('should save feedback data correctly', async () => {
      // Arrange
      const userId = 'test-user-id';
      const feedbackData = {
        requestId: 'test-uuid',
        type: 'task_parsing',
        correctedOutput: { title: 'Correct title' },
        feedbackText: 'The title was wrong',
      };

      mockFeedbackRepository.save.mockResolvedValue({
        id: 1,
        userId: userId,
        type: FeedbackType.TASK_PARSING,
        originalInput: { requestId: 'test-uuid' },
        correctedOutput: { title: 'Correct title' },
        feedbackText: 'The title was wrong',
        modelVersion: '1.0.0',
        confidenceScore: 0,
        processingTimeMs: 0,
        systemOutput: { processed: true },
      });

      // Act
      await service.saveFeedback(feedbackData, userId);

      // Assert
      expect(mockFeedbackRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userId,
          type: FeedbackType.TASK_PARSING,
          originalInput: { requestId: 'test-uuid' },
          correctedOutput: { title: 'Correct title' },
          feedbackText: 'The title was wrong',
          modelVersion: '1.0.0',
        }),
      );
    });
  });
});
