import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import {
  AiService,
  NaturalLanguageRequest,
  TaskAnalysisResponse,
} from '../common/services/ai.service';
import { TaskService } from '../tasks/tasks.service';
import { ProjectsService } from '../projects/projects.service';
import { TagsService } from '../tags/tags.service';
import { NlpFeedback, FeedbackType } from './entities/nlp-feedback.entity';
import { TaskStatus } from '../tasks/tasks.entity';
import { AbTestingService } from './services/ab-testing.service';
import { NlpModelPerformance } from './entities/model-performance.entity';

import {
  ParseTaskRequestDto,
  ExtractEntitiesRequestDto,
  UnderstandQueryRequestDto,
  NlpFeedbackDto,
  TaskParsingResponseDto,
  EntityExtractionResponseDto,
  QueryUnderstandingResponseDto,
  NlpMetaDto,
} from './dto/nlp.dto';

@Injectable()
export class NlpService {
  private readonly logger = new Logger(NlpService.name);
  private readonly MODEL_VERSION = '1.0.0';

  constructor(
    private readonly aiService: AiService,
    private readonly tasksService: TaskService,
    private readonly projectsService: ProjectsService,
    private readonly tagsService: TagsService,
    private readonly abTestingService: AbTestingService,
    @InjectRepository(NlpFeedback)
    private readonly nlpFeedbackRepository: Repository<NlpFeedback>,
  ) {}

