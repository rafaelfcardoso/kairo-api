import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Project } from '../projects/projects.entity';
import { Tag } from '../tags/tags.entity';
import { FocusSession } from '../focus-sessions/focus-sessions.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum TaskPriority {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
}

// Define recurrence patterns for recurring tasks
export enum RecurrencePattern {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

// Define time of day options for recurring tasks
export enum RecurrenceTimeOfDay {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  CUSTOM = 'custom',
}

@Entity()
export class Task {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The unique identifier of the task',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Implement user authentication',
    description: 'The title of the task',
  })
  @Column()
  title: string;

  @ApiProperty({
    example: 'Add JWT authentication with refresh tokens',
    description: 'Detailed description of the task',
    required: false,
  })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({
    enum: TaskStatus,
    example: TaskStatus.NOT_STARTED,
    description: 'Current status of the task',
  })
  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.NOT_STARTED,
  })
  status: TaskStatus;

  @ApiProperty({
    enum: TaskPriority,
    example: TaskPriority.NONE,
    description: 'Priority level of the task',
  })
  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.NONE,
  })
  priority: TaskPriority;

  @ApiProperty({
    example: true,
    description: 'Whether the task needs a reminder',
    default: false,
  })
  @Column({ default: false })
  needsReminder: boolean;

  @ApiProperty({
    example: "Don't forget to call John about the meeting",
    description: 'Custom message to include with the reminder',
    required: false,
  })
  @Column({ nullable: true })
  reminderMessage: string;

  @ApiProperty({
    example: 'FREQ=WEEKLY;BYDAY=SU;BYHOUR=14;BYMINUTE=0',
    description: 'Recurrence rule in iCalendar format for recurring tasks',
    required: false,
  })
  @Column({ nullable: true })
  recurrenceRule: string;

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    description: 'Due date of the task',
    required: false,
  })
  @Column({ nullable: true, type: 'timestamp' })
  dueDate: Date;

  @ApiProperty({
    example: '2025-01-07T23:59:59Z',
    description: 'Next due date for recurring tasks',
    required: false,
  })
  @Column({ nullable: true, type: 'timestamp' })
  nextDueDate: Date;

  @ApiProperty({
    example: false,
    description: 'Whether the task has a specific time set for the due date',
  })
  @Column({ default: false })
  hasTime: boolean;

  // New fields for recurring tasks
  @ApiProperty({
    example: true,
    description: 'Whether this is a recurring task',
    default: false,
  })
  @Column({ default: false })
  isRecurring: boolean;

  @ApiProperty({
    enum: RecurrencePattern,
    example: RecurrencePattern.DAILY,
    description:
      'The pattern for task recurrence (daily, weekly, monthly, yearly)',
    required: false,
  })
  @Column({
    type: 'varchar',
    nullable: true,
  })
  recurrencePattern: string;

  @ApiProperty({
    example: 'monday,wednesday,friday',
    description: 'Specific days for weekly recurrence',
    required: false,
  })
  @Column({ nullable: true })
  recurrenceDays: string;

  @ApiProperty({
    enum: RecurrenceTimeOfDay,
    example: RecurrenceTimeOfDay.MORNING,
    description: 'Time of day for the recurring task',
    required: false,
  })
  @Column({ nullable: true })
  recurrenceTimeOfDay: string;

  @ApiProperty({
    example: '08:00',
    description: 'Specific time for custom recurrence time',
    required: false,
  })
  @Column({ nullable: true })
  recurrenceTime: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the parent recurring task if this is an instance',
    required: false,
  })
  @Column({ nullable: true })
  recurringParentId: string;

  @Column({ default: 0 })
  estimatedMinutes: number;

  @ApiProperty({
    example: false,
    description: 'Whether the task is archived',
  })
  @Column({ default: false })
  isArchived: boolean;

  @ApiProperty({ type: () => Project })
  @ManyToOne(() => Project, (project) => project.tasks)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @ApiProperty({ type: () => [Tag] })
  @ManyToMany(() => Tag, (tag) => tag.tasks)
  @JoinTable()
  tags: Tag[];

  @ManyToMany(() => FocusSession)
  @JoinTable()
  focusSessions: FocusSession[];

  @ApiProperty({
    example: false,
    description: 'Whether the task is completed',
  })
  get isCompleted(): boolean {
    return this.status === TaskStatus.COMPLETED;
  }

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ApiProperty({
    example: '2024-03-15T12:00:00Z',
    description: 'When the task was completed',
    required: false,
  })
  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date;
}
