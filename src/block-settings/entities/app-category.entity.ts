import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BlockItem } from './block-item.entity';

@Entity()
export class AppCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  systemId: string; // iOS/system category identifier

  @Column()
  name: string; // e.g., "Social Networking", "Games", "Productivity"

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => BlockItem, (blockItem) => blockItem.category)
  blockItems: BlockItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
