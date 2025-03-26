import { Injectable, Logger } from '@nestjs/common';
import {
  AiService,
  NaturalLanguageRequest,
  SmartReminderRequest,
  SmartReminderResponse,
  TaskAnalysisResponse,
} from '../../src/common/services/ai.service';

/**
 * MockAiService provides deterministic responses for testing
 * It simulates the AiService for e2e tests without making external API calls
 */
@Injectable()
export class MockAiService {
  private readonly logger = new Logger(MockAiService.name);
  private mockResponses: Map<string, any> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  /**
   * Setup default mock responses for common patterns
   */
  private setupDefaultMocks() {
    // Default response for any input
    this.setMockResponse('default', {
      task_id: 'mock-task-default',
      analysis: {
        title: 'Default mock task',
        description: 'This is a default mock task for testing',
        due_date: null,
        priority: 'medium',
        tags: [],
        has_time: false,
      },
      suggested_priority: 2,
      time_estimate: 30,
      energy_level_recommendation: 'medium',
      tokens_used: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    // Response for task with due date tomorrow
    this.setMockResponse('tomorrow', {
      task_id: 'mock-task-tomorrow',
      analysis: {
        title: 'Task due tomorrow',
        description: 'This task is due tomorrow',
        due_date: this.getTomorrowDate(),
        priority: 'medium',
        tags: [],
        has_time: false,
      },
      suggested_priority: 2,
      time_estimate: 30,
      energy_level_recommendation: 'medium',
      tokens_used: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    // Response for high priority task
    this.setMockResponse('high priority', {
      task_id: 'mock-task-high-priority',
      analysis: {
        title: 'High priority task',
        description: 'This is a high priority task',
        due_date: null,
        priority: 'high',
        tags: [],
        has_time: false,
      },
      suggested_priority: 3,
      time_estimate: 30,
      energy_level_recommendation: 'high',
      tokens_used: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    // Response for task with tag
    this.setMockResponse('tag', {
      task_id: 'mock-task-with-tag',
      analysis: {
        title: 'Task with tag',
        description: 'This task has a tag',
        due_date: null,
        priority: 'medium',
        tags: ['work'],
        has_time: false,
      },
      suggested_priority: 2,
      time_estimate: 30,
      energy_level_recommendation: 'medium',
      tokens_used: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    // Response for task with project
    this.setMockResponse('project', {
      task_id: 'mock-task-with-project',
      analysis: {
        title: 'Task with project',
        description: 'This task belongs to a project',
        due_date: null,
        priority: 'medium',
        tags: [],
        project_id: 'mock-project-id',
        has_time: false,
      },
      suggested_priority: 2,
      time_estimate: 30,
      energy_level_recommendation: 'medium',
      tokens_used: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });
  }

  /**
   * Get tomorrow's date in ISO format with time set to end of day
   */
  private getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    return tomorrow.toISOString();
  }

  /**
   * Set a mock response for a specific keyword
   */
  setMockResponse(keyword: string, response: any): void {
    this.mockResponses.set(keyword.toLowerCase(), response);
  }

  /**
   * Find the most appropriate mock response based on the input
   */
  private findMatchingResponse(input: string): any {
    if (!input) {
      return this.mockResponses.get('default');
    }

    input = input.toLowerCase();

    // Check for each keyword in the mock responses
    for (const [keyword, response] of this.mockResponses.entries()) {
      if (input.includes(keyword)) {
        return response;
      }
    }

    // Default fallback
    return this.mockResponses.get('default');
  }

  /**
   * Implement the processNaturalLanguage method with mock responses
   */
  async processNaturalLanguage(
    request: NaturalLanguageRequest,
  ): Promise<TaskAnalysisResponse> {
    this.logger.log(`Mock AI processing request: ${request.command}`);

    const input = request.context?.input || '';

    // Get the matching response based on input patterns
    const mockResponse = this.findMatchingResponse(input);

    // If there's a project ID in the context, include it in the response
    if (request.context?.projectId && mockResponse.analysis) {
      mockResponse.analysis.project_id = request.context.projectId;
    }

    // If there are tag IDs in the context, update the response
    if (request.context?.tagIds && mockResponse.analysis) {
      mockResponse.analysis.tags = request.context.tagIds;
    }

    // Return a copy to avoid modifying the original template
    return JSON.parse(JSON.stringify(mockResponse));
  }

  /**
   * Implement the getSmartReminder method with mock responses
   */
  async getSmartReminder(
    request: SmartReminderRequest,
  ): Promise<SmartReminderResponse> {
    this.logger.log(`Mock smart reminder for task: ${request.task_id}`);

    return {
      reminder_id: `mock-reminder-${Date.now()}`,
      reminder_text: `Don't forget about your task: ${request.task_title}`,
      tokens_used: 100,
      suggested_delivery_time: new Date().toISOString(),
    };
  }
}
