import { Test, TestingModule } from '@nestjs/testing';
import {
  AiService,
  NaturalLanguageRequest,
  TaskAnalysisResponse,
} from '../ai.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('AiService', () => {
  let service: AiService;
  let httpService: HttpService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key, defaultValue) => {
        if (key === 'AI_SERVICE_URL') {
          return 'https://test-ai-service.example.com';
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processNaturalLanguage', () => {
    it('should call the external AI service with the correct parameters', async () => {
      // Arrange
      const request: NaturalLanguageRequest = {
        command: 'Create a task to review project proposal by next Friday',
        context: { timezone: 'America/New_York' },
      };

      const mockResponse: TaskAnalysisResponse = {
        task_id: 'mock-task-id',
        analysis: {
          title: 'Review project proposal',
          description: null,
          due_date: '2023-12-31T23:59:59.999Z',
          priority: 'none',
        },
        suggested_priority: 1,
        tokens_used: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };

      const axiosResponse: AxiosResponse = {
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: 'https://test-ai-service.example.com/api/v1/tasks/natural-language',
        } as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(axiosResponse));

      // Act
      const result = await service.processNaturalLanguage(request);

      // Assert
      expect(httpService.post).toHaveBeenCalledWith(
        'https://test-ai-service.example.com/api/v1/tasks/natural-language',
        request,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors from the AI service', async () => {
      // Arrange
      const request: NaturalLanguageRequest = {
        command: 'Create a task to review project proposal by next Friday',
      };

      // Mock the production environment to prevent fallback to mock data
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'NODE_ENV') {
          return 'production';
        }
        if (key === 'AI_SERVICE_URL') {
          return 'https://test-ai-service.example.com';
        }
        return undefined;
      });

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('Service unavailable')));

      // Act & Assert
      await expect(service.processNaturalLanguage(request)).rejects.toThrow(
        new HttpException(
          'Failed to process natural language request',
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });
  });
});
