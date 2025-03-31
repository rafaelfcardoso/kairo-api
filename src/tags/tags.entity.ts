import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Task } from '../tasks/tasks.entity';
import { IsHexColor } from 'class-validator';

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
}
