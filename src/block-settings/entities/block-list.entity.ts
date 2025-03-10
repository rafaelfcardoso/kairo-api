import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BlockItem } from './block-item.entity';
import { User } from '../../auth/entities/user.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';

@Entity()
export class BlockList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @OneToMany(() => BlockItem, (blockItem) => blockItem.blockList, {
    cascade: true,
  })
  items: BlockItem[];

  @ManyToMany(() => Schedule)
  @JoinTable({
    name: 'block_list_schedules',
    joinColumn: {
      name: 'blockListId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'scheduleId',
      referencedColumnName: 'id',
    },
  })
  schedules: Schedule[];

  @ManyToOne(() => User, (user) => user.blockLists, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
