import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Task } from '../tasks/tasks.entity';
import { IsHexColor, IsOptional, IsBoolean } from 'class-validator';
import { User } from '../entities/user.entity';

@Entity()
export class Tag {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The unique identifier of the tag',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Important',
    description: 'The name of the tag',
  })
  @Column()
  name: string;

  @ApiProperty({
    example: '#FF0000',
    description: 'The color of the tag in hex format',
  })
  @Column({ nullable: true })
  @IsHexColor()
  color: string;

  @ApiProperty({
    example: 'For high-priority items',
    description: 'Optional description of the tag',
  })
  @Column({ nullable: true })
  description: string;

  @ApiPropertyOptional({ description: 'Is this a system tag?' })
  @Column({ default: false })
  @IsBoolean()
  @IsOptional()
  isSystem: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({
    type: () => [Task],
    description: 'Tasks associated with this tag',
  })
  @ManyToMany(() => Task, (task) => task.tags)
  tasks: Task[];

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => User, (user) => user.tags, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  userId: string;
}
