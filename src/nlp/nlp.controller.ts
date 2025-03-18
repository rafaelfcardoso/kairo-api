import {
  Controller,
  Post,
  Body,
  Get,
  HttpStatus,
  Request,
  Req,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';

import { NlpService } from './nlp.service';
// Import the auth guard from the auth module once available
// TODO: Update this import when the auth guard is implemented
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ParseTaskRequestDto,
  ExtractEntitiesRequestDto,
  UnderstandQueryRequestDto,
  NlpFeedbackDto,
  TaskParsingResponseDto,
  EntityExtractionResponseDto,
  QueryUnderstandingResponseDto,
  NlpMetaDto,
  ExtractedEntitiesDto,
} from './dto/nlp.dto';

@ApiTags('Natural Language Processing')
@ApiExtraModels(NlpMetaDto, ExtractedEntitiesDto)
@Controller('nlp')
export class NlpController {
  private readonly logger = new Logger(NlpController.name);

  constructor(private readonly nlpService: NlpService) {}

  @Post('parse-task')
  // TODO: Add auth guard when available
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Parse natural language into task data',
    description:
      'Extracts task details, dates, priorities, and other entities from natural language input',
  })
  @ApiBody({ type: ParseTaskRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task data successfully extracted',
    type: TaskParsingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async parseTask(
    @Body() parseTaskDto: ParseTaskRequestDto,
    @Req() req: any,
  ): Promise<TaskParsingResponseDto> {
    try {
      // Add user ID from authenticated request
      // For development, we can use a fixed user ID until auth is fully integrated
      parseTaskDto.userId = req.user?.id || 'development-user-id';

      // For debugging - try direct implementation first before calling service
      // This avoids dependencies for initial testing
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug('Using direct controller implementation for testing');

        const input = parseTaskDto.text;
        const requestId = uuidv4();
        const startTime = Date.now();

        // Simple date detection
        let dueDate: string | undefined;
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

        // Simple priority detection
        let priority = 'medium';
        if (
          input.toLowerCase().includes('urgent') ||
          input.toLowerCase().includes('important')
        ) {
          priority = 'high';
        } else if (input.toLowerCase().includes('low priority')) {
          priority = 'low';
        }

        return {
          request_id: requestId,
          parsed_task: {
            title: input,
            description: '',
            due_date: dueDate,
            priority: priority,
            estimated_duration_minutes: 30,
          },
          extracted_entities: {
            projects: [],
            tags: [],
            dates: dueDate
              ? [
                  {
                    value: dueDate,
                    type: 'due_date',
                    confidence: 0.9,
                  },
                ]
              : [],
          },
          alternatives: [],
          meta: {
            processing_time_ms: Date.now() - startTime,
            model_version: '1.0.0-test',
            tokens_used: 0,
          },
        };
      }

      return this.nlpService.parseTask(parseTaskDto);
    } catch (error) {
      this.logger.error(
        `Error in parseTask controller: ${error.message}`,
        error.stack,
      );

      // Return a basic fallback response
      return {
        request_id: uuidv4(),
        parsed_task: {
          title: parseTaskDto.text,
          description: '',
          priority: 'medium',
          estimated_duration_minutes: 30,
        },
        extracted_entities: {
          projects: [],
          tags: [],
          dates: [],
        },
        alternatives: [],
        meta: {
          processing_time_ms: 0,
          model_version: '1.0.0-fallback',
          tokens_used: 0,
        },
      };
    }
  }

  @Post('extract-entities')
  // TODO: Add auth guard when available
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Extract entities from text',
    description:
      'Identifies and extracts entities such as dates, projects, tags, and priorities from text',
  })
  @ApiBody({ type: ExtractEntitiesRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entities successfully extracted',
    type: EntityExtractionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async extractEntities(
    @Body() extractEntitiesDto: ExtractEntitiesRequestDto,
    @Req() req: any,
  ): Promise<EntityExtractionResponseDto> {
    try {
      // Add user ID from authenticated request
      extractEntitiesDto.userId = req.user?.id || 'development-user-id';

      // For debugging - try direct implementation first before calling service
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug('Using direct controller implementation for testing');

        const input = extractEntitiesDto.text;
        const requestId = uuidv4();
        const startTime = Date.now();

        // Simple date detection
        const dates = [];
        if (input.toLowerCase().includes('tomorrow')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dueDate = tomorrow.toISOString().split('T')[0] + 'T23:59:59Z';
          dates.push({
            value: dueDate,
            type: 'due_date',
            confidence: 0.9,
          });
        } else if (input.toLowerCase().includes('next week')) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          const dueDate = nextWeek.toISOString().split('T')[0] + 'T23:59:59Z';
          dates.push({
            value: dueDate,
            type: 'due_date',
            confidence: 0.9,
          });
        } else if (input.toLowerCase().includes('next friday')) {
          const today = new Date();
          const friday = new Date(today);
          friday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7));
          const dueDate = friday.toISOString().split('T')[0] + 'T23:59:59Z';
          dates.push({
            value: dueDate,
            type: 'due_date',
            confidence: 0.9,
          });
        }

        // Simple tag detection
        const tags = [];
        if (input.toLowerCase().includes('work')) {
          tags.push({ name: 'work', confidence: 0.8 });
        }
        if (input.toLowerCase().includes('personal')) {
          tags.push({ name: 'personal', confidence: 0.8 });
        }
        if (input.toLowerCase().includes('meeting')) {
          tags.push({ name: 'meeting', confidence: 0.8 });
        }

        return {
          request_id: requestId,
          entities: {
            projects: [],
            tags: tags,
            dates: dates,
          },
          meta: {
            processing_time_ms: Date.now() - startTime,
            model_version: '1.0.0-test',
            tokens_used: 0,
          },
        };
      }

      return this.nlpService.extractEntities(extractEntitiesDto);
    } catch (error) {
      this.logger.error(
        `Error in extractEntities controller: ${error.message}`,
        error.stack,
      );

      // Return a basic fallback response
      return {
        request_id: uuidv4(),
        entities: {
          projects: [],
          tags: [],
          dates: [],
        },
        meta: {
          processing_time_ms: 0,
          model_version: '1.0.0-fallback',
          tokens_used: 0,
        },
      };
    }
  }

  @Post('understand-query')
  // TODO: Add auth guard when available
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Understand natural language query',
    description:
      'Analyzes a natural language query to determine intent, parameters, and suggested tasks',
  })
  @ApiBody({ type: UnderstandQueryRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Query understood successfully',
    type: QueryUnderstandingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async understandQuery(
    @Body() understandQueryDto: UnderstandQueryRequestDto,
    @Req() req: any,
  ): Promise<QueryUnderstandingResponseDto> {
    try {
      // Add user ID from authenticated request
      understandQueryDto.userId = req.user?.id || 'development-user-id';

      // For debugging - try direct implementation first before calling service
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug('Using direct controller implementation for testing');

        const input = understandQueryDto.text;
        const requestId = uuidv4();
        const startTime = Date.now();

        // Determine intent based on keywords
        let intent = 'unknown';
        let confidence = 0.7;
        const parameters: Record<string, any> = {};

        if (
          input.toLowerCase().includes('find') ||
          input.toLowerCase().includes('search')
        ) {
          intent = 'find_tasks';
          confidence = 0.9;

          // Extract parameters
          if (input.toLowerCase().includes('high priority')) {
            parameters.priority = 'high';
          } else if (input.toLowerCase().includes('medium priority')) {
            parameters.priority = 'medium';
          } else if (input.toLowerCase().includes('low priority')) {
            parameters.priority = 'low';
          }

          if (input.toLowerCase().includes('today')) {
            parameters.time_frame = 'today';
          } else if (input.toLowerCase().includes('this week')) {
            parameters.time_frame = 'this week';
          } else if (input.toLowerCase().includes('next week')) {
            parameters.time_frame = 'next week';
          }
        } else if (
          input.toLowerCase().includes('remind') ||
          input.toLowerCase().includes('notification')
        ) {
          intent = 'set_reminder';
          confidence = 0.85;
        } else if (
          input.toLowerCase().includes('create') ||
          input.toLowerCase().includes('add')
        ) {
          intent = 'create_task';
          confidence = 0.9;
        }

        // Create some mock suggested tasks
        const suggestedTasks = [
          {
            id: 'task-123',
            title: 'Complete API documentation',
            score: 0.89,
          },
          {
            id: 'task-456',
            title: 'Review pull request',
            score: 0.76,
          },
          {
            id: 'task-789',
            title: 'Weekly team meeting',
            score: 0.68,
          },
        ];

        return {
          request_id: requestId,
          understood_query: {
            intent: intent,
            confidence: confidence,
            parameters: parameters,
          },
          clarification_needed: confidence < 0.7,
          suggested_tasks: suggestedTasks.slice(
            0,
            understandQueryDto.maxSuggestions || 5,
          ),
          meta: {
            processing_time_ms: Date.now() - startTime,
            model_version: '1.0.0-test',
            tokens_used: 0,
          },
        };
      }

      return this.nlpService.understandQuery(understandQueryDto);
    } catch (error) {
      this.logger.error(
        `Error in understandQuery controller: ${error.message}`,
        error.stack,
      );

      // Return a basic fallback response
      return {
        request_id: uuidv4(),
        understood_query: {
          intent: 'unknown',
          confidence: 0.5,
          parameters: {},
        },
        clarification_needed: true,
        suggested_tasks: [],
        meta: {
          processing_time_ms: 0,
          model_version: '1.0.0-fallback',
          tokens_used: 0,
        },
      };
    }
  }

  @Post('feedback')
  // TODO: Add auth guard when available
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit feedback about NLP results',
    description:
      'Records user feedback about NLP processing to improve future results',
  })
  @ApiBody({ type: NlpFeedbackDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback recorded successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async submitFeedback(
    @Body() feedbackDto: NlpFeedbackDto,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userId = req.user?.id || 'development-user-id';
      this.logger.debug(
        `Received feedback from user ${userId} for request ${feedbackDto.requestId}`,
      );

      // In development mode, just log the feedback
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`Feedback type: ${feedbackDto.type}`);
        this.logger.debug(
          `Corrected output: ${JSON.stringify(feedbackDto.correctedOutput)}`,
        );
        if (feedbackDto.feedbackText) {
          this.logger.debug(`Feedback text: ${feedbackDto.feedbackText}`);
        }

        return {
          success: true,
          message:
            'Feedback recorded successfully (development mode). Thank you for helping improve our NLP processing!',
        };
      }

      await this.nlpService.saveFeedback(feedbackDto, userId);

      return {
        success: true,
        message:
          'Feedback recorded successfully. Thank you for helping improve our NLP processing!',
      };
    } catch (error) {
      this.logger.error(`Error saving feedback: ${error.message}`, error.stack);

      return {
        success: false,
        message:
          'An error occurred while processing your feedback. Please try again later.',
      };
    }
  }
}
