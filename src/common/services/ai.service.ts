import { Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

export interface NaturalLanguageRequest {
  command: string;
  user_context?: Record<string, any>;
}

export interface TaskAnalysisResponse {
  task_id: string;
  parsed_data: {
    title: string;
    description?: string;
    due_date?: string;
    priority?: string;
    tags?: string[];
    project_id?: string;
    recurrence_rule?: string;
    task_type?: string;
  };
  suggested_priority: string;
  tokens_used: number;
}

export interface SmartReminderRequest {
  task_id: string;
  context: Record<string, any>;
}

export interface SmartReminderResponse {
  reminder_text: string;
  suggested_time: string | null;
  tokens_used: number;
}

export interface NewsUpdateResponse {
  title: string;
  summary: string;
  source: string;
  url: string;
  published_date: string;
}

export interface JobListingResponse {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  posted_date: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiBaseUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'https://zenith-ai-development.up.railway.app/api/v1',
    );
  }

  async processNaturalLanguage(
    request: NaturalLanguageRequest,
  ): Promise<TaskAnalysisResponse> {
    try {
      const response: AxiosResponse<TaskAnalysisResponse> =
        await firstValueFrom(
          this.httpService.post(
            `${this.aiBaseUrl}/tasks/natural-language`,
            request,
          ),
        );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to process natural language request: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to process natural language request',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getSmartReminder(
    request: SmartReminderRequest,
  ): Promise<SmartReminderResponse> {
    try {
      const response: AxiosResponse<SmartReminderResponse> =
        await firstValueFrom(
          this.httpService.post(
            `${this.aiBaseUrl}/tasks/smart-reminder`,
            request,
          ),
        );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get smart reminder: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to get smart reminder',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getRelevantNews(
    category: string,
    count: number = 3,
  ): Promise<NewsUpdateResponse[]> {
    // This would normally call an actual news API
    // For now, we'll return mock data
    const mockNews: NewsUpdateResponse[] = [
      {
        title: 'AI Breakthroughs in Natural Language Processing',
        summary:
          'Recent advances in NLP have led to more human-like interactions with AI',
        source: 'Tech Today',
        url: 'https://example.com/ai-news',
        published_date: new Date().toISOString(),
      },
      {
        title: 'The Future of Remote Work',
        summary:
          'Companies are adopting hybrid work models as the new standard',
        source: 'Business Weekly',
        url: 'https://example.com/remote-work',
        published_date: new Date().toISOString(),
      },
      {
        title: 'Climate Change Solutions Making Progress',
        summary:
          'New technologies showing promise in reducing carbon emissions',
        source: 'Environmental Report',
        url: 'https://example.com/climate-news',
        published_date: new Date().toISOString(),
      },
    ];

    return mockNews.slice(0, count);
  }

  async getJobListings(
    keywords: string[],
    count: number = 3,
  ): Promise<JobListingResponse[]> {
    // This would normally call an actual job listings API
    // For now, we'll return mock data
    const mockJobs: JobListingResponse[] = [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Innovations Inc',
        location: 'Remote',
        description:
          'Looking for an experienced engineer to join our team working on cutting-edge AI projects',
        url: 'https://example.com/job1',
        posted_date: new Date().toISOString(),
      },
      {
        title: 'Product Manager',
        company: 'Digital Solutions',
        location: 'New York, NY',
        description: 'Lead product development for our SaaS platform',
        url: 'https://example.com/job2',
        posted_date: new Date().toISOString(),
      },
      {
        title: 'Data Scientist',
        company: 'Analytics Pro',
        location: 'San Francisco, CA',
        description:
          'Build machine learning models to solve complex business problems',
        url: 'https://example.com/job3',
        posted_date: new Date().toISOString(),
      },
    ];

    return mockJobs.slice(0, count);
  }
}
