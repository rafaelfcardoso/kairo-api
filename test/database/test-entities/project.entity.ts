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
} from 'typeorm';
import { Task } from './task.entity';

export enum ProjectType {
  REGULAR = 'REGULAR',
  SYSTEM = 'SYSTEM',
  TEMPLATE = 'TEMPLATE',
}

@Entity()
@Tree('closure-table')
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

  @ManyToOne(() => Project, (project) => project.children, { nullable: true })
  parent: Project;

  @OneToMany(() => Project, (project) => project.parent)
  children: Project[];

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @Column({ nullable: true })
  color: string;

  @Column({ default: 0 })
  order: number;

  @Column({ type: 'varchar', default: ProjectType.REGULAR })
  type: ProjectType;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  // Computed properties
  taskCount?: number;
  completedTaskCount?: number;
  progress?: number;
}
