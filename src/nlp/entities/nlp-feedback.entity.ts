import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

/**
 * Feedback types for NLP processing
 */
export enum FeedbackType {
  TASK_PARSING = 'task_parsing',
  ENTITY_EXTRACTION = 'entity_extraction',
  QUERY_UNDERSTANDING = 'query_understanding',
  INTENT_CLASSIFICATION = 'intent_classification',
}

/**
 * Stores feedback from users about NLP processing results
 * This helps improve the NLP models over time
 */
@Entity('nlp_feedback')
export class NlpFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: FeedbackType,
    default: FeedbackType.TASK_PARSING,
  })
  type: FeedbackType;

  @Column({ type: 'jsonb' })
  originalInput: Record<string, any>;

  @Column({ type: 'jsonb' })
  systemOutput: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  correctedOutput: Record<string, any>;

  @Column({ nullable: true })
  userId: string;

  @Column({ default: false })
  isProcessed: boolean;

  @Column({ nullable: true })
  feedbackText: string;

  @Column({ nullable: true })
  modelVersion: string;

  @Column({ type: 'float', nullable: true })
  confidenceScore: number;

  @Column({ type: 'int', nullable: true })
  processingTimeMs: number;

  @Column({ nullable: true })
  relatedEntityId: string;

  @Column({ nullable: true })
  relatedEntityType: string;

  @Column({
    nullable: true,
    comment: 'Flag indicating if the NLP results were useful to the user',
  })
  wasUseful: boolean;

  @Column({
    nullable: true,
    type: 'text',
    comment: 'User suggestions for improving the NLP system',
  })
  improvementSuggestion: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
