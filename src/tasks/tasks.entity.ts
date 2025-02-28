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

// Simplify to a single task type - no need for complex types in MVP
export enum TaskType {
  STANDARD = 'standard',
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
    example: 'standard',
    description: 'Type of task (standard)',
    enum: TaskType,
  })
  @Column({
    type: 'enum',
    enum: TaskType,
    default: TaskType.STANDARD,
  })
  taskType: TaskType;

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
  @Column({ nullable: true })
  dueDate: Date;

  @ApiProperty({
    example: '2025-01-07T23:59:59Z',
    description: 'Next due date for recurring tasks',
    required: false,
  })
  @Column({ nullable: true })
  nextDueDate: Date;

  @ApiProperty({
    example: false,
    description: 'Whether the task has a specific time set for the due date',
  })
  @Column({ default: false })
  hasTime: boolean;

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
  @UpdateDateColumn()
  updatedAt: Date;
}
