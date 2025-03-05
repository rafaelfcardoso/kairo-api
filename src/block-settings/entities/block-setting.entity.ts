import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum BlockType {
  APP = 'app',
  WEBSITE = 'website',
}

@Entity()
export class BlockSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: BlockType,
  })
  type: BlockType;

  @Column()
  identifier: string; // bundle ID for apps, domain for websites

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.blockSettings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
