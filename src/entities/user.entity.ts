import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Project } from '../projects/projects.entity';
import { Task } from '../tasks/tasks.entity';
import { Tag } from '../tags/tags.entity';
import { FocusSession } from '../focus-sessions/focus-sessions.entity';

@Entity('users') // Explicit table name
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index() // Index for faster lookups
  email: string;

  @Column({ nullable: true }) // Nullable for OAuth users
  passwordHash: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ unique: true, nullable: true })
  @Index() // Index for faster lookups
  googleId: string;

  @Column({ unique: true, nullable: true })
  @Index() // Index for faster lookups
  appleId: string;

  // Relationships (will be defined in respective entities)
  @OneToMany(() => Project, (project) => project.user)
  projects: Project[];

  @OneToMany(() => Task, (task) => task.user)
  tasks: Task[];

  @OneToMany(() => Tag, (tag) => tag.user)
  tags: Tag[];

  @OneToMany(() => FocusSession, (session) => session.user)
  focusSessions: FocusSession[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
