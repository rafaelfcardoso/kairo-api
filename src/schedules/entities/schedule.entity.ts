import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { BlockList } from '../../block-settings/entities/block-list.entity';
import { BlockItem } from '../../block-settings/entities/block-item.entity';

@Entity()
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  startHour: number;

  @Column()
  startMinute: number;

  @Column()
  endHour: number;

  @Column()
  endMinute: number;

  @Column('int', { array: true })
  days: number[]; // 1-7, where 1 is Monday, 7 is Sunday

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => User, (user) => user.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToMany(() => BlockList, (blockList) => blockList.schedules)
  @JoinTable({
    name: 'schedule_block_lists',
    joinColumn: {
      name: 'scheduleId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'blockListId',
      referencedColumnName: 'id',
    },
  })
  blockLists: BlockList[];

  @ManyToMany(() => BlockItem)
  @JoinTable({
    name: 'schedule_direct_block_items',
    joinColumn: {
      name: 'scheduleId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'blockItemId',
      referencedColumnName: 'id',
    },
  })
  directBlockItems: BlockItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
