import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../projects/projects.entity';
import { Tag } from '../tags/tags.entity';
import { FocusSession } from '../entities/focus-session.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  COMPLETED = 'completed',
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
    example: TaskStatus.PENDING,
    description: 'Current status of the task',
  })
  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @ApiProperty({
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
    description: 'Priority level of the task',
  })
  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    description: 'Due date of the task',
    required: false,
  })
  @Column({ nullable: true })
  dueDate: Date;

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
  project: Project;

  @ApiProperty({ type: () => [Tag] })
  @ManyToMany(() => Tag, tag => tag.tasks)
  @JoinTable()
  tags: Tag[];

  @ManyToMany(() => FocusSession)
  @JoinTable()
  focusSessions: FocusSession[];

  @Column({ default: false })
  completed: boolean;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
