import { MigrationInterface, QueryRunner } from 'typeorm';
import { BaseMigration } from './base/BaseMigration';
import { ENUM_TYPES } from '../config/constants';

export class InitialSchema1705759726000 extends BaseMigration {
  name = 'InitialSchema1705759726000';

  protected async executeUp(queryRunner: QueryRunner): Promise<void> {
    // First ensure uuid-ossp extension exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Check if task_priority_enum exists
    const priorityEnumExists = await this.enumExists(
      queryRunner,
      'task_priority_enum',
    );
    if (!priorityEnumExists) {
      await queryRunner.query(`
        CREATE TYPE "task_priority_enum" AS ENUM ('low', 'medium', 'high');
      `);
    }

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

    // Create tables if they don't exist
    const taskTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task'
      );
    `);

    if (!taskTableExists[0].exists) {
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
          "projectId" uuid,
          CONSTRAINT "PK_task" PRIMARY KEY ("id")
        );
      `);
    }

    const projectTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project'
      );
    `);

    if (!projectTableExists[0].exists) {
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
    }

    const tagTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tag'
      );
    `);

    if (!tagTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "tag" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" character varying NOT NULL,
          "color" character varying,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_tag" PRIMARY KEY ("id")
        );
      `);
    }

    // Check for existing constraints
    const taskProjectFkExists = await queryRunner.query(`
      SELECT COUNT(*) 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'task' 
      AND constraint_name = 'FK_task_project';
    `);

    if (taskProjectFkExists[0].count === '0') {
      await queryRunner.query(`
        ALTER TABLE "task" 
        ADD CONSTRAINT "FK_task_project" 
        FOREIGN KEY ("projectId") 
        REFERENCES "project"("id") 
        ON DELETE SET NULL;
      `);
    }

    const projectParentFkExists = await queryRunner.query(`
      SELECT COUNT(*) 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'project' 
      AND constraint_name = 'FK_project_parent';
    `);

    if (projectParentFkExists[0].count === '0') {
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
