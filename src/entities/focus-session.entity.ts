// src/entities/focus-session.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';

export enum EnergyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity()
export class FocusSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @Column({ default: 0 })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: EnergyLevel,
    default: EnergyLevel.MEDIUM,
  })
  energyLevel: EnergyLevel;

  @Column({ default: false })
  wasSuccessful: boolean;

  @Column({ nullable: true })
  notes: string;

  @ManyToMany(() => Task, (task) => task.focusSessions)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;
}
