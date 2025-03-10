import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BlockSetting } from '../../block-settings/entities/block-setting.entity';
import { BlockList } from '../../block-settings/entities/block-list.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @OneToMany(() => BlockSetting, (blockSetting) => blockSetting.user)
  blockSettings: BlockSetting[];

  @OneToMany(() => BlockList, (blockList) => blockList.user)
  blockLists: BlockList[];

  @OneToMany(() => Schedule, (schedule) => schedule.user)
  schedules: Schedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
