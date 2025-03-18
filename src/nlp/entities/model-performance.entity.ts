import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Stores performance metrics for NLP models to support A/B testing
 */
@Entity('nlp_model_performance')
export class NlpModelPerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  modelId: string;

  @Column()
  modelVersion: string;

  @Column({
    type: 'enum',
    enum: [
      'task_parsing',
      'entity_extraction',
      'query_understanding',
      'intent_classification',
    ],
  })
  operationType: string;

  @Column({ type: 'uuid' })
  @Index()
  requestId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'float' })
  confidenceScore: number;

  @Column({ type: 'int' })
  processingTimeMs: number;

  @Column({ type: 'int', default: 0 })
  tokenCount: number;

  @Column({ type: 'boolean', nullable: true })
  userRatedHelpful: boolean;

  @Column({ type: 'boolean', default: false })
  requiredClarification: boolean;

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @Index()
  createdAt: Date;
}
