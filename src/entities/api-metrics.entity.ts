import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Detailed log of individual API requests
 */
@Entity('api_request_log')
export class ApiRequestLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
  requestId: string;

  @Index('IDX_api_request_log_endpoint')
  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column()
  version: string;

  @Index('IDX_api_request_log_statusCode')
  @Column()
  statusCode: number;

  @Column()
  responseTime: number;

  @Index('IDX_api_request_log_userId')
  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  requestBody: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  requestQuery: Record<string, any>;

  @Column({ nullable: true })
  responseSize: number;

  @Column({ nullable: true })
  errorCode: string;

  @Index('IDX_api_request_log_createdAt')
  @CreateDateColumn()
  createdAt: Date;
}

/**
 * Aggregated API metrics for analytics
 */
@Entity('api_metrics')
@Index(
  'IDX_api_metrics_endpoint_method_version_date_hour',
  ['endpoint', 'method', 'version', 'date', 'hour'],
  { unique: true },
)
export class ApiMetrics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column()
  version: string;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  hour: number;

  @Column({ default: 0 })
  requestCount: number;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  errorCount: number;

  @Column({ type: 'real', default: 0 })
  avgResponseTime: number;

  @Column({ type: 'real', nullable: true })
  p95ResponseTime: number;

  @Column({ type: 'real', nullable: true })
  p99ResponseTime: number;

  @Column({ nullable: true })
  minResponseTime: number;

  @Column({ nullable: true })
  maxResponseTime: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
