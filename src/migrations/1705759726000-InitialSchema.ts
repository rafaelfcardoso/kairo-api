import { MigrationInterface, QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';
import { ENUM_TYPES } from '../config/constants';

export class InitialSchema1705759726000 extends BaseMigration {
  name = 'InitialSchema1705759726000';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // First ensure uuid-ossp extension exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enum type if it doesn't exist
    const statusEnumExists = await this.enumExists(
      queryRunner,
      ENUM_TYPES.TASK_STATUS,
    );
    if (!statusEnumExists) {
      await queryRunner.query(`
        CREATE TYPE "${ENUM_TYPES.TASK_STATUS}" AS ENUM (
          'todo', 
          'in_progress', 
          'pending', 
          'completed'
        );
      `);
    }

    // Create initial priority enum
    await queryRunner.query(`
      CREATE TYPE "task_priority_enum" AS ENUM ('low', 'medium', 'high');
    `);

    // Create tables if they don't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" character varying,
        "status" "${ENUM_TYPES.TASK_STATUS}" NOT NULL DEFAULT 'todo',
        "priority" "task_priority_enum" NOT NULL DEFAULT 'medium',
        "dueDate" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "projectId" uuid,
        CONSTRAINT "PK_task" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project" (
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
      CREATE TABLE IF NOT EXISTS "tag" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "color" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tag" PRIMARY KEY ("id")
      );
    `);

    // Add foreign key constraints if they don't exist
    const taskProjectFkExists = await this.constraintExists(
      queryRunner,
      'task',
      'FK_task_project',
    );

    if (!taskProjectFkExists) {
      await queryRunner.query(`
        ALTER TABLE "task" 
        ADD CONSTRAINT "FK_task_project" 
        FOREIGN KEY ("projectId") 
        REFERENCES "project"("id") 
        ON DELETE SET NULL;
      `);
    }

    const projectParentFkExists = await this.constraintExists(
      queryRunner,
      'project',
      'FK_project_parent',
    );

    if (!projectParentFkExists) {
      await queryRunner.query(`
        ALTER TABLE "project" 
        ADD CONSTRAINT "FK_project_parent" 
        FOREIGN KEY ("parentId") 
        REFERENCES "project"("id") 
        ON DELETE SET NULL;
      `);
    }
  }

  protected async executeDown(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "FK_task_project";
      ALTER TABLE "project" DROP CONSTRAINT IF EXISTS "FK_project_parent";
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "tag"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "${ENUM_TYPES.TASK_STATUS}"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_priority_enum"`);
  }
}
