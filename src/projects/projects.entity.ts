// src/entities/project.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Tree,
  TreeParent,
  TreeChildren,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Task } from '../tasks/tasks.entity';
import { IsEnum } from 'class-validator';
import { User } from '../entities/user.entity';

export enum ProjectType {
  INBOX = 'inbox',
  REGULAR = 'regular',
  ARCHIVE = 'archive',
}

@Entity()
@Tree('closure-table') // Using closure table pattern for efficient tree operations
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ default: false })
  isSystem: boolean;

  @Column({
    type: 'enum',
    enum: ProjectType,
    default: ProjectType.REGULAR,
  })
  @IsEnum(ProjectType, { message: 'Invalid project type' })
  type: ProjectType;

  @TreeParent()
  parent: Project;

  @TreeChildren()
  children: Project[];

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @Column({ nullable: true })
  color: string;

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => User, (user) => user.projects, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Computed properties
  tasksCount?: number;
  completedTasksCount?: number;
  progress?: number;

  constructor() {
    this.isArchived = false;
    this.isSystem = false;
    this.type = ProjectType.REGULAR;
    this.order = 0;
  }
}
