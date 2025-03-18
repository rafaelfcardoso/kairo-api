import { Test, TestingModule } from '@nestjs/testing';
import { NlpController } from './nlp.controller';
import { NlpService } from './nlp.service';
import {
  ParseTaskRequestDto,
  ExtractEntitiesRequestDto,
  UnderstandQueryRequestDto,
  NlpFeedbackDto,
} from './dto/nlp.dto';

describe('NlpController', () => {
  let controller: NlpController;
  let service: NlpService;

  const mockNlpService = {
    parseTask: jest.fn(),
    extractEntities: jest.fn(),
    understandQuery: jest.fn(),
    saveFeedback: jest.fn(),
  };

  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    // Force production mode to bypass direct implementation in controller
    process.env.NODE_ENV = 'production';

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NlpController],
      providers: [
        {
          provide: NlpService,
          useValue: mockNlpService,
        },
      ],
    }).compile();

    controller = module.get<NlpController>(NlpController);
    service = module.get<NlpService>(NlpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('parseTask', () => {
    it('should call service.parseTask with the correct parameters', async () => {
      const parseTaskDto: ParseTaskRequestDto = {
        text: 'Finish project report by Friday',
        parseRecurrence: true,
      };

      const mockReq = { user: { id: 'test-user-id' } };
      const expectedResponse = {
        request_id: 'test-uuid',
        parsed_task: {
          title: 'Finish project report',
          due_date: '2023-08-25T00:00:00.000Z',
        },
        extracted_entities: {
          dates: [
            {
              value: '2023-08-25T00:00:00.000Z',
              type: 'due_date',
              confidence: 0.9,
            },
          ],
        },
        meta: {
          processing_time_ms: 120,
          model_version: '1.0.0',
          tokens_used: 45,
        },
      };

      // Implement the mock correctly
      mockNlpService.parseTask.mockResolvedValue(expectedResponse);

      const result = await controller.parseTask(parseTaskDto, mockReq);

      expect(mockNlpService.parseTask).toHaveBeenCalledWith({
        ...parseTaskDto,
        userId: 'test-user-id',
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('extractEntities', () => {
    it('should call service.extractEntities with the correct parameters', async () => {
      const extractEntitiesDto: ExtractEntitiesRequestDto = {
        text: 'Discuss project timeline with marketing team next Monday',
        entityTypes: ['date', 'project', 'tag'],
      };

      const mockReq = { user: { id: 'test-user-id' } };
      const expectedResponse = {
        request_id: 'test-uuid',
        entities: {
          projects: [{ name: 'marketing', confidence: 0.85 }],
          dates: [
            {
              value: '2023-08-28T00:00:00.000Z',
              type: 'date',
              confidence: 0.9,
            },
          ],
        },
        meta: {
          processing_time_ms: 95,
          model_version: '1.0.0',
          tokens_used: 38,
        },
      };

      // Implement the mock correctly
      mockNlpService.extractEntities.mockResolvedValue(expectedResponse);

      const result = await controller.extractEntities(
        extractEntitiesDto,
        mockReq,
      );

      expect(mockNlpService.extractEntities).toHaveBeenCalledWith({
        ...extractEntitiesDto,
        userId: 'test-user-id',
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('understandQuery', () => {
    it('should call service.understandQuery with the correct parameters', async () => {
      const understandQueryDto: UnderstandQueryRequestDto = {
        text: 'Show me all high priority tasks due this week',
        maxSuggestions: 3,
      };

      const mockReq = { user: { id: 'test-user-id' } };
      const expectedResponse = {
        request_id: 'test-uuid',
        understood_query: {
          intent: 'find_tasks',
          confidence: 0.95,
          parameters: {
            priority: 'high',
            time_frame: 'this week',
          },
        },
        clarification_needed: false,
        suggested_tasks: [
          { id: 'task-1', title: 'Complete API docs', score: 0.9 },
          { id: 'task-2', title: 'Review pull requests', score: 0.8 },
        ],
        meta: {
          processing_time_ms: 110,
          model_version: '1.0.0',
          tokens_used: 42,
        },
      };

      // Implement the mock correctly
      mockNlpService.understandQuery.mockResolvedValue(expectedResponse);

      const result = await controller.understandQuery(
        understandQueryDto,
        mockReq,
      );

      expect(mockNlpService.understandQuery).toHaveBeenCalledWith({
        ...understandQueryDto,
        userId: 'test-user-id',
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('submitFeedback', () => {
    it('should call service.saveFeedback with the correct parameters', async () => {
      const feedbackDto: NlpFeedbackDto = {
        requestId: 'test-uuid',
        type: 'task_parsing',
        correctedOutput: { title: 'Correct title', due_date: '2023-08-30' },
        feedbackText: 'The due date was misinterpreted',
      };

      const mockReq = { user: { id: 'test-user-id' } };

      // Implement the mock correctly
      mockNlpService.saveFeedback.mockResolvedValue(undefined);

      const result = await controller.submitFeedback(feedbackDto, mockReq);

      expect(mockNlpService.saveFeedback).toHaveBeenCalledWith(
        feedbackDto,
        'test-user-id',
      );
      expect(result).toEqual({
        success: true,
        message:
          'Feedback recorded successfully. Thank you for helping improve our NLP processing!',
      });
    });
  });
});
