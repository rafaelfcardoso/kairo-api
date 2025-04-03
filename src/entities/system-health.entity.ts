import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('system_health')
export class SystemHealth {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  timestamp: Date;

  @Column()
  status: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  system_load: number;

  @Column()
  memory_used_mb: number;

  @Column()
  memory_total_mb: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  memory_used_percent: number;

  @Column()
  database_connected: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  database_size_mb: number;

  @Column({ nullable: true })
  database_connections: number;

  @Column({ default: 0 })
  service_disruptions: number;

  @Column({ default: 0 })
  recovery_attempts: number;

  @Column({ default: 0 })
  successful_recoveries: number;

  @Column()
  uptime_seconds: number;

  @Column({ type: 'jsonb', nullable: true })
  additional_info: Record<string, any>;
}
