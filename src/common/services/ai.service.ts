import { Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

export interface NaturalLanguageRequest {
  command: string;
  context?: Record<string, any>;
}

export interface TaskAnalysisResponse {
  task_id: string;
  analysis: {
    title: string;
    description?: string;
    due_date?: string;
    priority?: string;
    tags?: string[];
    project_id?: string;
    recurrence_rule?: string;
    has_time?: boolean;
    warning?: string;
    is_past_date?: boolean;
  };
  suggested_priority: number;
  time_estimate?: number;
  energy_level_recommendation?: string;
  tags?: string[];
  tokens_used: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface SmartReminderRequest {
  task_id: string;
  task_title: string;
  task_description?: string;
  task_due_date?: string;
  task_priority?: string;
  task_tags?: string[];
  task_project?: string;
  user_timezone?: string;
}

export interface SmartReminderResponse {
  reminder_id: string;
  reminder_text: string;
  tokens_used: number;
  suggested_delivery_time?: string;
}

/**
 * AiService is an infrastructure service that integrates with external AI services
 * to provide natural language processing and smart reminders.
 */
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
      'https://zenith-ai-development.up.railway.app',
    );
  }

  async processNaturalLanguage(
    request: NaturalLanguageRequest,
  ): Promise<TaskAnalysisResponse> {
    try {
      const response: AxiosResponse<TaskAnalysisResponse> =
        await firstValueFrom(
          this.httpService.post(
            `${this.aiBaseUrl}/api/v1/tasks/natural-language`,
            request,
          ),
        );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to process natural language request: ${error.message}`,
        error.stack,
      );

      // Return mock data if in development mode or for testing purposes
      if (this.configService.get<string>('NODE_ENV') !== 'production') {
        this.logger.warn('Using mock NLP data as fallback for development');
        return this.getMockNlpResponse(request);
      }

      throw new HttpException(
        'Failed to process natural language request',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // Helper method to generate mock NLP responses for development
  private getMockNlpResponse(
    request: NaturalLanguageRequest,
  ): TaskAnalysisResponse {
    const input = request.context?.input || '';
    let priority = 'medium';
    let dueDate = '';

    // Simple parsing logic for demonstration
    if (
      input.toLowerCase().includes('urgent') ||
      input.toLowerCase().includes('important')
    ) {
      priority = 'high';
    } else if (input.toLowerCase().includes('low priority')) {
      priority = 'low';
    }

    // Basic date detection
    if (input.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0] + 'T23:59:59Z';
    } else if (input.toLowerCase().includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      dueDate = nextWeek.toISOString().split('T')[0] + 'T23:59:59Z';
    } else if (input.toLowerCase().includes('next friday')) {
      const today = new Date();
      const friday = new Date(today);
      friday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7));
      dueDate = friday.toISOString().split('T')[0] + 'T23:59:59Z';
    }

    return {
      task_id: 'mock-task-' + Date.now(),
      analysis: {
        title: input.length > 50 ? input.substring(0, 47) + '...' : input,
        description: input.length > 50 ? input : undefined,
        due_date: dueDate || undefined,
        priority: priority,
        tags: input.toLowerCase().includes('work')
          ? ['work']
          : input.toLowerCase().includes('personal')
            ? ['personal']
            : [],
        has_time: false,
      },
      suggested_priority:
        priority === 'high' ? 3 : priority === 'medium' ? 2 : 1,
      time_estimate: 30,
      energy_level_recommendation: 'medium',
      tokens_used: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    };
  }

  async getSmartReminder(
    request: SmartReminderRequest,
  ): Promise<SmartReminderResponse> {
    try {
      const response: AxiosResponse<SmartReminderResponse> =
        await firstValueFrom(
          this.httpService.post(
            `${this.aiBaseUrl}/api/v1/tasks/smart-reminder`,
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
        'Failed to generate smart reminder',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
