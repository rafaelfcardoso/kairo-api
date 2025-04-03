import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  JoinTable,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { Project } from './project.entity';

export enum EnergyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity()
export class FocusSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column()
  durationMinutes: number;

  @Column({ type: 'varchar', default: EnergyLevel.MEDIUM })
  energyLevel: EnergyLevel;

  @Column({ default: true })
  wasSuccessful: boolean;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => Task, (task) => task.focusSessions)
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ nullable: true })
  taskId: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