  /**
   * Parse natural language text into structured task data
   */
  async parseTask(
    request: ParseTaskRequestDto,
  ): Promise<TaskParsingResponseDto> {
    const startTime = Date.now();

    // Select model for A/B testing
    const selectedModel = this.abTestingService.selectModel(request.userId);
    const modelId = selectedModel.modelId;
    const modelVersion = selectedModel.modelVersion;

    // Apply any model-specific parameters
    const confidenceThreshold =
      selectedModel.parameters?.confidenceThreshold ||
      request.confidenceThreshold ||
      0.6;

    try {
      // Process with AI service
      const nlRequest: NaturalLanguageRequest = {
        command: 'parse_task',
        context: {
          input: request.text,
          userId: request.userId,
          parseRecurrence: request.parseRecurrence,
          defaultProjectId: request.defaultProjectId,
          confidenceThreshold,
          modelId,
          modelVersion,
          ...request.context,
        },
      };

      this.logger.debug(
        `Processing NLP request for text: "${request.text}" with model ${modelId} v${modelVersion}`,
      );
      const result = await this.aiService.processNaturalLanguage(nlRequest);
      this.logger.debug('NLP processing complete, result received');

      // Extract and enrich entity information
      const extractedEntities = await this.processEntities(
        result.analysis,
        request.userId,
      );

      // Create response with metadata
      const processingTimeMs = Date.now() - startTime;
      const requestId = uuidv4();

      // Calculate average confidence
      let avgConfidence = 0.8; // Default fallback
      let entityCount = 0;

      // Calculate confidence from projects
      if (extractedEntities.projects && extractedEntities.projects.length > 0) {
        avgConfidence += extractedEntities.projects.reduce(
          (sum, p) => sum + p.confidence,
          0,
        );
        entityCount += extractedEntities.projects.length;
      }

      // Calculate confidence from tags
      if (extractedEntities.tags && extractedEntities.tags.length > 0) {
        avgConfidence += extractedEntities.tags.reduce(
          (sum, t) => sum + t.confidence,
          0,
        );
        entityCount += extractedEntities.tags.length;
      }

      // Calculate confidence from dates
      if (extractedEntities.dates && extractedEntities.dates.length > 0) {
        avgConfidence += extractedEntities.dates.reduce(
          (sum, d) => sum + d.confidence,
          0,
        );
        entityCount += extractedEntities.dates.length;
      }

      // Calculate average if we have entities
      if (entityCount > 0) {
        avgConfidence = avgConfidence / (entityCount + 1); // +1 for the initial 0.8 value
      }

      // Record model performance for analytics
      await this.abTestingService.recordModelPerformance({
        modelId,
        modelVersion,
        operationType: 'task_parsing',
        requestId,
        userId: request.userId,
        confidenceScore: avgConfidence,
        processingTimeMs,
        tokenCount: result.tokens_used?.total_tokens || 0,
        requiredClarification: avgConfidence < confidenceThreshold,
      });

      // Generate alternatives if confidence is low
      const alternatives =
        result.analysis.warning || avgConfidence < confidenceThreshold
          ? [
              {
                title: result.analysis.title || request.text,
                confidence: avgConfidence,
              },
            ]
          : [];

      return {
        request_id: requestId,
        parsed_task: {
          title: result.analysis.title || request.text,
          description: result.analysis.description || '',
          due_date: result.analysis.due_date,
          priority: result.analysis.priority || 'medium',
          estimated_duration_minutes: result.time_estimate || 30,
        },
        extracted_entities: extractedEntities,
        alternatives,
        meta: this.createMetadata(
          processingTimeMs,
          result.tokens_used?.total_tokens || 0,
          modelId,
          modelVersion,
        ),
      };
    } catch (error) {
      this.logger.error(`Error parsing task: ${error.message}`, error.stack);

      // Create a fallback response with basic parsing
      const processingTimeMs = Date.now() - startTime;
      const requestId = uuidv4();

      // Record error in performance metrics
      await this.abTestingService.recordModelPerformance({
        modelId,
        modelVersion,
        operationType: 'task_parsing',
        requestId,
        userId: request.userId,
        confidenceScore: 0,
        processingTimeMs,
        tokenCount: 0,
        requiredClarification: true,
        performanceMetrics: { error: error.message },
      });

      return {
        request_id: requestId,
        parsed_task: {
          title: request.text,
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
        meta: this.createMetadata(processingTimeMs, 0, modelId, modelVersion),
      };
    }
  }

  /**
   * Extract entities (projects, tags, dates, etc.) from natural language text
   */
  async extractEntities(
    request: ExtractEntitiesRequestDto,
  ): Promise<EntityExtractionResponseDto> {
    const startTime = Date.now();

    // Select model for A/B testing
    const selectedModel = this.abTestingService.selectModel(request.userId);
    const modelId = selectedModel.modelId;
    const modelVersion = selectedModel.modelVersion;

    // Apply any model-specific parameters
    const confidenceThreshold =
      selectedModel.parameters?.confidenceThreshold ||
      request.confidenceThreshold ||
      0.6;

    try {
      // Process with AI service
      const nlRequest: NaturalLanguageRequest = {
        command: 'extract_entities',
        context: {
          input: request.text,
          userId: request.userId,
          entityTypes: request.entityTypes,
          confidenceThreshold,
          modelId,
          modelVersion,
          ...request.context,
        },
      };

      const result = await this.aiService.processNaturalLanguage(nlRequest);

      // Extract and enrich entity information
      const extractedEntities = await this.processEntities(
        result.analysis,
        request.userId,
      );

      // Create response with metadata
      const processingTimeMs = Date.now() - startTime;
      const requestId = uuidv4();

      // Calculate average confidence for metrics
      let avgConfidence = 0;
      let entityCount = 0;

      // Calculate confidence from all entity types
      Object.keys(extractedEntities).forEach((entityType) => {
        const entities = extractedEntities[entityType];
        if (Array.isArray(entities) && entities.length > 0) {
          entities.forEach((entity) => {
            if (typeof entity.confidence === 'number') {
              avgConfidence += entity.confidence;
              entityCount++;
            }
          });
        }
      });

      // Calculate average if we have entities
      avgConfidence = entityCount > 0 ? avgConfidence / entityCount : 0.7;

      // Record model performance for analytics
      await this.abTestingService.recordModelPerformance({
        modelId,
        modelVersion,
        operationType: 'entity_extraction',
        requestId,
        userId: request.userId,
        confidenceScore: avgConfidence,
        processingTimeMs,
        tokenCount: result.tokens_used?.total_tokens || 0,
      });

      return {
        request_id: requestId,
        entities: extractedEntities,
        meta: this.createMetadata(
          processingTimeMs,
          result.tokens_used?.total_tokens || 0,
          modelId,
          modelVersion,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Error extracting entities: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Understand a natural language query and extract intent and parameters
   */
  async understandQuery(
    request: UnderstandQueryRequestDto,
  ): Promise<QueryUnderstandingResponseDto> {
    const startTime = Date.now();

    try {
      // Process with AI service
      const nlRequest: NaturalLanguageRequest = {
        command: 'understand_query',
        context: {
          input: request.text,
          userId: request.userId,
          maxSuggestions: request.maxSuggestions || 5,
          ...request.context,
        },
      };

      const result = await this.aiService.processNaturalLanguage(nlRequest);

      // Custom handling for tasks - the actual AI service response format may differ
      // This is simplified for this implementation
      let suggestedTasks = [];

      // Use search to find relevant tasks if we have a search term in the analysis
      if (result.analysis && result.analysis.title) {
        try {
          // Using search filter since we don't have direct task IDs
          const tasks = await this.tasksService.getTasks({
            search: result.analysis.title,
            status: TaskStatus.NOT_STARTED,
          });

          // Limit to top 5 results and add confidence scores
          suggestedTasks = tasks.slice(0, 5).map((task, index) => ({
            id: task.id,
            title: task.title,
            score: 1 - index * 0.1, // Simple scoring - first result has highest confidence
          }));
        } catch (error) {
          this.logger.warn(`Error finding suggested tasks: ${error.message}`);
        }
      }

      // Create response with metadata
      const processingTimeMs = Date.now() - startTime;
      const requestId = uuidv4();

      // Extract intent and parameters from analysis
      // These field names are hypothetical and would need to be adjusted based on actual AI response
      const intent =
        typeof result.analysis === 'object' && result.analysis !== null
          ? 'find_tasks' // Default intent
          : 'unknown';

      const parameters =
        typeof result.analysis === 'object' && result.analysis !== null
          ? { query: result.analysis.title, date: result.analysis.due_date }
          : {};

      return {
        request_id: requestId,
        understood_query: {
          intent: intent,
          confidence: 0.8,
          parameters: parameters,
        },
        clarification_needed: false,
        suggested_tasks: suggestedTasks.length > 0 ? suggestedTasks : undefined,
        meta: this.createMetadata(
          processingTimeMs,
          result.tokens_used?.total_tokens || 0,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Error understanding query: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Store feedback about NLP processing results
   */
  async saveFeedback(feedback: NlpFeedbackDto, userId: string): Promise<void> {
    try {
      const feedbackType = this.mapFeedbackType(feedback.type);

      const feedbackEntity = new NlpFeedback();
      feedbackEntity.userId = userId;
      feedbackEntity.type = feedbackType;
      feedbackEntity.originalInput = { requestId: feedback.requestId };
      feedbackEntity.systemOutput = { processed: true }; // Placeholder
      feedbackEntity.correctedOutput = feedback.correctedOutput;
      feedbackEntity.feedbackText = feedback.feedbackText;
      feedbackEntity.wasUseful = feedback.wasUseful;
      feedbackEntity.improvementSuggestion = feedback.improvementSuggestion;
      feedbackEntity.modelVersion = this.MODEL_VERSION;
      feedbackEntity.confidenceScore = 0; // Placeholder
      feedbackEntity.processingTimeMs = 0; // Placeholder

      await this.nlpFeedbackRepository.save(feedbackEntity);

      this.logger.log(
        `Saved feedback for request ${feedback.requestId} from user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error saving feedback: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Map string feedback type to enum
   */
  private mapFeedbackType(type: string): FeedbackType {
    switch (type) {
      case 'task_parsing':
        return FeedbackType.TASK_PARSING;
      case 'entity_extraction':
        return FeedbackType.ENTITY_EXTRACTION;
      case 'query_understanding':
        return FeedbackType.QUERY_UNDERSTANDING;
      case 'intent_classification':
        return FeedbackType.INTENT_CLASSIFICATION;
      default:
        return FeedbackType.TASK_PARSING; // Default
    }
  }

  /**
   * Process and enrich extracted entities with additional information
   */
  private async processEntities(analysis: any, userId: string): Promise<any> {
    try {
      // Basic structure for extracted entities
      const extractedEntities = {
        projects: [],
        tags: [],
        dates: [],
      };

      // If we have a due date, add it to dates
      if (analysis?.due_date) {
        extractedEntities.dates.push({
          value: analysis.due_date,
          type: 'due_date',
          confidence: 0.9,
        });
      }

      // If we have tags in the analysis, add them
      if (Array.isArray(analysis?.tags)) {
        for (const tag of analysis.tags) {
          extractedEntities.tags.push({
            name: tag,
            confidence: 0.8,
          });
        }
      }

      // If we have a project_id, try to get its name
      if (analysis?.project_id) {
        try {
          const project = await this.projectsService.getProjectById(
            analysis.project_id,
          );
          if (project) {
            extractedEntities.projects.push({
              name: project.name,
              confidence: 0.9,
            });
          }
        } catch (error) {
          this.logger.warn(
            `Could not find project with ID: ${analysis.project_id}`,
          );
        }
      }

      return extractedEntities;
    } catch (error) {
      this.logger.error(
        `Error processing entities: ${error.message}`,
        error.stack,
      );
      return {
        projects: [],
        tags: [],
        dates: [],
      };
    }
  }

  /**
   * Create metadata for response
   */
  private createMetadata(
    processingTimeMs: number,
    tokensUsed: number,
    modelId = 'default',
    modelVersion = '1.0.0',
  ): NlpMetaDto {
    return {
      processing_time_ms: processingTimeMs,
      model_version: `${modelId}-${modelVersion}`,
      tokens_used: tokensUsed,
    };
  }
}
