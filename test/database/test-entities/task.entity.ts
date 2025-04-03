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
  OneToMany,
} from 'typeorm';
import { Project } from './project.entity';
import { Tag } from './tag.entity';
import { FocusSession } from './focus-session.entity';

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

export enum RecurrencePattern {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum RecurrenceTimeOfDay {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  CUSTOM = 'custom',
}

@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    default: TaskStatus.NOT_STARTED,
  })
  status: TaskStatus;

  @Column({
    type: 'varchar',
    default: TaskPriority.NONE,
  })
  priority: TaskPriority;

  @Column({ default: false })
  needsReminder: boolean;

  @Column({ nullable: true })
  reminderMessage: string;

  @Column({ nullable: true })
  recurrenceRule: string;

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date;

  @Column({ type: 'datetime', nullable: true })
  nextDueDate: Date;

  @Column({ default: false })
  hasTime: boolean;

  @Column({ default: false })
  isRecurring: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  recurrencePattern: string;

  @Column({ nullable: true })
  recurrenceDays: string;

  @Column({ nullable: true })
  recurrenceTimeOfDay: string;

  @Column({ nullable: true })
  recurrenceTime: string;

  @Column({ nullable: true })
  recurringParentId: string;

  @Column({ default: 0 })
  estimatedMinutes: number;

  @Column({ default: false })
  isArchived: boolean;

  @ManyToOne(() => Project, (project) => project.tasks)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ nullable: true })
  projectId: string;

  @ManyToMany(() => Tag, (tag) => tag.tasks)
  @JoinTable({
    name: 'tag_tasks',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @OneToMany(() => FocusSession, (session) => session.task)
  focusSessions: FocusSession[];

  get isCompleted(): boolean {
    return this.status === TaskStatus.COMPLETED;
  }

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
