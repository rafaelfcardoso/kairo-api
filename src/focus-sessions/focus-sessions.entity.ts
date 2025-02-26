// src/focus-sessions/focus-sessions.entity.ts
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
import { Task } from '../tasks/tasks.entity';
import { Project } from '../projects/projects.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum EnergyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity()
export class FocusSession {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The unique identifier of the focus session',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: '2023-04-15T14:30:00Z',
    description: 'When the focus session started',
  })
  @Column()
  startTime: Date;

  @ApiProperty({
    example: '2023-04-15T14:55:00Z',
    description: 'When the focus session ended',
    required: false,
  })
  @Column({ nullable: true })
  endTime: Date;

  @ApiProperty({
    example: 25,
    description: 'Duration of the focus session in minutes',
  })
  @Column({ default: 0 })
  durationMinutes: number;

  @ApiProperty({
    enum: EnergyLevel,
    example: EnergyLevel.MEDIUM,
    description: 'Self-reported energy level during the session',
  })
  @Column({
    type: 'enum',
    enum: EnergyLevel,
    default: EnergyLevel.MEDIUM,
  })
  energyLevel: EnergyLevel;

  @ApiProperty({
    example: true,
    description: 'Whether the focus session was successful',
  })
  @Column({ default: false })
  wasSuccessful: boolean;

  @ApiProperty({
    example:
      'Had trouble focusing in the beginning but got in the zone after 10 minutes',
    description: 'Notes about the focus session',
    required: false,
  })
  @Column({ nullable: true })
  notes: string;

  @ApiProperty({ type: () => [Task] })
  @ManyToMany(() => Task, (task) => task.focusSessions)
  @JoinTable()
  tasks: Task[];

  @ApiProperty({ type: () => Project, required: false })
  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'The ID of the project this session is directly associated with (if any)',
    required: false,
  })
  @Column({ nullable: true })
  projectId: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
