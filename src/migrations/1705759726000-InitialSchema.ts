import { MigrationInterface, QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';
import { ENUM_TYPES } from '../config/constants';

export class InitialSchema1705759726000 extends BaseMigration {
  name = 'InitialSchema1705759726000';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Directly create enum types (assuming clean DB)
    await queryRunner.query(`
      CREATE TYPE "task_priority_enum" AS ENUM ('low', 'medium', 'high');
    `);
    await queryRunner.query(`
      CREATE TYPE "${ENUM_TYPES.TASK_STATUS}" AS ENUM (
        'todo', 
        'in_progress', 
        'pending', 
        'completed'
      );
    `);
    // Added enum for FocusSession energy level
    await queryRunner.query(`
      CREATE TYPE "focus_session_energylevel_enum" AS ENUM ('low', 'medium', 'high');
    `);

    // Directly create tables (assuming clean DB)
    await queryRunner.query(`
      CREATE TABLE "project" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "isArchived" boolean NOT NULL DEFAULT false,
        "isSystem" boolean NOT NULL DEFAULT false,
        "color" character varying,
        "order" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "parentId" uuid,
        CONSTRAINT "PK_project" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "task" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" character varying,
        "status" "${ENUM_TYPES.TASK_STATUS}" NOT NULL DEFAULT 'todo',
        "priority" "task_priority_enum" NOT NULL DEFAULT 'medium',
        "dueDate" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "estimatedMinutes" integer NOT NULL DEFAULT 0,
        "isArchived" boolean NOT NULL DEFAULT false,
        "projectId" uuid,
        CONSTRAINT "PK_task" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "tag" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "color" character varying,
        "description" character varying,
        "isSystem" boolean NOT NULL DEFAULT false,
        "isArchived" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "order" integer NOT NULL DEFAULT 0,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_tag" PRIMARY KEY ("id")
      );
    `);

    // Create closure table for Project hierarchy
    await queryRunner.query(`
      CREATE TABLE "project_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        CONSTRAINT "PK_project_closure" PRIMARY KEY ("id_ancestor", "id_descendant"),
        CONSTRAINT "FK_project_closure_ancestor" FOREIGN KEY ("id_ancestor") REFERENCES "project"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_closure_descendant" FOREIGN KEY ("id_descendant") REFERENCES "project"("id") ON DELETE CASCADE
      );
    `);

    // Directly add foreign key constraints (assuming tables were created)
    await queryRunner.query(`
      ALTER TABLE "task" 
      ADD CONSTRAINT "FK_task_project" 
      FOREIGN KEY ("projectId") 
      REFERENCES "project"("id") 
      ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "project" 
      ADD CONSTRAINT "FK_project_parent" 
      FOREIGN KEY ("parentId") 
      REFERENCES "project"("id") 
      ON DELETE SET NULL;
    `);
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints first
    await queryRunner.query(
      `ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "FK_task_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT IF EXISTS "FK_project_parent"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "tag"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_closure"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "${ENUM_TYPES.TASK_STATUS}"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_priority_enum"`);
    // REMOVED Drop focus_session_energylevel_enum
  }
}
