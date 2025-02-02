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
} from 'typeorm';
import { Task } from '../tasks/tasks.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  tasksCount?: number;
  completedTasksCount?: number;
  progress?: number;
}
