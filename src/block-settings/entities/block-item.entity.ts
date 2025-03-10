import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BlockList } from './block-list.entity';
import { AppCategory } from './app-category.entity';

export enum BlockItemType {
  APP = 'app',
  WEBSITE = 'website',
  APP_CATEGORY = 'app_category',
}

@Entity()
export class BlockItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: BlockItemType,
  })
  type: BlockItemType;

  @Column()
  identifier: string; // Bundle ID, domain, or category ID

  @Column({ nullable: true })
  name: string; // User-friendly name

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => BlockList, (blockList) => blockList.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blockListId' })
  blockList: BlockList;

  @Column()
  blockListId: string;

  @ManyToOne(() => AppCategory, (category) => category.blockItems, {
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: AppCategory;

  @Column({ nullable: true })
  categoryId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
