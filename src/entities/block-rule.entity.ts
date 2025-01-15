// src/entities/block-rule.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BlockType {
  WEBSITE = 'website',
  APPLICATION = 'application',
}

@Entity()
export class BlockRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: BlockType,
  })
  type: BlockType;

  @Column()
  target: string; // URL or app identifier

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  schedule: {
    days: number[];
    startTime: string;
    endTime: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
