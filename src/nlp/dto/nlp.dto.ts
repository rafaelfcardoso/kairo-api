import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Base NLP request DTO with common properties
 */
export class BaseNlpRequestDto {
  @ApiProperty({ description: 'Text input to process' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'User ID for context' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional context to improve NLP processing',
    example: { recentProjects: ['Project A', 'Project B'] },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Minimum confidence threshold for returned results',
    minimum: 0,
    maximum: 1,
    default: 0.6,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;
}

/**
 * DTO for task parsing request
 */
export class ParseTaskRequestDto extends BaseNlpRequestDto {
  @ApiPropertyOptional({
    description: 'Whether to process recurrence information',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  parseRecurrence?: boolean;

  @ApiPropertyOptional({
    description: 'Project ID to associate with the task by default',
  })
  @IsOptional()
  @IsString()
  defaultProjectId?: string;
}

/**
 * DTO for entity extraction request
 */
export class ExtractEntitiesRequestDto extends BaseNlpRequestDto {
  @ApiPropertyOptional({
    description: 'Types of entities to extract',
    example: ['date', 'project', 'tag', 'priority'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entityTypes?: string[];
}

/**
 * DTO for query understanding request
 */
export class UnderstandQueryRequestDto extends BaseNlpRequestDto {
  @ApiPropertyOptional({
    description: 'Maximum number of suggestions to return',
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxSuggestions?: number;
}

/**
 * DTO for providing feedback about NLP results
 */
export class NlpFeedbackDto {
  @ApiProperty({
    description: 'The original request ID that this feedback relates to',
  })
  @IsString()
  requestId: string;

  @ApiProperty({
    description: 'The type of NLP processing that was performed',
    enum: [
      'task_parsing',
      'entity_extraction',
      'query_understanding',
      'intent_classification',
    ],
  })
  @IsEnum([
    'task_parsing',
    'entity_extraction',
    'query_understanding',
    'intent_classification',
  ])
  type: string;

  @ApiProperty({
    description: 'The corrected output that should have been produced',
  })
  @IsObject()
  correctedOutput: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Free-text feedback about the processing',
  })
  @IsOptional()
  @IsString()
  feedbackText?: string;

  @ApiPropertyOptional({
    description: 'Flag indicating if the NLP results were useful to the user',
  })
  @IsOptional()
  @IsBoolean()
  wasUseful?: boolean;

  @ApiPropertyOptional({
    description: 'User suggestions for improving the NLP system',
  })
  @IsOptional()
  @IsString()
  improvementSuggestion?: string;
}

// Response DTOs

/**
 * Common metadata about NLP processing
 */
export class NlpMetaDto {
  @ApiProperty({
    description: 'Processing time in milliseconds',
  })
  @IsNumber()
  processing_time_ms: number;

  @ApiProperty({
    description: 'Version of the model used for processing',
  })
  @IsString()
  model_version: string;

  @ApiProperty({
    description: 'Number of tokens used in processing',
  })
  @IsNumber()
  tokens_used: number;
}

/**
 * DTO for entity with confidence score
 */
export class EntityWithConfidenceDto {
  @ApiProperty({
    description: 'Name of the entity',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

/**
 * DTO for date entity with confidence score
 */
export class DateEntityDto {
  @ApiProperty({
    description: 'ISO string value of the date',
  })
  @IsDateString()
  value: string;

  @ApiProperty({
    description: 'Type of date (due_date, start_date, etc.)',
    example: 'due_date',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

/**
 * Alternative task title with confidence
 */
export class AlternativeTitleDto {
  @ApiProperty({
    description: 'Alternative task title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

/**
 * Parsed task information
 */
export class ParsedTaskDto {
  @ApiProperty({
    description: 'Task title',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Task description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Due date in ISO format',
  })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({
    description: 'Task priority',
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({
    description: 'Estimated duration in minutes',
  })
  @IsOptional()
  @IsNumber()
  estimated_duration_minutes?: number;
}

/**
 * Extracted entities from text
 */
export class ExtractedEntitiesDto {
  @ApiPropertyOptional({
    description: 'Detected projects',
    type: [EntityWithConfidenceDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntityWithConfidenceDto)
  projects?: EntityWithConfidenceDto[];

  @ApiPropertyOptional({
    description: 'Detected tags',
    type: [EntityWithConfidenceDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntityWithConfidenceDto)
  tags?: EntityWithConfidenceDto[];

  @ApiPropertyOptional({
    description: 'Detected dates',
    type: [DateEntityDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateEntityDto)
  dates?: DateEntityDto[];
}

/**
 * Response DTO for task parsing
 */
export class TaskParsingResponseDto {
  @ApiProperty({
    description: 'Unique request ID',
    format: 'uuid',
  })
  @IsUUID()
  request_id: string;

  @ApiProperty({
    description: 'Parsed task details',
    type: ParsedTaskDto,
  })
  @ValidateNested()
  @Type(() => ParsedTaskDto)
  parsed_task: ParsedTaskDto;

  @ApiProperty({
    description: 'Extracted entities from the text',
    type: ExtractedEntitiesDto,
  })
  @ValidateNested()
  @Type(() => ExtractedEntitiesDto)
  extracted_entities: ExtractedEntitiesDto;

  @ApiPropertyOptional({
    description: 'Alternative interpretations',
    type: [AlternativeTitleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlternativeTitleDto)
  alternatives?: AlternativeTitleDto[];

  @ApiProperty({
    description: 'Metadata about processing',
    type: NlpMetaDto,
  })
  @ValidateNested()
  @Type(() => NlpMetaDto)
  meta: NlpMetaDto;
}

/**
 * Task suggestion with relevance score
 */
export class TaskSuggestionDto {
  @ApiProperty({
    description: 'Task ID',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Task title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Relevance score (0-1)',
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;
}

/**
 * Understanding of a user query
 */
export class UnderstoodQueryDto {
  @ApiProperty({
    description: 'Detected intent of the query',
    example: 'find_tasks',
  })
  @IsString()
  intent: string;

  @ApiProperty({
    description: 'Confidence in the intent classification',
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({
    description: 'Parameters extracted from the query',
    example: {
      project: 'Zenith',
      time_frame: 'this week',
      priority: 'high',
      sort_by: 'due_date',
    },
  })
  @IsObject()
  parameters: Record<string, any>;
}

/**
 * Response DTO for query understanding
 */
export class QueryUnderstandingResponseDto {
  @ApiProperty({
    description: 'Unique request ID',
    format: 'uuid',
  })
  @IsUUID()
  request_id: string;

  @ApiProperty({
    description: 'Understanding of the query',
    type: UnderstoodQueryDto,
  })
  @ValidateNested()
  @Type(() => UnderstoodQueryDto)
  understood_query: UnderstoodQueryDto;

  @ApiProperty({
    description: 'Whether clarification from the user is needed',
  })
  @IsBoolean()
  clarification_needed: boolean;

  @ApiPropertyOptional({
    description: 'Suggested tasks that match the query',
    type: [TaskSuggestionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskSuggestionDto)
  suggested_tasks?: TaskSuggestionDto[];

  @ApiProperty({
    description: 'Metadata about processing',
    type: NlpMetaDto,
  })
  @ValidateNested()
  @Type(() => NlpMetaDto)
  meta: NlpMetaDto;
}

/**
 * Response DTO for entity extraction
 */
export class EntityExtractionResponseDto {
  @ApiProperty({
    description: 'Unique request ID',
    format: 'uuid',
  })
  @IsUUID()
  request_id: string;

  @ApiProperty({
    description: 'Extracted entities from the text',
    type: ExtractedEntitiesDto,
  })
  @ValidateNested()
  @Type(() => ExtractedEntitiesDto)
  entities: ExtractedEntitiesDto;

  @ApiProperty({
    description: 'Metadata about processing',
    type: NlpMetaDto,
  })
  @ValidateNested()
  @Type(() => NlpMetaDto)
  meta: NlpMetaDto;
}
